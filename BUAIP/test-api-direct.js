/**
 * Direct API Test
 * Tests the scheme-conversation endpoint with real profile data
 * Checks if Claude is called with detailed prompts
 */

const http = require("http");

async function testAPI() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  TESTING SCHEME CONVERSATION API");
  console.log("═══════════════════════════════════════════════════════════\n");

  const testData = {
    message: "I am a 35-year-old female farmer from Punjab with 2 acres of land",
    sessionId: "test-" + Date.now(),
  };

  console.log("📤 Sending test profile:", testData.message);
  console.log("───────────────────────────────────────────────────────────\n");

  try {
    const response = await fetch("http://localhost:3000/api/scheme-conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log("✅ API Response Received\n");
    console.log("Response type:", result.type);
    console.log("Response status:", result.status);
    
    if (result.text) {
      console.log("\n📝 AI Response:");
      console.log("───────────────────────────────────────────────────────────");
      console.log(result.text);
      console.log("───────────────────────────────────────────────────────────\n");

      // Check if response is detailed or robotic
      const wordCount = result.text.split(" ").length;
      const hasDetailedMarkers = 
        result.text.includes("SCHEME NAME") ||
        result.text.includes("WHY YOU QUALIFY") ||
        result.text.includes("STEP BY STEP") ||
        result.text.includes("HOW TO APPLY") ||
        result.text.includes("ELIGIBILITY");

      console.log("📊 Response Analysis:");
      console.log(`   Word count: ${wordCount} words`);
      console.log(`   Has detailed format markers: ${hasDetailedMarkers ? "✅ YES" : "❌ NO (might be robotic)"}`);

      if (wordCount < 200) {
        console.log("\n⚠️  WARNING: Response is too SHORT (less than 200 words)");
        console.log("   This indicates it might not be using the detailed recommendation prompt");
      } else {
        console.log("\n✅ Response appears detailed and comprehensive");
      }
    }

    if (result.schemes) {
      console.log("\n📋 Schemes returned:", result.schemes.length);
      result.schemes.slice(0, 2).forEach((scheme, i) => {
        console.log(`\n  Scheme ${i + 1}: ${scheme.name}`);
        console.log(`    Ministry: ${scheme.ministry}`);
        console.log(`    Relevance: ${scheme.relevance || "N/A"}`);
      });
    }

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  TEST COMPLETE");
    console.log("═══════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    console.log("\nPossible issues:");
    console.log("  1. Server not running on port 3000");
    console.log("  2. AWS credentials not configured (.env.local missing?)");
    console.log("  3. Bedrock client not initialized");
  }
}

testAPI();
