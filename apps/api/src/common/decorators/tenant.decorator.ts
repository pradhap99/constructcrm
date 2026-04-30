import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentTenant() — Extracts the authenticated tenant context from the request.
 *
 * Usage:
 *   @Get('projects')
 *   findAll(@CurrentTenant() tenant: TenantContext) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);

/**
 * @CurrentUser() — Extracts the authenticated user from the request.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  planTier: string;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
}
