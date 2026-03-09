/**
 * Document capability pipeline
 * Input -> Context extraction -> Structured knowledge -> Grounded reasoning -> Human explanation
 */

import { callBedrock } from '@/app/lib/bedrock';
import {
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract';

const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const SECTION_CANONICAL = [
  { name: 'Introduction', keywords: ['introduction', 'overview', 'objective', 'background', 'purpose', 'scope'] },
  { name: 'Eligibility', keywords: ['eligibility', 'who can apply', 'criteria', 'applicant', 'qualified', 'income limit', 'age limit'] },
  { name: 'Benefits', keywords: ['benefit', 'assistance', 'subsidy', 'grant', 'financial support', 'coverage'] },
  { name: 'Application Process', keywords: ['application', 'apply', 'procedure', 'steps', 'submission', 'registration'] },
  { name: 'Required Documents', keywords: ['required documents', 'documents', 'proof', 'certificate', 'id proof', 'attachments'] },
  { name: 'Important Dates', keywords: ['important date', 'deadline', 'last date', 'timeline', 'schedule', 'effective date'] },
  { name: 'Contact and Support', keywords: ['contact', 'helpline', 'support', 'office', 'grievance', 'address'] },
  { name: 'Other Clauses', keywords: ['terms', 'conditions', 'note', 'exception', 'compliance'] },
];

export interface DocumentChunk {
  chunkId: string;
  sectionName: string;
  sectionTitle: string;
  text: string;
  pageNumber: number;
  index: number;
}

export interface ProcessedDocument {
  documentId: string;
  fileName: string;
  fileType: string;
  fullText: string;
  chunks: DocumentChunk[];
  pageCount: number;
  extractedAt: number;
  metadata?: {
    extractionMethod: 'pdf-parse' | 'mammoth' | 'plain-text' | 'tesseract' | 'textract-fallback' | 'mixed';
    usedOcr: boolean;
    warnings: string[];
  };
}

export interface DocumentExplanation {
  summary: string;
  sections: Array<{ title: string; explanation: string; evidenceChunkIds: string[] }>;
  eligibility?: string;
  benefits?: string;
  deadlines?: string;
  applicationProcess?: string;
  requiredDocuments?: string;
  fullExplanation: string;
}

interface TextExtractionResult {
  text: string;
  pageCount: number;
  usedOcr: boolean;
  method: NonNullable<ProcessedDocument['metadata']>['extractionMethod'];
  warnings: string[];
}

interface StructuredExplanationModel {
  summary: string;
  sections: Array<{ sectionName: string; explanation: string; evidenceChunkIds: string[] }>;
  eligibilityRules: string[];
  benefits: string[];
  importantDeadlines: string[];
  applicationSteps: string[];
  requiredDocuments: string[];
  unknowns: string[];
}

interface StructuredAnswerModel {
  answer: string;
  usedChunkIds: string[];
  cannotAnswer: boolean;
  missingInformation?: string;
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<TextExtractionResult> {
  const extension = (fileName.split('.').pop() || '').toLowerCase();
  const warnings: string[] = [];

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    const parsed = await parsePdf(buffer);
    if (parsed.text.length >= 120) {
      return {
        text: parsed.text,
        pageCount: parsed.pageCount,
        usedOcr: false,
        method: 'pdf-parse',
        warnings,
      };
    }

    warnings.push('PDF text layer is minimal. Running OCR for scanned content.');
    const ocr = await ocrScannedDocument(buffer, fileName, mimeType);
    return {
      text: ocr.text,
      pageCount: parsed.pageCount || ocr.pageCount || 1,
      usedOcr: true,
      method: ocr.method,
      warnings: warnings.concat(ocr.warnings),
    };
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  ) {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: normalizeText(result.value),
      pageCount: 1,
      usedOcr: false,
      method: 'mammoth',
      warnings,
    };
  }

  if (mimeType === 'text/plain' || extension === 'txt') {
    return {
      text: normalizeText(buffer.toString('utf8')),
      pageCount: 1,
      usedOcr: false,
      method: 'plain-text',
      warnings,
    };
  }

  if (mimeType.startsWith('image/')) {
    const ocr = await ocrScannedDocument(buffer, fileName, mimeType);
    return {
      text: ocr.text,
      pageCount: ocr.pageCount,
      usedOcr: true,
      method: ocr.method,
      warnings: warnings.concat(ocr.warnings),
    };
  }

  return {
    text: normalizeText(buffer.toString('utf8')),
    pageCount: 1,
    usedOcr: false,
    method: 'plain-text',
    warnings: warnings.concat('Unsupported file type. Parsed as plain text fallback.'),
  };
}

export function chunkDocument(fullText: string, pageCount: number): DocumentChunk[] {
  const normalized = normalizeText(fullText);
  if (!normalized) {
    return [];
  }

  const explicitSections = splitByHeadings(normalized, pageCount);
  if (explicitSections.length > 0) {
    return explicitSections;
  }

  return splitByParagraphBlocks(normalized, pageCount);
}

export async function generateDocumentExplanation(
  doc: ProcessedDocument,
): Promise<DocumentExplanation> {
  const contextBlocks = doc.chunks.slice(0, 18).map((chunk) => ({
    chunkId: chunk.chunkId,
    sectionName: chunk.sectionName,
    sectionTitle: chunk.sectionTitle,
    pageNumber: chunk.pageNumber,
    text: chunk.text.slice(0, 2200),
  }));

  const systemPrompt = `You are a document explainer. Use only the provided chunks.

Rules:
- Ground every claim in provided chunks.
- If information is missing, state "Not specified in document".
- Return valid JSON only.

JSON schema:
{
  "summary": "string",
  "sections": [{"sectionName":"string","explanation":"string","evidenceChunkIds":["chunk-1"]}],
  "eligibilityRules": ["string"],
  "benefits": ["string"],
  "importantDeadlines": ["string"],
  "applicationSteps": ["string"],
  "requiredDocuments": ["string"],
  "unknowns": ["string"]
}`;

  const userPrompt = `Document metadata:
- Name: ${doc.fileName}
- Pages: ${doc.pageCount}
- Chunks: ${doc.chunks.length}

Chunks:
${JSON.stringify(contextBlocks, null, 2)}`;

  const raw = await callBedrock(
    [{ role: 'user', content: userPrompt }],
    systemPrompt,
    { maxTokens: 3200, temperature: 0.1 },
  );

  const structured = parseJsonFromModel<StructuredExplanationModel>(raw) || fallbackStructuredExplanation(doc);
  const fullExplanation = formatDocumentExplanation(structured);

  return {
    summary: structured.summary,
    sections: structured.sections.map((section) => ({
      title: section.sectionName,
      explanation: section.explanation,
      evidenceChunkIds: section.evidenceChunkIds || [],
    })),
    eligibility: toBulletText(structured.eligibilityRules),
    benefits: toBulletText(structured.benefits),
    deadlines: toBulletText(structured.importantDeadlines),
    applicationProcess: toBulletText(structured.applicationSteps),
    requiredDocuments: toBulletText(structured.requiredDocuments),
    fullExplanation,
  };
}

export async function answerDocumentQuestion(
  doc: ProcessedDocument,
  question: string,
): Promise<string> {
  const relevantChunks = retrieveRelevantChunks(question, doc.chunks, 5);
  const chunkRecords = relevantChunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    sectionName: chunk.sectionName,
    sectionTitle: chunk.sectionTitle,
    pageNumber: chunk.pageNumber,
    text: chunk.text.slice(0, 2200),
  }));

  if (chunkRecords.length === 0) {
    return 'I could not find relevant extracted sections for that question in the uploaded document.';
  }

  const systemPrompt = `You answer questions using only the provided document chunks.

Rules:
- Never use outside knowledge.
- If the answer is not found, set cannotAnswer=true.
- Return valid JSON only.

JSON schema:
{
  "answer": "string",
  "usedChunkIds": ["chunk-1"],
  "cannotAnswer": false,
  "missingInformation": "string"
}`;

  const userPrompt = `Question: ${question}

Relevant chunks:
${JSON.stringify(chunkRecords, null, 2)}`;

  const raw = await callBedrock(
    [{ role: 'user', content: userPrompt }],
    systemPrompt,
    { maxTokens: 1600, temperature: 0.05 },
  );

  const structured = parseJsonFromModel<StructuredAnswerModel>(raw);
  if (!structured) {
    return `I could not parse a structured answer. Here are the most relevant extracted sections:\n\n${chunkRecords
      .slice(0, 2)
      .map((chunk) => `[${chunk.sectionTitle} | page ${chunk.pageNumber}]\n${chunk.text.slice(0, 500)}`)
      .join('\n\n')}`;
  }

  if (structured.cannotAnswer) {
    const reason = structured.missingInformation || 'The requested detail is not explicitly stated in the uploaded document.';
    return `The uploaded document does not clearly provide that answer. ${reason}`;
  }

  const evidence = (structured.usedChunkIds || [])
    .map((id) => doc.chunks.find((chunk) => chunk.chunkId === id))
    .filter((chunk): chunk is DocumentChunk => Boolean(chunk))
    .map((chunk) => `- ${chunk.chunkId} (${chunk.sectionTitle}, page ${chunk.pageNumber})`)
    .join('\n');

  const evidenceBlock = evidence ? `\n\nEvidence:\n${evidence}` : '';
  return `${structured.answer}${evidenceBlock}`;
}

async function parsePdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const pdfModule = await import('pdf-parse');
    const parserCtor = (pdfModule as unknown as { PDFParse?: new (args: { data: Buffer }) => { getText: () => Promise<{ text: string; total?: number }>; destroy: () => Promise<void> } }).PDFParse;

    if (parserCtor) {
      const parser = new parserCtor({ data: buffer });
      const output = await parser.getText();
      await parser.destroy();
      return {
        text: normalizeText(output.text),
        pageCount: output.total || 1,
      };
    }

    const parseDefault = (pdfModule as unknown as { default?: (data: Buffer) => Promise<{ text: string; numpages?: number }> }).default;
    if (!parseDefault) {
      return { text: '', pageCount: 1 };
    }

    const output = await parseDefault(buffer);
    return {
      text: normalizeText(output.text),
      pageCount: output.numpages || 1,
    };
  } catch {
    return { text: '', pageCount: 1 };
  }
}

async function ocrScannedDocument(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ text: string; pageCount: number; method: TextExtractionResult['method']; warnings: string[] }> {
  const warnings: string[] = [];
  const tesseract = await ocrWithTesseract(buffer);

  if (tesseract.text.length >= 80) {
    return {
      text: tesseract.text,
      pageCount: 1,
      method: 'tesseract',
      warnings: tesseract.warnings,
    };
  }

  const textract = await ocrWithTextract(buffer);
  if (textract.text.length > tesseract.text.length) {
    warnings.push(...tesseract.warnings, ...textract.warnings);
    return {
      text: textract.text,
      pageCount: textract.pageCount,
      method: 'textract-fallback',
      warnings,
    };
  }

  warnings.push(
    ...tesseract.warnings,
    ...textract.warnings,
    `Low OCR confidence for ${fileName} (${mimeType || 'unknown type'}).`,
  );

  return {
    text: tesseract.text || textract.text,
    pageCount: Math.max(tesseract.pageCount, textract.pageCount, 1),
    method: tesseract.text ? 'tesseract' : 'textract-fallback',
    warnings,
  };
}

async function ocrWithTesseract(buffer: Buffer): Promise<{ text: string; pageCount: number; warnings: string[] }> {
  try {
    const module = await import('tesseract.js');
    const createWorker = (module as unknown as { createWorker: (language: string) => Promise<{ recognize: (img: Buffer) => Promise<{ data: { text: string } }>; terminate: () => Promise<void> }> }).createWorker;
    const worker = await createWorker('eng');
    const result = await worker.recognize(buffer);
    await worker.terminate();

    return {
      text: normalizeText(result.data.text || ''),
      pageCount: 1,
      warnings: [],
    };
  } catch {
    return {
      text: '',
      pageCount: 1,
      warnings: ['Tesseract OCR failed for this file.'],
    };
  }
}

async function ocrWithTextract(buffer: Buffer): Promise<{ text: string; pageCount: number; warnings: string[] }> {
  try {
    const response = await textractClient.send(
      new DetectDocumentTextCommand({
        Document: { Bytes: buffer },
      }),
    );

    const lines = (response.Blocks || [])
      .filter((block) => block.BlockType === 'LINE')
      .map((block) => block.Text || '')
      .filter(Boolean);

    return {
      text: normalizeText(lines.join('\n')),
      pageCount: 1,
      warnings: [],
    };
  } catch {
    return {
      text: '',
      pageCount: 1,
      warnings: ['Textract OCR fallback failed.'],
    };
  }
}

function splitByHeadings(fullText: string, pageCount: number): DocumentChunk[] {
  const lines = fullText.split(/\r?\n/);
  const chunks: DocumentChunk[] = [];

  let currentTitle = 'Introduction';
  let currentStart = 0;
  let currentText: string[] = [];
  let charOffset = 0;

  const flush = () => {
    const text = normalizeText(currentText.join('\n'));
    if (!text || text.length < 80) {
      return;
    }

    const sectionName = classifySectionName(currentTitle, text);
    chunks.push({
      chunkId: `chunk-${chunks.length + 1}`,
      sectionName,
      sectionTitle: currentTitle,
      text,
      pageNumber: estimatePage(currentStart, fullText.length, pageCount),
      index: chunks.length,
    });
  };

  for (const line of lines) {
    const cleanLine = line.trim();
    const isHeading = looksLikeHeading(cleanLine);
    if (isHeading && currentText.length > 0) {
      flush();
      currentText = [];
      currentTitle = cleanHeading(cleanLine);
      currentStart = charOffset;
    } else {
      currentText.push(line);
    }

    charOffset += line.length + 1;
  }

  flush();
  return chunks;
}

function splitByParagraphBlocks(fullText: string, pageCount: number): DocumentChunk[] {
  const paragraphs = fullText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 40);

  const chunks: DocumentChunk[] = [];
  let blockText = '';
  let blockStart = 0;
  let consumed = 0;

  for (const paragraph of paragraphs) {
    if (!blockText) {
      blockStart = consumed;
    }

    if (blockText.length + paragraph.length > 1800 && blockText.length > 250) {
      const sectionName = classifySectionName(`Section ${chunks.length + 1}`, blockText);
      chunks.push({
        chunkId: `chunk-${chunks.length + 1}`,
        sectionName,
        sectionTitle: sectionName,
        text: normalizeText(blockText),
        pageNumber: estimatePage(blockStart, fullText.length, pageCount),
        index: chunks.length,
      });
      blockText = paragraph;
      blockStart = consumed;
    } else {
      blockText = blockText ? `${blockText}\n\n${paragraph}` : paragraph;
    }

    consumed += paragraph.length + 2;
  }

  if (blockText.length > 0) {
    const sectionName = classifySectionName(`Section ${chunks.length + 1}`, blockText);
    chunks.push({
      chunkId: `chunk-${chunks.length + 1}`,
      sectionName,
      sectionTitle: sectionName,
      text: normalizeText(blockText),
      pageNumber: estimatePage(blockStart, fullText.length, pageCount),
      index: chunks.length,
    });
  }

  return chunks;
}

function retrieveRelevantChunks(question: string, chunks: DocumentChunk[], limit: number): DocumentChunk[] {
  const questionTerms = tokenize(question);
  const sectionHint = classifySectionName('Unknown', question);

  const scored = chunks.map((chunk) => {
    const chunkTerms = tokenize(chunk.text);
    const overlap = questionTerms.reduce((count, term) => count + (chunkTerms.includes(term) ? 1 : 0), 0);
    const sectionBonus = chunk.sectionName === sectionHint ? 4 : 0;
    const titleBonus = tokenize(chunk.sectionTitle).some((term) => questionTerms.includes(term)) ? 2 : 0;
    return {
      chunk,
      score: overlap + sectionBonus + titleBonus,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((item) => item.score > 0).slice(0, limit).map((item) => item.chunk);
}

function fallbackStructuredExplanation(doc: ProcessedDocument): StructuredExplanationModel {
  const sections = doc.chunks.slice(0, 8).map((chunk) => ({
    sectionName: chunk.sectionName,
    explanation: chunk.text.slice(0, 280),
    evidenceChunkIds: [chunk.chunkId],
  }));

  return {
    summary: doc.fullText.slice(0, 320) || 'Document text extracted successfully.',
    sections,
    eligibilityRules: collectSectionSnippets(doc, 'Eligibility'),
    benefits: collectSectionSnippets(doc, 'Benefits'),
    importantDeadlines: collectSectionSnippets(doc, 'Important Dates'),
    applicationSteps: collectSectionSnippets(doc, 'Application Process'),
    requiredDocuments: collectSectionSnippets(doc, 'Required Documents'),
    unknowns: [],
  };
}

function collectSectionSnippets(doc: ProcessedDocument, sectionName: string): string[] {
  const matches = doc.chunks.filter((chunk) => chunk.sectionName === sectionName);
  if (matches.length === 0) {
    return ['Not specified in document'];
  }

  return matches.slice(0, 4).map((chunk) => `${chunk.text.slice(0, 220)} [${chunk.chunkId}]`);
}

function formatDocumentExplanation(model: StructuredExplanationModel): string {
  const lines: string[] = [];

  lines.push('1. Plain language summary');
  lines.push(model.summary || 'Not specified in document');
  lines.push('');

  lines.push('2. Section-by-section explanation');
  if (model.sections.length === 0) {
    lines.push('- Not specified in document');
  } else {
    for (const section of model.sections) {
      lines.push(`- ${section.sectionName}: ${section.explanation}`);
      if (section.evidenceChunkIds?.length) {
        lines.push(`  Evidence: ${section.evidenceChunkIds.join(', ')}`);
      }
    }
  }
  lines.push('');

  lines.push('3. Key eligibility rules');
  lines.push(toBulletText(model.eligibilityRules));
  lines.push('');

  lines.push('4. Benefits explained clearly');
  lines.push(toBulletText(model.benefits));
  lines.push('');

  lines.push('5. Important deadlines');
  lines.push(toBulletText(model.importantDeadlines));
  lines.push('');

  lines.push('6. Application process step-by-step');
  lines.push(toOrderedText(model.applicationSteps));
  lines.push('');

  lines.push('7. Required documents checklist');
  lines.push(toChecklistText(model.requiredDocuments));

  if (model.unknowns?.length) {
    lines.push('');
    lines.push('Information not clearly specified in document');
    lines.push(toBulletText(model.unknowns));
  }

  return lines.join('\n');
}

function parseJsonFromModel<T>(text: string): T | null {
  const direct = tryJsonParse<T>(text);
  if (direct) {
    return direct;
  }

  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const parsed = tryJsonParse<T>(fenced[1]);
    if (parsed) {
      return parsed;
    }
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return tryJsonParse<T>(objectMatch[0]);
  }

  return null;
}

function tryJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function classifySectionName(title: string, text: string): string {
  const sample = `${title} ${text.slice(0, 400)}`.toLowerCase();
  let best = 'Other Clauses';
  let bestScore = 0;

  for (const section of SECTION_CANONICAL) {
    const score = section.keywords.reduce((acc, keyword) => acc + (sample.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = section.name;
    }
  }

  return best;
}

function estimatePage(position: number, totalLength: number, pageCount: number): number {
  if (pageCount <= 1 || totalLength <= 0) {
    return 1;
  }
  const ratio = Math.max(0, Math.min(1, position / totalLength));
  return Math.max(1, Math.min(pageCount, Math.ceil(ratio * pageCount)));
}

function looksLikeHeading(line: string): boolean {
  if (!line || line.length < 3 || line.length > 120) {
    return false;
  }

  if (/^(section|chapter|part)\s+\d+/i.test(line)) {
    return true;
  }

  if (/^\d+(?:\.\d+)*\s+/.test(line)) {
    return true;
  }

  if (/^[A-Z0-9\s:()\-/]{5,}$/.test(line)) {
    return true;
  }

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length <= 10 && words.every((word) => word[0] === word[0]?.toUpperCase())) {
    return true;
  }

  return false;
}

function cleanHeading(line: string): string {
  return normalizeText(line.replace(/^[\d.\s-]+/, '').replace(/[:\-]+$/, ''));
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
}

function normalizeText(text: string): string {
  return text
    .replace(/\u0000/g, ' ')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toBulletText(items?: string[]): string {
  if (!items || items.length === 0) {
    return '- Not specified in document';
  }
  return items.map((item) => `- ${item}`).join('\n');
}

function toChecklistText(items?: string[]): string {
  if (!items || items.length === 0) {
    return '- [ ] Not specified in document';
  }
  return items.map((item) => `- [ ] ${item}`).join('\n');
}

function toOrderedText(items?: string[]): string {
  if (!items || items.length === 0) {
    return '1. Not specified in document';
  }
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}
