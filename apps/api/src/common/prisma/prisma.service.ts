import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — Multi-tenant aware Prisma client
 *
 * Implements the tenant isolation middleware from ADR-004:
 * Every query is automatically scoped to the current tenant via RLS.
 * The tenant_id is injected at the start of each DB session using
 * PostgreSQL's SET app.current_tenant_id.
 *
 * Usage:
 *   const scopedPrisma = this.prisma.forTenant(tenantId);
 *   const projects = await scopedPrisma.project.findMany();
 *   // ^ Automatically filtered by tenant_id via RLS
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Returns a tenant-scoped Prisma client.
   * Sets app.current_tenant_id at the session level so PostgreSQL RLS
   * policies automatically filter all queries to this tenant.
   *
   * IMPORTANT: Always use this method in request handlers.
   * Never use `this.prisma` directly in controllers or services
   * without tenant scoping (only safe for auth lookups and admin tasks).
   */
  forTenant(tenantId: string): PrismaClient {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            // Set tenant context before every query in this transaction
            await (this as any).$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
            return query(args);
          },
        },
      },
    }) as unknown as PrismaClient;
  }

  /**
   * Returns a service-role Prisma client that bypasses RLS.
   * Use ONLY for background jobs, migrations, and cross-tenant admin operations.
   * The connection string must use the civiliq_service role (see rls-policies.sql).
   */
  get serviceRole(): PrismaClient {
    return this; // In production, connect with service role credentials
  }

  /**
   * Health check for readiness probes.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
