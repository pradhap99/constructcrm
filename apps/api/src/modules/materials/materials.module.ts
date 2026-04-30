import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

/** MaterialsModule — Materials registry + reconciliation (Sprints 3-4) */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'agent.reconciliation' }),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class MaterialsModule {}
// Sprint 3: Implement MaterialsController, ReconciliationService, GRN workflow
