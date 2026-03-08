/**
 * Auto-generate translation dictionary files
 * Usage: tsx scripts/generateTranslations.ts <language-code>
 */

import { translations } from "../app/i18n";
import { translateWithCache } from "../app/lib/aws/translationCache";
import * as fs from "fs";
import * as path from "path";

// Language names for the export comment
const languageNames: Record<string, string> = {
  bn: "Bengali / বাংলা",
  mr: "Marathi / मराठी",
  gu: "Gujarati / ગુજરાતી",
  kn: "Kannada / ಕನ್ನಡ",
  ml: "Malayalam / മലയാളം",
  pa: "Punjabi / ਪੰਜਾਬੀ",
  ur: "Urdu / اردو",
  es: "Spanish / Español",
  fr: "French / Français",
  de: "German / Deutsch",
  pt: "Portuguese / Português",
  ru: "Russian / Русский",
  ja: "Japanese / 日本語",
  ko: "Korean / 한국어",
  ar: "Arabic / العربية",
  zh: "Chinese / 中文",
};

async function generateTranslationFile(targetLanguage: string): Promise<void> {
  console.log(`\n🌍 Generating translations for ${targetLanguage}...`);
  
  const englishDict = translations.en;
  const keys = Object.keys(englishDict);
  const translatedDict: Record<string, string> = {};
  
  let completed = 0;
  const total = keys.length;
  
  // Translate in batches
  const BATCH_SIZE = 5;
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (key) => {
        const sourceText = (englishDict as Record<string, string>)[key];
        try {
          const translated = await translateWithCache(
            sourceText,
            targetLanguage,
            "en"
          );
          translatedDict[key] = translated;
          completed++;
          
          if (completed % 10 === 0) {
            process.stdout.write(`\r  Progress: ${completed}/${total} keys translated...`);
          }
        } catch (error) {
          console.error(`\n  ❌ Failed to translate key "${key}":`, error);
          translatedDict[key] = sourceText; // Fallback to English
        }
      })
    );
    
    // Small delay between batches
    if (i + BATCH_SIZE < keys.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  
  console.log(`\r  Progress: ${completed}/${total} keys translated ✓`);
  
  // Generate TypeScript file content
  const languageName = languageNames[targetLanguage] || targetLanguage;
  const fileContent = `// ${languageName} translations
// Auto-generated on ${new Date().toISOString()}

export const ${targetLanguage} = ${JSON.stringify(translatedDict, null, 2)} as const;
`;
  
  // Write to file
  const outputPath = path.join(__dirname, "..", "app", "i18n", `${targetLanguage}.ts`);
  fs.writeFileSync(outputPath, fileContent, "utf-8");
  
  console.log(`✅ Generated: app/i18n/${targetLanguage}.ts`);
}

async function main() {
  const targetLanguage = process.argv[2];
  
  if (!targetLanguage) {
    console.error("❌ Usage: tsx scripts/generateTranslations.ts <language-code>");
    console.error("\nExample: tsx scripts/generateTranslations.ts bn");
    console.error("\nSupported languages:");
    console.error(Object.entries(languageNames).map(([code, name]) => `  ${code}: ${name}`).join("\n"));
    process.exit(1);
  }
  
  if (!languageNames[targetLanguage]) {
    console.warn(`⚠️  Warning: Unknown language code "${targetLanguage}"`);
    console.log("Proceeding anyway...");
  }
  
  await generateTranslationFile(targetLanguage);
  
  console.log("\n✅ Translation file generated successfully!");
  console.log("\n📝 Next steps:");
  console.log("1. Review the generated file for accuracy");
  console.log("2. Import it in app/i18n/index.ts");
  console.log(`3. Add to translations object: ${targetLanguage},`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
