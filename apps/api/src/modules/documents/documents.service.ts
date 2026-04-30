import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from './services/storage.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue('document.intake') private readonly intakeQueue: Queue,
  ) {}

  async uploadDocument(
    tenantId: string,
    uploadedById: string,
    projectId: string,
    file: Express.Multer.File,
    type: string,
    templateSchemaId?: string,
  ) {
    // Store original file in S3
    const s3Key = `${tenantId}/documents/${Date.now()}-${file.originalname}`;
    await this.storage.upload(s3Key, file.buffer, file.mimetype);

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        tenantId,
        projectId,
        uploadedById,
        templateSchemaId: templateSchemaId || null,
        name: file.originalname,
        type: (type as any) || 'OTHER',
        status: 'QUEUED',
        originalFileUrl: s3Key,
      },
    });

    // Enqueue intake job
    await this.intakeQueue.add('intake', {
      documentId: document.id,
      tenantId,
      s3Key,
      templateSchemaId: templateSchemaId || null,
    });

    this.logger.log(`Document ${document.id} queued for processing`);
    return document;
  }

  async findAll(tenantId: string, projectId?: string) {
    return this.prisma.forTenant(tenantId).document.findMany({
      where: { tenantId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const doc = await this.prisma.forTenant(tenantId).document.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        templateSchema: { select: { id: true, name: true } },
      },
    });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  async getDownloadUrl(tenantId: string, id: string): Promise<string> {
    const doc = await this.findOne(tenantId, id);
    if (!doc.excelOutputUrl) throw new NotFoundException('Excel output not ready yet');
    return this.storage.presignedDownloadUrl(doc.excelOutputUrl);
  }
}
