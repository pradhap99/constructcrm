import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TemplateEngineService } from '../services/template-engine.service';

/**
 * MappingProcessor — Stage 3: Template mapping + discrepancy detection
 *
 * Takes extracted entities, maps them to the company's template columns,
 * normalizes units, and flags any spec discrepancies.
 * Enqueues Stage 4 (Excel export).
 */
@Processor('document.mapping', { concurrency: 2 })
export class MappingProcessor extends WorkerHost {
  private readonly logger = new Logger(MappingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateEngine: TemplateEngineService,
    @InjectQueue('document.export') private readonly exportQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<MappingJobData>) {
    const { documentId, tenantId, entities, templateSchemaId } = job.data;
    this.logger.log(`Mapping ${entities.length} entities for document ${documentId}`);

    let templateSchema: any = null;
    if (templateSchemaId) {
      const schema = await this.prisma.templateSchema.findUnique({
        where: { id: templateSchemaId },
      });
      templateSchema = schema?.schema ?? null;
    }

    await job.updateProgress(20);

    // Map entities to template structure
    const { mappedTemplate, deviationReport } = templateSchema
      ? await this.templateEngine.mapToTemplate(entities, templateSchema as any)
      : { mappedTemplate: { rows: entities }, deviationReport: [] };

    await job.updateProgress(70);

    // Save mapped template and deviation report
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        mappedTemplate: mappedTemplate as any,
        deviationReport: deviationReport as any,
        status: 'MAPPED',
      },
    });

    // Enqueue export
    await this.exportQueue.add('export', {
      documentId,
      tenantId,
      mappedTemplate,
      templateSchemaId,
    });

    await job.updateProgress(100);
  }
}

interface MappingJobData {
  documentId: string;
  tenantId: string;
  entities: any[];
  templateSchemaId: string | null;
}
