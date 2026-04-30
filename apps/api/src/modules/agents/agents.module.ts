import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

/**
 * AgentsModule — All 6 AI agents (ADR-002)
 *
 * Sprint 1: IntakeAgent lives in DocumentsModule (tightly coupled to pipeline)
 * Sprint 3+: ChaseAgent, RiskAgent, ReconciliationAgent implemented here
 * Sprint 4+: ClientIntelligenceAgent, HandoffAgent
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'agent.chase' },
      { name: 'agent.risk' },
    ),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class AgentsModule {}
