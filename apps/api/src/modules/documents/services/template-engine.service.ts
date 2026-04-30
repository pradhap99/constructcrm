import { Injectable, Logger } from '@nestjs/common';
import { ExtractedEntity } from './intake-agent.service';

/** Unit normalization map for Indian construction */
const UNIT_NORMALIZER: Record<string, string> = {
  cum: 'm³', CUM: 'm³', 'cu.m': 'm³', 'Cu.M': 'm³',
  sqm: 'm²', SqM: 'm²', 'sq.m': 'm²', SQM: 'm²',
  rmt: 'rm', Rmt: 'rm', RMT: 'rm', RM: 'rm',
  nos: 'nos', Nos: 'nos', No: 'nos', NOS: 'nos', Numbers: 'nos',
  mt: 't', MT: 't', 'M.T': 't',
  lm: 'rm', LM: 'rm',
};

@Injectable()
export class TemplateEngineService {
  private readonly logger = new Logger(TemplateEngineService.name);

  /**
   * Maps extracted entities to the company's template schema.
   *
   * For each entity, finds the matching template column by semantic similarity
   * of the item description. Normalizes units. Flags deviations.
   *
   * Returns: { mappedTemplate, deviationReport }
   */
  async mapToTemplate(
    entities: ExtractedEntity[],
    templateSchema: { columns: TemplateColumn[]; sections?: TemplateSection[] },
  ): Promise<{ mappedTemplate: MappedTemplate; deviationReport: Deviation[] }> {
    const deviationReport: Deviation[] = [];
    const rows: MappedRow[] = [];

    for (const entity of entities) {
      const normalizedUnit = this.normalizeUnit(entity.unit);
      const matchedColumn = this.findMatchingColumn(entity, templateSchema.columns);

      // Check for unit mismatch
      if (matchedColumn && normalizedUnit && matchedColumn.unit !== normalizedUnit) {
        // Try to convert, otherwise flag
        const converted = this.convertUnit(entity.quantity, normalizedUnit, matchedColumn.unit);
        if (converted === null) {
          deviationReport.push({
            field: 'unit',
            item: entity.item_description,
            expected: matchedColumn.unit,
            actual: normalizedUnit || entity.unit || 'unknown',
            severity: 'WARNING',
            explanation: `Unit mismatch: template expects ${matchedColumn.unit}, document has ${normalizedUnit}`,
          });
        }
      }

      rows.push({
        item_description: entity.item_description,
        quantity: entity.quantity,
        unit: normalizedUnit || entity.unit,
        rate: entity.rate,
        amount: entity.amount || (entity.quantity && entity.rate ? entity.quantity * entity.rate : null),
        specification: entity.specification,
        zone: entity.zone,
        confidence: entity.confidence,
        templateColumnName: matchedColumn?.name || null,
        flags: entity.confidence < 0.7 ? ['LOW_CONFIDENCE'] : entity.confidence < 0.9 ? ['REVIEW'] : [],
      });
    }

    return {
      mappedTemplate: { rows, totalItems: rows.length },
      deviationReport,
    };
  }

  private normalizeUnit(unit: string | null): string | null {
    if (!unit) return null;
    return UNIT_NORMALIZER[unit] || unit;
  }

  private findMatchingColumn(entity: ExtractedEntity, columns: TemplateColumn[]): TemplateColumn | null {
    // Simple keyword matching — Claude handles the nuanced semantic matching upstream
    const desc = entity.item_description?.toLowerCase() || '';
    return columns.find(col => {
      const keywords = col.keywords || [];
      return keywords.some(kw => desc.includes(kw.toLowerCase()));
    }) || null;
  }

  private convertUnit(quantity: number | null, fromUnit: string, toUnit: string): number | null {
    if (!quantity) return null;
    // Add unit conversion logic as needed
    // e.g., m³ ↔ liters, kg ↔ t, etc.
    return null; // Return null if no conversion available
  }
}

interface TemplateColumn {
  name: string;
  unit: string;
  required: boolean;
  keywords?: string[];
}

interface TemplateSection {
  name: string;
  columns: string[];
}

interface MappedRow {
  item_description: string;
  quantity: number | null;
  unit: string | null;
  rate: number | null;
  amount: number | null;
  specification: string | null;
  zone: string | null;
  confidence: number;
  templateColumnName: string | null;
  flags: string[];
}

interface MappedTemplate {
  rows: MappedRow[];
  totalItems: number;
}

interface Deviation {
  field: string;
  item: string;
  expected: string;
  actual: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  explanation: string;
}
