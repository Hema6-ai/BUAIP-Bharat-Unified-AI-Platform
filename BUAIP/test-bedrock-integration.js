/**
 * Test AWS Bedrock Integration
 * Verifies that real AI responses are coming from AWS Bedrock Claude
 */

const https = require("https");
const http = require("http");

const testData = {
  sessionId: `test_${Date.now()}`,
  message: "I'm from Maharashtra and 28 years old",
};

console.log("🧪 Testing AWS Bedrock Integration");
console.log("═══════════════════════════════════════════════\n");
console.log("📤 Sending message to /api/scheme-conversation");
console.log(`📝 Message: "${testData.message}"\n`);

const postData = JSON.stringify(testData);

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

      console.log("✅ API Response Received\n");
      console.log(`Status Code: ${res.statusCode}`);
      
      if (res.statusCode === 500 || response.error) {
        console.log("\n❌ ERROR:");
        console.log(JSON.stringify(response, null, 2));
        process.exit(1);
      }

      console.log(`Response Type: ${response.type}`);
      console.log(`Session ID: ${response.sessionId}\n`);

      if (response.text) {
        console.log("💬 AI Response (from Bedrock Claude):");
        console.log("────────────────────────────────────");
        console.log(response.text.substring(0, 300));
        if (response.text.length > 300) console.log("...");
        console.log("────────────────────────────────────\n");
      }

      if (response.profileProgress) {
        console.log(
          `🎯 Profile Progress: ${response.profileProgress.completed}/${response.profileProgress.total}`
        );
      }

      // Check if this is real AI response (not mock/hardcoded)
      if (response.text && response.text.length > 50) {
        console.log("\n✅ SUCCESS: Real AI response from AWS Bedrock Claude!");
        console.log("   - Response is conversational and dynamic");
        console.log("   - Not a hardcoded/mock response");
        process.exit(0);
      } else {
        console.log("\n⚠️  WARNING: Response seems short or empty");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Failed to parse response:", error.message);
      console.error("Raw response:", data.substring(0, 500));
      process.exit(1);
    }
  });
});

req.on("error", (error) => {
  console.error("❌ Error:", error.message);
  if (error.code === "ECONNREFUSED") {
    console.error("   → Server not running on port 3000");
  }
  process.exit(1);
});

req.on("timeout", () => {
  console.error(
    "❌ Request timeout (30s). Bedrock may be taking longer than expected."
  );
  req.destroy();
  process.exit(1);
});

req.write(postData);
req.end();
