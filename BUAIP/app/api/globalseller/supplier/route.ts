import { callBedrock } from "@/app/lib/bedrock";

export async function POST(req: Request) {
  try {
    const { manufacturerName, country, productCategory } = await req.json();

    const prompt = `You are GlobalSeller AI — a world-class Amazon global selling strategist with expertise across 7 domains.

A seller is evaluating a manufacturer:
- Manufacturer: ${manufacturerName}
- Location: ${country}
- Product Category: ${productCategory}

TASK: Give detailed supplier trust assessment with specific risk flags and verification steps.

1. TRUST SCORE (0-100):
   - Overall score with reasoning

2. TRUST BREAKDOWN:
   
   A) FINANCIAL STABILITY (0-100):
   - What to look for: Company age, size, export history
   - Red flags: Frequent bankruptcies, credit defaults, sudden ownership changes
   - How to verify: Trade databases, export records, company filings
   - Your assessment: [score and reason]

   B) QUALITY CONSISTENCY (0-100):
   - What to look for: ISO certifications, quality control processes, defect rates
   - Red flags: Complaints from other buyers, quality variations, poor testing
   - How to verify: Third-party audits, certifications, buyer reviews across platforms
   - Your assessment: [score and reason]

   C) DELIVERY RELIABILITY (0-100):
   - What to look for: On-time delivery rate, communication responsiveness
   - Red flags: Frequent delays, missed deadlines, poor communication
   - How to verify: Discussion with references (other buyers), shipping records
   - Your assessment: [score and reason]

   D) COMPLIANCE HISTORY (0-100):
   - What to look for: Environmental compliance, labor practices, certification renewals
   - Red flags: Environmental violations, labor complaints, failed audits
   - How to verify: Government records, audit reports, news searches
   - Your assessment: [score and reason]

3. RED FLAGS TO INVESTIGATE:
   - List 5-10 specific red flags for THIS manufacturer
   - What to ask directly in meetings
   - What documents to request

4. VERIFICATION CHECKLIST:
   - Documents to request: [list with what to look for]
   - Questions to ask in video call: [specific, probing questions]
   - Third-party references to contact: [types of references]
   - Factory audit considerations: [what to look for]
   - Sample order strategy: [size, timeline, payment terms]

5. CONTRACT PROTECTION CLAUSES:
   - What to put in your supplier agreement
   - Indemnity clauses
   - Quality guarantees
   - Late delivery penalties
   - Force majeure clauses

6. RISK LEVEL OVERALL:
   - GREEN (Safe to work with)
   - YELLOW (Proceed with caution + hedging)
   - RED (High risk, get second opinion)

Be specific to THIS manufacturer and region (${country}).
Don't generic advice.

End with: "Which of the 7 modules do you want to go deeper on?"`;

    const result = await callBedrock(prompt, { maxTokens: 2000 });
    return Response.json({ supplierReport: result });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to score supplier" }, { status: 500 });
  }
}
