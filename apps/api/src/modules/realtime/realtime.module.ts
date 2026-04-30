import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CivilIqGateway } from './civiliq.gateway';
import { RealtimeService } from './realtime.service';

/**
 * RealtimeModule — Socket.io gateway for live dashboard updates (ADR-003)
 *
 * Handles:
 * - Document processing status updates
 * - Material delivery confirmations
 * - AI agent alerts (risk, chase escalations)
 * - Approval workflow state changes
 *
 * Uses Redis adapter for multi-instance Socket.io scaling.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [CivilIqGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
