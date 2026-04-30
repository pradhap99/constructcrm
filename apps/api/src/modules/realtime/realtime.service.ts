import { Injectable } from '@nestjs/common';
import { CivilIqGateway } from './civiliq.gateway';

/**
 * RealtimeService — Injectable service for other modules to emit events.
 *
 * Other modules import this to broadcast events without importing
 * the gateway directly (preserves module boundaries from ADR-001).
 */
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: CivilIqGateway) {}

  notifyDocumentProcessed(projectId: string, tenantId: string, payload: any) {
    this.gateway.emitDocumentProcessed(projectId, tenantId, payload);
  }

  notifyMaterialEvent(projectId: string, payload: any) {
    this.gateway.emitMaterialEvent(projectId, payload);
  }

  notifyAgentAlert(projectId: string, tenantId: string, payload: any) {
    this.gateway.emitAgentAlert(projectId, tenantId, payload);
  }

  notifyUser(userId: string, payload: any) {
    this.gateway.emitUserNotification(userId, payload);
  }
}
