const { chromium } = require('playwright');

const steps = [
  'find schemes for me',
  'Female',
  '19',
  'Ap',
  'yes',
  'Guntur district',
  'Rural area',
  'OBC',
];

async function waitForAssistantMessageCount(page, prevCount, timeoutMs = 45000) {
  await page.waitForFunction(
    (count) => {
      const nodes = document.querySelectorAll('div.bg-white.border.border-gray-200 p.text-sm.leading-relaxed.whitespace-pre-wrap');
      return nodes.length > count;
    },
    prevCount,
    { timeout: timeoutMs }
  );
}

async function getAssistantMessages(page) {
  return await page.$$eval(
    'div.bg-white.border.border-gray-200 p.text-sm.leading-relaxed.whitespace-pre-wrap',
    (nodes) =>
    nodes.map((n) => (n.textContent || '').trim()).filter(Boolean)
  );
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    console.log('Opening chat page...');
    await page.goto('http://localhost:3000/chat', { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('input[placeholder="Ask BUAIP..."]:not([disabled])', {
      timeout: 30000,
    });

    const transcript = [];

    for (const userMessage of steps) {
      const beforeMessages = await getAssistantMessages(page);
      const beforeCount = beforeMessages.length;

      const input = page.locator('input[placeholder="Ask BUAIP..."]:not([disabled])').first();
      await input.click();
      await input.fill('');
      await input.type(userMessage, { delay: 10 });
      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/api/unified-ai') &&
            resp.request().method() === 'POST' &&
            resp.status() === 200,
          { timeout: 60000 }
        ),
        input.press('Enter'),
      ]);

      await waitForAssistantMessageCount(page, beforeCount);

      const afterMessages = await getAssistantMessages(page);
      const latestAssistant = afterMessages[afterMessages.length - 1] || '';

      transcript.push({ user: userMessage, assistant: latestAssistant });
      console.log('\nUSER:', userMessage);
      console.log('AI  :', latestAssistant);
    }

    const checks = [
      {
        name: 'Starts with gender question',
        pass: /what is your gender\?/i.test(transcript[0]?.assistant || ''),
      },
      {
        name: 'After Female asks age only',
        pass: /what is your age/i.test(transcript[1]?.assistant || ''),
      },
      {
        name: 'AP confirmation appears',
        pass: /understood\s+"?ap"?\s+as\s+andhra\s+pradesh/i.test(transcript[3]?.assistant || ''),
      },
      {
        name: 'After yes asks district',
        pass: /which district/i.test(transcript[4]?.assistant || ''),
      },
      {
        name: 'After district asks residence',
        pass: /urban|rural/i.test(transcript[5]?.assistant || ''),
      },
      {
        name: 'After residence asks category',
        pass: /social category|general\s*\/\s*obc\s*\/\s*sc\s*\/\s*st/i.test(transcript[6]?.assistant || ''),
      },
      {
        name: 'After OBC asks income',
        pass: /monthly household income/i.test(transcript[7]?.assistant || ''),
      },
      {
        name: 'No early scheme recommendations',
        pass: transcript.slice(0, 8).every((t) => !/scheme name|how to apply|official website link/i.test(t.assistant)),
      },
    ];

    console.log('\n=== CHECKS ===');
    for (const check of checks) {
      console.log(`${check.pass ? 'PASS' : 'FAIL'} - ${check.name}`);
    }

    const failed = checks.filter((c) => !c.pass);
    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
