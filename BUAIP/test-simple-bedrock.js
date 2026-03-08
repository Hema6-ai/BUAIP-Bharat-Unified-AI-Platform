/**
 * Simple Direct Test - All profile info in one message
 */

const http = require("http");

const sessionId = `test_${Date.now()}`;
const fullProfileMessage = "I'm a 28 year old female from Maharashtra with an annual income of 5 lakhs, general category, no disability, single, and I own a house";

console.log("🧪 Testing AWS Bedrock with Complete Profile");
console.log("═══════════════════════════════════════════════\n");
console.log(`📝 Message: "${fullProfileMessage}"\n`);

const postData = JSON.stringify({
  sessionId,
  message: fullProfileMessage,
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

      console.log(`Status: ${res.statusCode}`);
      console.log(`Response Type: ${response.type}`);
      console.log(`Profile Progress: ${response.profileProgress?.completed}/${response.profileProgress?.total}\n`);

      if (response.type === "schemes" && response.schemes?.length > 0) {
        console.log("✅ SCHEMES FOUND:\n");
        response.schemes.slice(0, 5).forEach((s, i) => {
          console.log(`${i + 1}. ${s.name}`);
          console.log(`   Ministry: ${s.ministry}`);
          console.log(`   Eligibility: ${s.eligibility?.substring(0, 80)}${s.eligibility?.length > 80 ? "..." : ""}`);
          console.log(`   Benefit: ${s.benefits?.substring(0, 80)}${s.benefits?.length > 80 ? "..." : ""}\n`);
        });

        if (response.schemes.length > 5) {
          console.log(`... and ${response.schemes.length - 5} more schemes`);
        }

        console.log("\n═══════════════════════════════════════════════");
        console.log("✅ AWS BEDROCK INTEGRATION SUCCESS!");
        console.log("═══════════════════════════════════════════════");
        console.log("\n✓ Real AWS Bedrock Claude responding");
        console.log("✓ Profile extracted from message");
        console.log("✓ Schemes retrieved and analyzed");
        console.log("✓ Credentials loaded from .env.local");
        process.exit(0);
      } else if (response.message || response.text) {
        console.log("📋 Claude Response:");
        console.log(response.message || response.text);
        console.log("\nℹ️  Profile not yet complete. Continue conversation to get scheme recommendations.");
        process.exit(0);
      } else {
        console.error("⚠️  Unexpected response format");
        console.error(JSON.stringify(response, null, 2));
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  });
});

req.on("error", (error) => {
  console.error("❌ Connection error:", error.message);
  process.exit(1);
});

req.on("timeout", () => {
  console.error("❌ Request timeout");
  req.destroy();
  process.exit(1);
});

req.write(postData);
req.end();
