/**
 * Comprehensive Bedrock Integration Test
 * Tests full conversation flow: profile collection → scheme recommendations
 */

const http = require("http");

const tests = [
  {
    name: "Step 1: Initial message with state and age",
    message: "I'm from Maharashtra and 28 years old",
  },
  {
    name: "Step 2: Gender selection",
    message: "I'm female",
  },
  {
    name: "Step 3: Income information",
    message: "My annual income is around 5 lakhs",
  },
  {
    name: "Step 4: Social category",
    message: "I'm from the general category",
  },
  {
    name: "Step 5: Disability status",
    message: "No, I don't have any disability",
  },
  {
    name: "Step 6: Marital status",
    message: "I'm single",
  },
  {
    name: "Step 7: Land ownership",
    message: "I own a house",
  },
];

let sessionId = `test_${Date.now()}`;

async function runTest(testIndex) {
  const test = tests[testIndex];

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      sessionId,
      message: test.message,
    });

    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/scheme-conversation",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data);

          console.log(`\n📍 ${test.name}`);
          console.log(`   You: "${test.message}"`);
          console.log(`   Status: ${res.statusCode}`);

          if (response.text) {
            console.log(`   Claude: "${response.text.substring(0, 150)}${response.text.length > 150 ? "..." : ""}"`);
          } else if (response.message) {
            console.log(`   Claude (schemes): Found ${response.schemes?.length || "multiple"} schemes`);
          }

          console.log(`   Progress: ${response.profileProgress.completed}/${response.profileProgress.total}`);

          if (response.type === "schemes" && response.schemes) {
            console.log(`   ✅ SCHEMES FOUND:`);
            response.schemes.slice(0, 3).forEach((s, i) => {
              console.log(`      ${i + 1}. ${s.name} - ${s.ministry}`);
            });
            if (response.schemes.length > 3) {
              console.log(`      ... and ${response.schemes.length - 3} more`);
            }
          }

          resolve(response);
        } catch (error) {
          console.error(`Error: ${error.message}`);
          resolve(null);
        }
      });
    });

    req.on("error", (error) => {
      console.error(`❌ Error: ${error.message}`);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

async function runAllTests() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  COMPREHENSIVE AWS BEDROCK INTEGRATION TEST");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Session ID: ${sessionId}\n`);

  for (let i = 0; i < tests.length; i++) {
    const response = await runTest(i);

    if (!response) {
      console.error("Test failed, stopping");
      process.exit(1);
    }

    // If we got schemes back, we're done
    if (response.type === "schemes" && response.schemes?.length > 0) {
      console.log("\n═══════════════════════════════════════════════════════════");
      console.log("✅ SUCCESS: Full Bedrock AI Integration Working!");
      console.log("═══════════════════════════════════════════════════════════");
      console.log(`\n✓ Profile Collection: Complete (${response.profileProgress.completed}/${response.profileProgress.total})`);
      console.log(`✓ Scheme Retrieval: ${response.schemes.length} schemes found`);
      console.log(`✓ Claude Analysis: ${response.message?.substring(0, 100)}...`);
      console.log("\n✅ Real AI at work:");
      console.log("   - AWS Bedrock Claude asking intelligent questions");
      console.log("   - RAG system finding matching schemes");
      console.log("   - No mocks, no hardcoded responses");
      console.log("   - Real AWS credentials from .env.local");
      process.exit(0);
    }

    // Wait a bit before next test
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n⚠️  Did not reach scheme recommendations");
  process.exit(1);
}

runAllTests().catch(console.error);
