import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Register a new tenant (construction firm) and its first owner user.
   */
  async register(dto: RegisterDto) {
    // Check if slug is taken
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.firmSlug },
    });
    if (existing) {
      throw new ConflictException(`Firm slug '${dto.firmSlug}' is already taken`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.firmName,
        slug: dto.firmSlug,
        planTier: 'STARTER',
        users: {
          create: {
            name: dto.name,
            email: dto.email,
            passwordHash,
            role: 'OWNER',
            languagePreference: dto.language || 'en',
          },
        },
      },
      include: { users: true },
    });

    const user = tenant.users[0];
    this.logger.log(`New tenant registered: ${tenant.name} (${tenant.id})`);

    return this.generateTokens(user.id, tenant.id, user.role);
  }

  /**
   * Validate credentials and return tokens.
   */
  async login(dto: LoginDto) {
    // Note: Using serviceRole here (no tenant context yet — we're finding the user)
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: { tenant: true },
    });

    if (!user || !user.tenant.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      ...this.generateTokens(user.id, user.tenantId, user.role),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          planTier: user.tenant.planTier,
        },
      },
    };
  }

  /**
   * Validate a user by ID (used by JwtStrategy).
   */
  async validateUserById(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
      include: { tenant: { select: { id: true, name: true, slug: true, planTier: true, isActive: true } } },
    });

    if (!user || !user.tenant.isActive) return null;
    return user;
  }

  private generateTokens(userId: string, tenantId: string, role: string) {
    const payload = { sub: userId, tenantId, role };
    const accessToken = this.jwt.sign(payload);
    return { accessToken, tokenType: 'Bearer' };
  }
}
