import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';

/**
 * IntakeAgentService — Claude API integration for entity extraction
 *
 * This is the semantic core of the Intake Agent (ADR-002).
 * Takes structured OCR output from Google DocAI and extracts
 * construction-domain entities, mapped to the company's template schema.
 *
 * Prompt engineering notes:
 * - System prompt includes the TemplateSchema so Claude knows exactly
 *   what fields to look for and what units to normalize to.
 * - Output is strict JSON — Claude is instructed to return a JSON array
 *   of entities with confidence scores per field.
 * - Multilingual: prompt instructs Claude to extract regardless of input language.
 */
@Injectable()
export class IntakeAgentService {
  private readonly logger = new Logger(IntakeAgentService.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: config.get<string>('ANTHROPIC_API_KEY'),
    });
    this.model = config.get<string>('ANTHROPIC_MODEL', 'claude-sonnet-4-6');
  }

  /**
   * Extract construction entities from OCR text using Claude.
   *
   * @param ocrText  — Raw text extracted by Google DocAI
   * @param templateSchema — Company's BOQ template structure
   * @param language — Document language hint (en/hi/ta/te/ar)
   * @returns Extracted entities with confidence scores
   */
  async extractEntities(
    ocrText: string,
    templateSchema: Record<string, any>,
    language: string = 'en',
  ): Promise<ExtractedEntity[]> {
    const systemPrompt = this.buildSystemPrompt(templateSchema, language);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Extract all construction entities from the following document text. Return ONLY valid JSON.\n\n<document>\n${ocrText}\n</document>`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

      // Parse and validate the JSON response
      const raw = content.text.trim();
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in Claude response');

      const entities: ExtractedEntity[] = JSON.parse(jsonMatch[0]);
      this.logger.log(`Extracted ${entities.length} entities from document`);
      return entities;
    } catch (error) {
      this.logger.error('Entity extraction failed', error);
      throw error;
    }
  }

  /**
   * Detect specification discrepancies between extracted values and approved specs.
   * Returns a list of deviations with severity classification.
   */
  async detectDiscrepancies(
    extractedEntities: ExtractedEntity[],
    approvedSpec: string,
  ): Promise<Discrepancy[]> {
    const prompt = `You are a construction specification checker.

Compare the following extracted values against the approved specification.
For each discrepancy found, classify its severity:
- CRITICAL: Safety-critical spec mismatch (e.g., wrong concrete grade, rebar diameter)
- WARNING: Non-critical but significant difference (e.g., different brand, minor quantity variance >5%)
- INFO: Minor difference or ambiguity worth noting

Return ONLY a JSON array of discrepancies. If none found, return [].

<approved_specification>
${approvedSpec}
</approved_specification>

<extracted_values>
${JSON.stringify(extractedEntities, null, 2)}
</extracted_values>`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return [];

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    return JSON.parse(jsonMatch[0]);
  }

  private buildSystemPrompt(templateSchema: Record<string, any>, language: string): string {
    const schemaDescription = templateSchema?.columns
      ?.map((col: any) => `  - ${col.name} (unit: ${col.unit}, required: ${col.required})`)
      .join('\n') || '  - No template schema provided. Extract all construction items found.';

    return `You are a specialized construction document intelligence system for Indian civil construction projects.

Your task is to extract structured data from construction documents that may be written in ${language === 'hi' ? 'Hindi' : language === 'ta' ? 'Tamil' : language === 'te' ? 'Telugu' : language === 'ar' ? 'Arabic' : 'English'} or a mix of English and regional languages.

The target template has the following columns:
${schemaDescription}

For each line item you find, extract:
1. item_description: Full description of the work item
2. quantity: Numeric quantity (normalize to a number, remove commas)
3. unit: Unit of measurement (normalize to standard: m³ not cum/CUM, rm not Rmt/RMT, m² not sqm/SqM)
4. rate: Rate per unit if present
5. amount: Total amount if present
6. specification: Any material specification mentioned (e.g., "M30 grade concrete as per IS:456")
7. zone: Zone, block, or location reference if mentioned
8. confidence: Your confidence in this extraction (0.0 to 1.0)
9. raw_text: The original text fragment you extracted this from

Rules:
- Include ALL line items, even if some fields are missing
- If a field is absent, use null
- Normalize units to SI standards used in Indian construction
- Extract specifications literally — do not paraphrase
- If the document is a measurement book, each recorded measurement is an entity
- Return a JSON array of objects, one per line item

Common Indian construction unit normalizations:
- cum → m³, CUM → m³, cu.m → m³
- sqm → m², SqM → m², sq.m → m²
- Rmt → rm, RMT → rm, rmt → rm
- Nos → nos, No → nos, Numbers → nos
- MT → t, M.T → t (metric tons)
- kg → kg (keep as is)`;
  }
}

export interface ExtractedEntity {
  item_description: string;
  quantity: number | null;
  unit: string | null;
  rate: number | null;
  amount: number | null;
  specification: string | null;
  zone: string | null;
  confidence: number;
  raw_text: string;
}

export interface Discrepancy {
  field: string;
  item_description: string;
  expected: string;
  actual: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  explanation: string;
}
