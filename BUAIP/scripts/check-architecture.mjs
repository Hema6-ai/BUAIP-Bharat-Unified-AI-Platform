import fs from 'fs';
import path from 'path';

const REQUIRED_FILES = [
  'router/capability_router.ts',
  'router/super_router.ts',
  'llm/llm_client.ts',
  'prompts/master_prompt.ts',
  'prompts/scheme_prompt.ts',
  'prompts/agriculture_prompt.ts',
  'prompts/commerce_prompt.ts',
  'prompts/tourism_prompt.ts',
  'prompts/legal_prompt.ts',
  'prompts/career_prompt.ts',
  'engines/scheme_engine.ts',
  'engines/agriculture_engine.ts',
  'engines/commerce_engine.ts',
  'engines/tourism_engine.ts',
  'engines/legal_engine.ts',
  'engines/career_engine.ts',
  'capabilities/document_ai.ts',
  'capabilities/photo_ai.ts',
  'capabilities/learning_ai.ts',
  'capabilities/voice_ai.ts',
  'capabilities/file_upload_ai.ts',
  'capabilities/normal_chat.ts',
];

const CORE_PATHS = [
  'router',
  'engines',
  'capabilities',
  'app/api/unified-ai/route.ts',
  'app/api/unified-ai-stream/route.ts',
];

const DISALLOWED_BEDROCK_PATTERNS = [
  /callBedrock\s*\(/,
  /streamBedrock\s*\(/,
  /from\s+['\"]@\/app\/lib\/bedrock['\"]/, 
  /from\s+['\"]@\/app\/lib\/bedrockStream['\"]/,
  /from\s+['\"]\.\.\/app\/lib\/bedrock['\"]/, 
  /from\s+['\"]\.\.\/app\/lib\/bedrockStream['\"]/,
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

function walk(dirPath) {
  const out = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(fullPath));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(fullPath);
    }
  }
  return out;
}

function toRelative(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
}

const violations = [];

for (const requiredFile of REQUIRED_FILES) {
  if (!fs.existsSync(path.resolve(process.cwd(), requiredFile))) {
    violations.push(`Missing required architecture file: ${requiredFile}`);
  }
}

for (const target of CORE_PATHS) {
  const absoluteTarget = path.resolve(process.cwd(), target);
  if (!fs.existsSync(absoluteTarget)) {
    continue;
  }

  const files = fs.statSync(absoluteTarget).isDirectory()
    ? walk(absoluteTarget)
    : [absoluteTarget];

  for (const file of files) {
    const relPath = toRelative(file);
    const content = fs.readFileSync(file, 'utf8');

    for (const pattern of DISALLOWED_BEDROCK_PATTERNS) {
      if (pattern.test(content)) {
        violations.push(
          `Bedrock bypass detected in ${relPath}. Use llm/llm_client.ts as the single LLM invocation layer.`
        );
        break;
      }
    }
  }
}

if (violations.length > 0) {
  console.error('[Architecture Check] FAILED');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('[Architecture Check] OK: routers, engines, capabilities, prompts, and LLM layering are intact.');
