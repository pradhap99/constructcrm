import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IntakeAgentService } from '../services/intake-agent.service';

/**
 * ExtractionProcessor — Stage 2: Claude entity extraction
 *
 * Takes OCR output, calls Claude API to extract construction entities,
 * computes confidence scores per entity, and enqueues Stage 3 (mapping).
 */
@Processor('document.extraction', { concurrency: 3 })
export class ExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExtractionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intakeAgent: IntakeAgentService,
    @InjectQueue('document.mapping') private readonly mappingQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ExtractionJobData>) {
    const { documentId, tenantId, parsedJson } = job.data;
    this.logger.log(`Extracting entities for document ${documentId}`);

    await job.updateProgress(10);

    // Get document with template schema
    const document = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      include: { templateSchema: true },
    });

    // Extract the raw text from DocAI output
    const ocrText = parsedJson?.text || JSON.stringify(parsedJson);
    const templateSchema = document.templateSchema?.schema as Record<string, any> || {};

    await job.updateProgress(20);

    // Call Claude for entity extraction
    const entities = await this.intakeAgent.extractEntities(
      ocrText,
      templateSchema,
      'en', // TODO: detect language from document metadata
    );

    await job.updateProgress(80);

    // Compute overall confidence score
    const overallConfidence = entities.length > 0
      ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
      : 0;

    // Save extracted entities
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        extractedEntities: entities as any,
        confidenceScores: {
          overall: overallConfidence,
          entityCount: entities.length,
          highConfidence: entities.filter(e => e.confidence >= 0.9).length,
          mediumConfidence: entities.filter(e => e.confidence >= 0.7 && e.confidence < 0.9).length,
          lowConfidence: entities.filter(e => e.confidence < 0.7).length,
        } as any,
      },
    });

    // Enqueue mapping stage
    await this.mappingQueue.add('map', {
      documentId,
      tenantId,
      entities,
      templateSchemaId: document.templateSchemaId,
    });

    await job.updateProgress(100);
    this.logger.log(`Extraction complete: ${entities.length} entities from document ${documentId}`);
  }
}

interface ExtractionJobData {
  documentId: string;
  tenantId: string;
  parsedJson: Record<string, any>;
}
