import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { RedisMock } from './common/redis/redis-mock';

// ─── Domain Modules ────────────────────────────────────────────────────────
import { AuthModule }      from './modules/auth/auth.module';
import { CrmModule }       from './modules/crm/crm.module';
import { ProjectsModule }  from './modules/projects/projects.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { AgentsModule }    from './modules/agents/agents.module';
import { RealtimeModule }  from './modules/realtime/realtime.module';
import { BillingModule }   from './modules/billing/billing.module';

// ─── Shared Infrastructure ────────────────────────────────────────────────
import { PrismaModule }    from './common/prisma/prisma.module';

/**
 * CivilIQ Root Module
 *
 * Architecture: Modular Monolith (ADR-001)
 * Each module boundary is strictly enforced via ESLint boundaries plugin.
 * Cross-module communication ONLY via injected services — never direct imports
 * of repositories or entities across module boundaries.
 */
@Module({
  imports: [
    // ─── Configuration ──────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // ─── Rate Limiting ──────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 20  },  // 20 req/sec
      { name: 'medium', ttl: 10000, limit: 100 },  // 100 req/10sec
      { name: 'long',   ttl: 60000, limit: 300 },  // 300 req/min
    ]),

    // ─── BullMQ (Async Job Queues) ───────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') || '';
        const nodeEnv = config.get<string>('NODE_ENV') || 'development';
        const isTls = redisUrl.startsWith('rediss://');
        const isLocalUrl = !redisUrl || redisUrl === 'redis://localhost:6379';

        // In development with local Redis URL, use the in-memory mock so the
        // API starts cleanly even when no Redis server is running locally.
        // Queue jobs will be no-ops — that's acceptable for UI development.
        if (nodeEnv === 'development' && isLocalUrl) {
          return {
            connection: new RedisMock() as any,
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: { count: 1000 },
              removeOnFail: { count: 5000 },
            },
          };
        }

        let connection: Record<string, any>;
        if (isLocalUrl) {
          // Local Redis — plain connection, no TLS
          connection = {
            host: '127.0.0.1',
            port: 6379,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            lazyConnect: true,
          };
        } else {
          // Cloud Redis (Upstash etc.) — parse URL and add TLS if rediss://
          try {
            const parsed = new URL(redisUrl);
            connection = {
              host: parsed.hostname,
              port: parseInt(parsed.port || (isTls ? '6380' : '6379'), 10),
              password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
              username: parsed.username && parsed.username !== 'default' ? parsed.username : undefined,
              ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
              connectTimeout: 10000,
              lazyConnect: true,
            };
          } catch {
            connection = { url: redisUrl, maxRetriesPerRequest: null, lazyConnect: true };
          }
        }

        return {
          connection,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 },
          },
        };
      },
    }),

    // ─── Shared Infrastructure ───────────────────────────────────────────────
    PrismaModule,

    // ─── Domain Modules (ADR-001 boundaries) ────────────────────────────────
    AuthModule,
    CrmModule,
    ProjectsModule,
    DocumentsModule,
    MaterialsModule,
    AgentsModule,
    RealtimeModule,
    BillingModule,
  ],
})
export class AppModule {}
