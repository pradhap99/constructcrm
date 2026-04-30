import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StorageService } from '../services/storage.service';

/**
 * IntakeProcessor — Stage 1 of the document processing pipeline
 *
 * Responsibilities:
 * 1. Download uploaded file from S3
 * 2. Convert to canonical PDF if needed (Word, image, Excel)
 * 3. Send to Google Document AI for OCR + structure extraction
 * 4. Store parsed JSON result in database
 * 5. Enqueue next stage (extraction)
 *
 * See ADR-002 for full pipeline architecture.
 */
@Processor('document.intake', { concurrency: 2 })
export class IntakeProcessor extends WorkerHost {
  private readonly logger = new Logger(IntakeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue('document.extraction') private readonly extractionQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<IntakeJobData>) {
    const { documentId, tenantId } = job.data;
    this.logger.log(`Processing intake for document ${documentId}`);

    // Update status to PROCESSING
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    try {
      // Step 1: Get document record
      const document = await this.prisma.document.findUniqueOrThrow({
        where: { id: documentId },
      });

      // Step 2: Download from S3
      await job.updateProgress(10);
      const fileBuffer = await this.storage.download(document.originalFileUrl);

      // Step 3: Convert to PDF if needed
      await job.updateProgress(20);
      const { pdfBuffer, canonicalUrl } = await this.convertToCanonicalPdf(
        fileBuffer,
        document.originalFileUrl,
        documentId,
        tenantId,
      );

      // Step 4: Send to Google Document AI
      await job.updateProgress(40);
      const parsedJson = await this.runGoogleDocAI(pdfBuffer);

      // Step 5: Store result and canonical PDF URL
      await job.updateProgress(80);
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'EXTRACTED',
          canonicalPdfUrl: canonicalUrl,
          parsedJson,
        },
      });

      // Step 6: Enqueue extraction stage
      await this.extractionQueue.add('extract', {
        documentId,
        tenantId,
        parsedJson,
      });

      await job.updateProgress(100);
      this.logger.log(`Intake complete for document ${documentId}`);
    } catch (error) {
      this.logger.error(`Intake failed for document ${documentId}`, error);
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  private async convertToCanonicalPdf(
    buffer: Buffer,
    originalUrl: string,
    documentId: string,
    tenantId: string,
  ): Promise<{ pdfBuffer: Buffer; canonicalUrl: string }> {
    // For PDFs: pass through
    // For images: use sharp/jimp to normalize
    // For Word/Excel: would use LibreOffice headless in production
    // Simplified for scaffold — implement conversion per file type
    const canonicalKey = `${tenantId}/documents/${documentId}/canonical.pdf`;
    await this.storage.upload(canonicalKey, buffer, 'application/pdf');
    return { pdfBuffer: buffer, canonicalUrl: canonicalKey };
  }

  private async runGoogleDocAI(pdfBuffer: Buffer): Promise<Record<string, any>> {
    // TODO: Implement Google Document AI Form Parser call
    // Reference ADR-002 for configuration:
    //   project: config.GOOGLE_CLOUD_PROJECT_ID
    //   location: config.GOOGLE_CLOUD_LOCATION
    //   processorId: config.GOOGLE_DOCAI_PROCESSOR_ID
    //
    // Example (requires @google-cloud/documentai package):
    // const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
    // const client = new DocumentProcessorServiceClient();
    // const [result] = await client.processDocument({ ... rawDocument: { content: pdfBuffer } });
    // return result.document;

    this.logger.warn('Google DocAI not yet configured — returning mock structure');
    return {
      text: 'Mock OCR text — configure GOOGLE_DOCAI_PROCESSOR_ID in .env to enable',
      pages: [],
      entities: [],
    };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`);
  }
}

interface IntakeJobData {
  documentId: string;
  tenantId: string;
}
