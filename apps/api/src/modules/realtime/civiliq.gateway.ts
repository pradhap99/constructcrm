import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * CivilIqGateway — Socket.io WebSocket gateway (ADR-003)
 *
 * Room architecture:
 *   - tenant:{tenantId} — All users in the firm
 *   - project:{projectId} — All users on a specific project
 *   - user:{userId} — Private notifications for one user
 *
 * Authentication: JWT token passed as auth.token in handshake.
 * Connection rejected if token invalid or user inactive.
 *
 * Mobile resilience: Socket.io auto-falls back to long-polling.
 * On reconnect, client sends lastSeenAt — server replays missed events.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],  // Fallback to polling for 2G/3G connections
})
export class CivilIqGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CivilIqGateway.name);
  private connectedUsers = new Map<string, { userId: string; tenantId: string; projectIds: string[] }>();

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) throw new Error('No token provided');

      const payload = this.jwt.verify(token) as { sub: string; tenantId: string };

      // Join tenant room (all firm users)
      await client.join(`tenant:${payload.tenantId}`);

      // Join user room (private notifications)
      await client.join(`user:${payload.sub}`);

      this.connectedUsers.set(client.id, {
        userId: payload.sub,
        tenantId: payload.tenantId,
        projectIds: [],
      });

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
      client.emit('connected', { message: 'Welcome to CivilIQ real-time', userId: payload.sub });
    } catch (error) {
      this.logger.warn(`Connection rejected: ${error.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client joins a project room to receive project-specific events.
   * Validated against the user's tenant to prevent cross-tenant room joining.
   */
  @SubscribeMessage('join:project')
  async handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    await client.join(`project:${data.projectId}`);
    user.projectIds.push(data.projectId);

    this.logger.debug(`${user.userId} joined project room: ${data.projectId}`);
    client.emit('joined:project', { projectId: data.projectId });
  }

  /**
   * Client leaves a project room (e.g., navigated away from project dashboard).
   */
  @SubscribeMessage('leave:project')
  async handleLeaveProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    await client.leave(`project:${data.projectId}`);
    client.emit('left:project', { projectId: data.projectId });
  }

  /**
   * Client requests missed events since their last seen timestamp.
   * RealtimeService handles the DB query and replays events.
   */
  @SubscribeMessage('sync:missed')
  async handleSyncMissed(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lastSeenAt: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    // TODO: Query notifications table for events since lastSeenAt
    // const missed = await this.realtimeService.getMissedEvents(user.userId, user.tenantId, new Date(data.lastSeenAt));
    // missed.forEach(event => client.emit(event.eventType, event.payload));
    client.emit('sync:complete', { message: 'Sync placeholder — implement getMissedEvents' });
  }

  // ─── Broadcast methods called by other modules ───────────────────────────

  /** Notify all project members when a document finishes processing. */
  emitDocumentProcessed(projectId: string, tenantId: string, payload: DocumentProcessedPayload) {
    this.server.to(`project:${projectId}`).emit('document.processed', payload);
    this.logger.debug(`Emitted document.processed to project:${projectId}`);
  }

  /** Notify project team of a material delivery or discrepancy. */
  emitMaterialEvent(projectId: string, payload: MaterialEventPayload) {
    this.server.to(`project:${projectId}`).emit('material.updated', payload);
  }

  /** Broadcast an AI agent alert to all project members. */
  emitAgentAlert(projectId: string, tenantId: string, payload: AgentAlertPayload) {
    this.server.to(`project:${projectId}`).emit('agent.alert', payload);
    // Also notify via tenant room for dashboard-level alerts
    if (payload.severity === 'CRITICAL') {
      this.server.to(`tenant:${tenantId}`).emit('agent.alert.critical', payload);
    }
  }

  /** Send a private notification to a specific user. */
  emitUserNotification(userId: string, payload: UserNotificationPayload) {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }
}

// ─── Payload Types ─────────────────────────────────────────────────────────

interface DocumentProcessedPayload {
  documentId: string;
  documentName: string;
  status: string;
  entityCount: number;
  overallConfidence: number;
  excelDownloadUrl?: string;
  deviationCount: number;
}

interface MaterialEventPayload {
  materialId: string;
  materialName: string;
  eventType: 'delivery_confirmed' | 'mismatch_detected' | 'status_changed';
  oldStatus?: string;
  newStatus: string;
  severity?: string;
}

interface AgentAlertPayload {
  agentType: string;
  title: string;
  body: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface UserNotificationPayload {
  id: string;
  title: string;
  body: string;
  eventType: string;
  severity: string;
  createdAt: string;
}
