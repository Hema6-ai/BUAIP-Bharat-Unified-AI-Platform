/**
 * Test Intent Detection
 * Simple test to debug what detectIntent returns for GlobalSeller queries
 */

const { detectIntent, routeQuery } = require('./app/lib/buaipRouter');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         INTENT DETECTION DEBUG TEST                           ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const testQueries = [
  "I want to sell handmade crafts online",
  "How to start selling on Amazon India?",
  "Find brass manufacturers in Moradabad",
  "Logistics cost for shipping packages",
  "Diwali season inventory planning",
  "GST registration for e-commerce",
  "What is the current mandi price of wheat?",
  "Best crop for Telangana Kharif season",
  "What government schemes can I apply for?",
  "I lost my passport in Delhi"
];

console.log('Testing detectIntent() for each query:\n');

testQueries.forEach((query, index) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Query ${index + 1}: "${query}"`);
  console.log('='.repeat(70));
  
  const intentAnalysis = detectIntent(query);
  const routeResult = routeQuery(query);
  
  console.log('\n📊 Intent Analysis:');
  console.log('  Primary Intent:', intentAnalysis.primaryIntent);
  console.log('  Confidence:', intentAnalysis.confidence);
  console.log('  Secondary Intents:', intentAnalysis.secondaryIntents);
  
  console.log('\n🎯 Route Result:');
  console.log('  Engine:', routeResult.engine);
  console.log('  Endpoint:', routeResult.endpoint);
  console.log('  Reasoning:', routeResult.reasoning);
  
  // Check what it should route to
  if (intentAnalysis.primaryIntent === 'global_seller_intelligence') {
    console.log('\n✅ Should route to: GlobalSeller Commerce Intelligence');
  } else if (intentAnalysis.primaryIntent === 'agriculture_farming') {
    console.log('\n✅ Should route to: Annadata Agriculture Intelligence');
  } else if (intentAnalysis.primaryIntent === 'scheme_eligibility') {
    console.log('\n✅ Should route to: Government Scheme Eligibility Intelligence');
  } else if (['pre_arrival_planning', 'city_navigation', 'payment_money', 'emergency_assistance', 'food_safety', 'expat_longstay', 'language_survival', 'legal_cultural'].includes(intentAnalysis.primaryIntent)) {
    console.log('\n✅ Should route to: India Insider Tourist Intelligence');
  } else {
    console.log('\n⚠️  Should route to: Default (Scheme)');
  }
});

console.log('\n\n' + '='.repeat(70));
console.log('Test complete!');
console.log('='.repeat(70));
