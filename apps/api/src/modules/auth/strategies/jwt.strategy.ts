import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUserById(payload.sub, payload.tenantId);
    if (!user) throw new UnauthorizedException('Token invalid or user inactive');

    // Attach to request: req.user + req.tenant
    return {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        planTier: user.tenant.planTier,
      },
    };
  }
}
