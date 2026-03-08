/**
 * Document Processing Pipeline
 * Extracts text from PDF/DOCX/TXT, chunks into sections,
 * runs AI reasoning to generate structured explanations.
 *
 * Uses: pdf-parse, mammoth, AWS Textract (OCR fallback), Bedrock (reasoning)
 */

// pdf-parse and mammoth are loaded dynamically to avoid crashing
// Next.js webpack bundling at module-init time (pdfjs-dist ESM issue).
import { callBedrock } from '@/app/lib/bedrock';
import {
  TextractClient,
  DetectDocumentTextCommand,
} from '@aws-sdk/client-textract';

// ── Textract client for OCR on scanned PDFs / images ──
const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ── Types ──
export interface DocumentChunk {
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
}

export interface DocumentExplanation {
  summary: string;
  sections: Array<{ title: string; explanation: string }>;
  eligibility?: string;
  benefits?: string;
  deadlines?: string;
  applicationProcess?: string;
  requiredDocuments?: string;
  fullExplanation: string;
}

// ── Step 1: Extract text ──

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ text: string; pageCount: number }> {
  const ext = fileName.toLowerCase().split('.').pop() || '';

  // PDF
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const pdfData = await parser.getText();
      await parser.destroy();
      if (pdfData.text && pdfData.text.trim().length > 50) {
        return { text: pdfData.text, pageCount: pdfData.total || 1 };
      }
      // If almost no text → probably a scanned PDF → OCR
      return await ocrWithTextract(buffer);
    } catch {
      return await ocrWithTextract(buffer);
    }
  }

  // DOCX
  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, pageCount: 1 };
  }

  // Plain text
  if (mimeType === 'text/plain' || ext === 'txt') {
    return { text: buffer.toString('utf-8'), pageCount: 1 };
  }

  // Image files → OCR
  if (mimeType.startsWith('image/')) {
    return await ocrWithTextract(buffer);
  }

  // Fallback: try as plain text
  return { text: buffer.toString('utf-8'), pageCount: 1 };
}

async function ocrWithTextract(
  buffer: Buffer,
): Promise<{ text: string; pageCount: number }> {
  const command = new DetectDocumentTextCommand({
    Document: { Bytes: buffer },
  });
  const response = await textractClient.send(command);

  const lines = (response.Blocks || [])
    .filter((b) => b.BlockType === 'LINE')
    .map((b) => b.Text || '')
    .filter(Boolean);

  return { text: lines.join('\n'), pageCount: 1 };
}

// ── Step 2: Chunk into sections ──

export function chunkDocument(
  fullText: string,
  pageCount: number,
): DocumentChunk[] {
  // Try heading-based splitting first
  const headingPatterns = [
    /^#{1,3}\s+(.+)/gm,                     // Markdown headings
    /^([A-Z][A-Z\s]{3,60})$/gm,             // ALL-CAPS headings
    /^\d+\.\s+([A-Z].{3,60})$/gm,           // Numbered headings
    /^(?:Section|Chapter|Part)\s+\d+/gim,    // Section/Chapter markers
    /^(?:ELIGIBILITY|BENEFITS|APPLICATION|REQUIRED|IMPORTANT|INTRODUCTION|OBJECTIVE|SCOPE)/gim,
  ];

  const headingPositions: Array<{ title: string; pos: number }> = [];
  for (const pattern of headingPatterns) {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      headingPositions.push({
        title: (match[1] || match[0]).trim(),
        pos: match.index,
      });
    }
  }

  // Sort by position and deduplicate nearby headings
  headingPositions.sort((a, b) => a.pos - b.pos);
  const dedupedHeadings = headingPositions.filter(
    (h, i) => i === 0 || h.pos - headingPositions[i - 1].pos > 50,
  );

  // If we found headings, split by them
  if (dedupedHeadings.length >= 2) {
    const chunks: DocumentChunk[] = [];
    for (let i = 0; i < dedupedHeadings.length; i++) {
      const start = dedupedHeadings[i].pos;
      const end =
        i + 1 < dedupedHeadings.length
          ? dedupedHeadings[i + 1].pos
          : fullText.length;
      const text = fullText.slice(start, end).trim();
      if (text.length > 20) {
        chunks.push({
          sectionTitle: dedupedHeadings[i].title,
          text,
          pageNumber: Math.ceil(
            ((start / fullText.length) * pageCount) || 1,
          ),
          index: chunks.length,
        });
      }
    }
    if (chunks.length >= 2) return chunks;
  }

  // Fallback: split by paragraphs into ~1500-char chunks
  const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 10);
  const chunks: DocumentChunk[] = [];
  let currentText = '';
  let chunkIdx = 0;

  for (const para of paragraphs) {
    if (currentText.length + para.length > 1500 && currentText.length > 200) {
      chunks.push({
        sectionTitle: `Section ${chunkIdx + 1}`,
        text: currentText.trim(),
        pageNumber: Math.ceil(((chunkIdx + 1) / Math.max(paragraphs.length, 1)) * pageCount) || 1,
        index: chunkIdx,
      });
      chunkIdx++;
      currentText = para;
    } else {
      currentText += '\n\n' + para;
    }
  }

  if (currentText.trim().length > 20) {
    chunks.push({
      sectionTitle: `Section ${chunkIdx + 1}`,
      text: currentText.trim(),
      pageNumber: pageCount,
      index: chunkIdx,
    });
  }

  // If still empty, create one big chunk
  if (chunks.length === 0 && fullText.trim().length > 0) {
    chunks.push({
      sectionTitle: 'Full Document',
      text: fullText.trim(),
      pageNumber: 1,
      index: 0,
    });
  }

  return chunks;
}

// ── Step 3: Generate structured explanation (no user question) ──

export async function generateDocumentExplanation(
  doc: ProcessedDocument,
): Promise<DocumentExplanation> {
  // Truncate to 12 000 chars for Bedrock context (Claude handles ~100k but we want speed)
  const contextText = doc.fullText.slice(0, 12000);

  const systemPrompt = `You are BUAIP Document Explainer — an expert at reading complex government, legal, and policy documents and explaining them in simple language that anyone can understand.

Your job:
- Read the actual document text provided.
- Explain it clearly to someone who may not understand legal or bureaucratic English.
- Be factual — only explain what is IN the document. Never invent information.

Respond in this EXACT structure (use these exact headings):

## 📋 Summary
(2-3 sentence plain-language summary of the entire document)

## 📑 Section-by-Section Explanation
(For each major section of the document, give a brief explanation)

## ✅ Eligibility Rules
(Who qualifies? List clearly. If not applicable, say "Not specified in this document.")

## 💰 Benefits
(What does the person get? List clearly.)

## 📅 Important Deadlines
(Any dates or deadlines mentioned.)

## 📝 Application Process
(Step-by-step how to apply.)

## 📂 Required Documents
(Checklist of documents needed.)

Keep language simple. Use bullet points. Write as if explaining to a first-time reader.`;

  const userPrompt = `Here is the document "${doc.fileName}" (${doc.pageCount} pages, ${doc.chunks.length} sections):

---DOCUMENT TEXT START---
${contextText}
---DOCUMENT TEXT END---

Please explain this document in simple language following the structure described.`;

  const explanation = await callBedrock(
    [{ role: 'user', content: userPrompt }],
    systemPrompt,
    { maxTokens: 3000, temperature: 0.2 },
  );

  return {
    summary: extractSection(explanation, 'Summary') || explanation.slice(0, 300),
    sections: doc.chunks.map((c) => ({ title: c.sectionTitle, explanation: '' })),
    eligibility: extractSection(explanation, 'Eligibility'),
    benefits: extractSection(explanation, 'Benefits'),
    deadlines: extractSection(explanation, 'Deadlines'),
    applicationProcess: extractSection(explanation, 'Application Process'),
    requiredDocuments: extractSection(explanation, 'Required Documents'),
    fullExplanation: explanation,
  };
}

// ── Step 4: Answer a question about the document ──

export async function answerDocumentQuestion(
  doc: ProcessedDocument,
  question: string,
): Promise<string> {
  // Simple relevance: find chunks that share the most words with the question
  const qWords = new Set(
    question.toLowerCase().split(/\W+/).filter((w) => w.length > 2),
  );

  const scored = doc.chunks.map((c) => {
    const cWords = c.text.toLowerCase().split(/\W+/);
    let hits = 0;
    for (const w of cWords) if (qWords.has(w)) hits++;
    return { chunk: c, score: hits };
  });

  scored.sort((a, b) => b.score - a.score);
  const relevantChunks = scored.slice(0, 3).map((s) => s.chunk);

  const context = relevantChunks
    .map(
      (c) =>
        `[${c.sectionTitle} — Page ${c.pageNumber}]\n${c.text.slice(0, 3000)}`,
    )
    .join('\n\n');

  const systemPrompt = `You are BUAIP Document Q&A — answer the user's question based ONLY on the document sections provided. If the answer is not in the document, say so honestly. Never hallucinate or invent information.`;

  const userPrompt = `The user uploaded a document titled "${doc.fileName}".

Here are the most relevant sections:

${context}

User question: "${question}"

Answer based on the document content above.`;

  return await callBedrock(
    [{ role: 'user', content: userPrompt }],
    systemPrompt,
    { maxTokens: 1500, temperature: 0.2 },
  );
}

// ── Utility ──

function extractSection(text: string, heading: string): string | undefined {
  const pattern = new RegExp(
    `##\\s*[^\\n]*${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##|$)`,
    'i',
  );
  const match = text.match(pattern);
  return match ? match[1].trim() : undefined;
}
