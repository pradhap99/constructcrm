import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { IntakeProcessor } from './queues/intake.processor';
import { ExtractionProcessor } from './queues/extraction.processor';
import { MappingProcessor } from './queues/mapping.processor';
import { ExportProcessor } from './queues/export.processor';
import { IntakeAgentService } from './services/intake-agent.service';
import { TemplateEngineService } from './services/template-engine.service';
import { StorageService } from './services/storage.service';

/**
 * DocumentsModule — Intake Agent pipeline (ADR-002)
 *
 * Queue flow:
 *   document.intake → document.extraction → document.mapping → document.export
 *
 * Each stage runs in a separate BullMQ processor worker.
 * Users upload a file → get document ID → poll for status via SSE or Socket.io.
 */
@Module({
  imports: [
    MulterModule.register({ limits: { fileSize: 50 * 1024 * 1024 } }),
    BullModule.registerQueue(
      { name: 'document.intake' },
      { name: 'document.extraction' },
      { name: 'document.mapping' },
      { name: 'document.export' },
    ),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    IntakeAgentService,
    TemplateEngineService,
    StorageService,
    // Queue processors
    IntakeProcessor,
    ExtractionProcessor,
    MappingProcessor,
    ExportProcessor,
  ],
  exports: [DocumentsService, StorageService],
})
export class DocumentsModule {}
