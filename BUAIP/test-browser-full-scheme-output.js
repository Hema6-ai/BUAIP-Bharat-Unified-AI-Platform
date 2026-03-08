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
  '15000',
  'Student',
  'Completed 12th standard',
  'Yes',
  'No, unemployed',
  'No',
  'No',
  'No',
  'No',
  'Unmarried',
  'No',
  'Yes',
];

async function getAssistantMessages(page) {
  return await page.$$eval(
    'div.bg-white.border.border-gray-200 p.text-sm.leading-relaxed.whitespace-pre-wrap',
    (nodes) => nodes.map((n) => (n.textContent || '').trim()).filter(Boolean)
  );
}

async function waitForNextAssistantMessage(page, previousCount, timeoutMs = 90000) {
  await page.waitForFunction(
    (count) => {
      const nodes = document.querySelectorAll(
        'div.bg-white.border.border-gray-200 p.text-sm.leading-relaxed.whitespace-pre-wrap'
      );
      return nodes.length > count;
    },
    previousCount,
    { timeout: timeoutMs }
  );
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    await page.goto('http://localhost:3000/chat', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('input[placeholder="Ask BUAIP..."]:not([disabled])', { timeout: 30000 });

    const transcript = [];

    for (const userMessage of steps) {
      const beforeMessages = await getAssistantMessages(page);
      const beforeCount = beforeMessages.length;

      const input = page.locator('input[placeholder="Ask BUAIP..."]:not([disabled])').first();
      await input.click();
      await input.fill('');
      await input.type(userMessage, { delay: 8 });

      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/api/unified-ai') &&
            resp.request().method() === 'POST' &&
            resp.status() === 200,
          { timeout: 90000 }
        ),
        input.press('Enter'),
      ]);

      await waitForNextAssistantMessage(page, beforeCount);

      const afterMessages = await getAssistantMessages(page);
      const latestAssistant = afterMessages[afterMessages.length - 1] || '';
      transcript.push({ user: userMessage, assistant: latestAssistant });

      console.log(`\nUSER: ${userMessage}`);
      console.log(`AI  : ${latestAssistant.slice(0, 500)}${latestAssistant.length > 500 ? '...' : ''}`);
    }

    const finalAssistant = transcript[transcript.length - 1]?.assistant || '';
    const askedSeniorQuestion = transcript.some((t) => /senior citizen/i.test(t.assistant));

    const containsLikelySchemeOutput =
      /scheme|yojana|ministry|how to apply|required documents|official website/i.test(finalAssistant);

    console.log('\n=== FINAL ASSERTION ===');
    console.log('Final message length:', finalAssistant.length);
    console.log('Contains scheme-style output:', containsLikelySchemeOutput ? 'YES' : 'NO');
    console.log('Asked senior-citizen question:', askedSeniorQuestion ? 'YES' : 'NO');

    if (!containsLikelySchemeOutput) {
      console.error('FAIL: Final response does not look like scheme recommendations.');
      process.exitCode = 1;
    } else if (askedSeniorQuestion) {
      console.error('FAIL: Senior citizen question was asked despite age < 60.');
      process.exitCode = 1;
    } else {
      console.log('PASS: Final response contains scheme output and skipped senior-citizen question.');
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
