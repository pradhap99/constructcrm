import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StorageService } from '../services/storage.service';

/**
 * ExportProcessor — Stage 4: Excel file generation
 *
 * Takes the mapped template object and generates a formatted .xlsx file
 * that mirrors the company's original template structure.
 *
 * Color coding (from ADR-002 confidence system):
 *   - confidence >= 0.9: white background (auto-populated)
 *   - confidence 0.7-0.9: amber background (review recommended)
 *   - confidence < 0.7: red background (manual entry required)
 *
 * Discrepancies are flagged with a red border and comment.
 */
@Processor('document.export', { concurrency: 1 })
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<ExportJobData>) {
    const { documentId, tenantId, mappedTemplate } = job.data;
    this.logger.log(`Generating Excel for document ${documentId}`);

    await job.updateProgress(10);

    const document = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      include: { templateSchema: true },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CivilIQ';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Extracted Data');

    // ─── Header Row ────────────────────────────────────────────────────────
    const columns = document.templateSchema?.schema
      ? (document.templateSchema.schema as any).columns?.map((col: any) => col.name)
      : ['Item Description', 'Quantity', 'Unit', 'Rate', 'Amount', 'Specification', 'Zone'];

    sheet.addRow(['#', ...columns, 'Confidence', 'Status']);

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF2563EB' } } };
    });
    headerRow.height = 25;

    await job.updateProgress(30);

    // ─── Data Rows ─────────────────────────────────────────────────────────
    const rows: any[] = mappedTemplate?.rows || [];
    rows.forEach((row: any, index: number) => {
      const confidence = row.confidence || 0;
      const rowData = [
        index + 1,
        row.item_description || '',
        row.quantity || '',
        row.unit || '',
        row.rate || '',
        row.amount || '',
        row.specification || '',
        row.zone || '',
        `${Math.round(confidence * 100)}%`,
        confidence >= 0.9 ? '✓ Auto' : confidence >= 0.7 ? '⚠ Review' : '✗ Manual',
      ];

      const excelRow = sheet.addRow(rowData);

      // Confidence-based background color
      const bgColor = confidence >= 0.9
        ? 'FFFFFFFF'     // White — high confidence
        : confidence >= 0.7
        ? 'FFFEF9C3'     // Amber — medium confidence
        : 'FFFEE2E2';    // Red — low confidence

      excelRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Auto-fit columns
    sheet.columns.forEach(col => {
      col.width = 20;
    });

    // ─── Legend Sheet ──────────────────────────────────────────────────────
    const legendSheet = workbook.addWorksheet('Legend');
    legendSheet.addRow(['Color', 'Meaning', 'Action Required']);
    [
      ['White background', 'High confidence (≥90%) — auto-populated', 'Spot check only'],
      ['Amber background', 'Medium confidence (70-89%) — review recommended', 'Verify before use'],
      ['Red background', 'Low confidence (<70%) — manual entry required', 'Must verify'],
    ].forEach(row => legendSheet.addRow(row));

    await job.updateProgress(70);

    // ─── Upload to S3 ──────────────────────────────────────────────────────
    const excelBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const s3Key = `${tenantId}/documents/${documentId}/output.xlsx`;
    await this.storage.upload(s3Key, excelBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // ─── Update document record ────────────────────────────────────────────
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        excelOutputUrl: s3Key,
        status: 'COMPLETED',
      },
    });

    await job.updateProgress(100);
    this.logger.log(`Excel generated and saved for document ${documentId}: ${s3Key}`);

    // TODO: Emit Socket.io event via RealtimeModule to notify connected users
    // this.eventEmitter.emit('document.completed', { documentId, tenantId, excelUrl: s3Key });
  }
}

interface ExportJobData {
  documentId: string;
  tenantId: string;
  mappedTemplate: Record<string, any>;
  templateSchemaId: string | null;
}
