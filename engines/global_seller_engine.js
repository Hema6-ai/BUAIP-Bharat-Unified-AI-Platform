/*
 * GlobalSellerEngine
 *
 * New BUAIP extension engine with two intelligence layers:
 * 1) GlobalSeller Intelligence (7 modules)
 * 2) India Commerce Intelligence (10 modules)
 *
 * Load-bearing rule: No static advice fallback. Bedrock reasoning is mandatory.
 */

function optionalRequire(moduleName) {
  try {
    return require(moduleName);
  } catch (_) {
    return null;
  }
}

const bedrockPkg = optionalRequire("@aws-sdk/client-bedrock-runtime");
const kendraPkg = optionalRequire("@aws-sdk/client-kendra");
const s3Pkg = optionalRequire("@aws-sdk/client-s3");
const dynamoPkg = optionalRequire("@aws-sdk/client-dynamodb");
const rdsDataPkg = optionalRequire("@aws-sdk/client-rds-data");
const transcribePkg = optionalRequire("@aws-sdk/client-transcribe");
const pollyPkg = optionalRequire("@aws-sdk/client-polly");
const comprehendPkg = optionalRequire("@aws-sdk/client-comprehend");
const snsPkg = optionalRequire("@aws-sdk/client-sns");
const cloudwatchPkg = optionalRequire("@aws-sdk/client-cloudwatch");

const GLOBAL_MODULES = [
  "M1 Market Expansion",
  "M2 Supply Chain Risk",
  "M3 Cultural Listing Adaptation",
  "M4 Compliance Navigation",
  "M5 Pricing Intelligence",
  "M6 Manufacturer Trust Scoring",
  "M7 Launch Intelligence",
];

const INDIA_MODULES = [
  "I1 Multi-Platform Expansion",
  "I2 Indian Sourcing Hub Finder",
  "I3 GST and Compliance",
  "I4 Regional Pricing",
  "I5 B2B Wholesale Connect",
  "I6 Logistics Optimizer",
  "I7 Bharat Voice Shopping",
  "I8 Fake Review Detector",
  "I9 Festival Demand Forecast",
  "I10 Seller Policy Shield",
];

const GLOBAL_SELLER_KEYWORDS = [
  "sell on amazon",
  "amazon marketplace",
  "amazon seller",
  "sourcing manufacturer",
  "supply chain",
  "pricing strategy",
  "logistics",
  "compliance",
  "seller policy",
  "india mart",
  "tradeindia",
  "flipkart",
  "meesho",
  "jiomart",
  "gst",
  "hsn",
  "festival demand",
  "fba",
  "fbm",
  "global selling",
  "cross border",
  "export ecommerce",
];

function shouldRouteToGlobalSellerEngine(query) {
  const text = (query || "").toLowerCase();
  return GLOBAL_SELLER_KEYWORDS.some((kw) => text.includes(kw));
}

function isIndiaCommerceQuery(query) {
  const text = (query || "").toLowerCase();
  return [
    "india",
    "amazon.in",
    "flipkart",
    "meesho",
    "jiomart",
    "snapdeal",
    "gst",
    "hsn",
    "fssai",
    "bis",
    "isi",
    "indiamart",
    "tradeindia",
    "udaan",
    "delhivery",
    "shiprocket",
    "ekart",
    "dtdc",
    "blue dart",
    "india post",
    "diwali",
    "navratri",
    "durga puja",
    "eid",
    "onam",
    "pongal",
    "holi",
    "raksha bandhan",
  ].some((kw) => text.includes(kw));
}

class GlobalSellerEngine {
  constructor(options = {}) {
    this.region = options.region || process.env.AWS_REGION || "ap-south-1";
    this.modelId =
      options.modelId ||
      process.env.BEDROCK_MODEL_ID ||
      "anthropic.claude-3-5-sonnet-20240620-v1:0";

    this.clients = {
      bedrock: this.createClient(bedrockPkg, "BedrockRuntimeClient"),
      kendra: this.createClient(kendraPkg, "KendraClient"),
      s3: this.createClient(s3Pkg, "S3Client"),
      dynamodb: this.createClient(dynamoPkg, "DynamoDBClient"),
      rdsData: this.createClient(rdsDataPkg, "RDSDataClient"),
      transcribe: this.createClient(transcribePkg, "TranscribeClient"),
      polly: this.createClient(pollyPkg, "PollyClient"),
      comprehend: this.createClient(comprehendPkg, "ComprehendClient"),
      sns: this.createClient(snsPkg, "SNSClient"),
      cloudwatch: this.createClient(cloudwatchPkg, "CloudWatchClient"),
    };
  }

  createClient(pkg, className) {
    if (!pkg || !pkg[className]) return null;
    try {
      return new pkg[className]({ region: this.region });
    } catch (_) {
      return null;
    }
  }

  async analyze(request) {
    const startedAt = Date.now();
    const query = (request && request.query ? String(request.query) : "").trim();

    if (!query) {
      throw new Error("GlobalSellerEngine requires a non-empty query");
    }

    const mode = request.mode || (isIndiaCommerceQuery(query) ? "INDIA" : "GLOBAL");
    const activeModules = mode === "INDIA" ? INDIA_MODULES : GLOBAL_MODULES;

    const dataContext = await this.collectDataContext(request, mode);
    const systemPrompt = this.buildSystemPrompt({ mode, activeModules, dataContext, request });

    // Load-bearing rule: must call Bedrock; no static fallback analysis.
    const aiResult = await this.invokeBedrock({ query, systemPrompt });

    const riskSeverity = this.estimateRiskSeverity(aiResult);
    if (riskSeverity === "HIGH") {
      await this.publishSnsAlert("HIGH", query, aiResult);
    }

    const voiceBase64 = request.voiceResponse
      ? await this.synthesizeVoice(aiResult, request.language || "en-IN")
      : null;

    await this.putMetric("GlobalSellerEngineLatencyMs", Date.now() - startedAt);
    await this.putMetric("GlobalSellerEngineInvocation", 1);

    return {
      engine: "GlobalSellerEngine",
      mode,
      activeModules,
      aiResult,
      dataContext,
      riskSeverity,
      assumptions: dataContext.assumptions,
      voiceResponseBase64: voiceBase64,
      timestamp: new Date().toISOString(),
    };
  }

  async collectDataContext(request, mode) {
    const assumptions = [];
    const context = {
      mode,
      assumptions,
      kendraFindings: [],
      s3Datasets: [],
      dynamoSignals: [],
      rdsSignals: [],
      comprehendSignals: null,
      transcribeText: null,
    };

    context.kendraFindings = await this.fetchKendraFindings(request.query, assumptions);
    context.s3Datasets = await this.fetchS3Datasets(assumptions);
    context.dynamoSignals = await this.fetchDynamoSignals(request, assumptions);
    context.rdsSignals = await this.fetchRdsSignals(request, assumptions);

    if (request.reviewText) {
      context.comprehendSignals = await this.fetchComprehendSignals(request.reviewText, assumptions);
    }

    if (request.voiceS3Uri) {
      context.transcribeText = await this.fetchTranscribeText(request.voiceS3Uri, assumptions);
    }

    return context;
  }

  async fetchKendraFindings(query, assumptions) {
    if (!this.clients.kendra || !kendraPkg || !kendraPkg.QueryCommand) {
      assumptions.push("Kendra unavailable; policy retrieval skipped.");
      return [];
    }

    const indexId = process.env.AWS_KENDRA_INDEX_ID;
    if (!indexId) {
      assumptions.push("AWS_KENDRA_INDEX_ID missing; policy retrieval skipped.");
      return [];
    }

    try {
      const cmd = new kendraPkg.QueryCommand({
        IndexId: indexId,
        QueryText: query,
        PageSize: 5,
      });
      const result = await this.clients.kendra.send(cmd);
      return (result.ResultItems || []).map((item) => ({
        title: item.DocumentTitle ? item.DocumentTitle.Text : "Untitled",
        uri: item.DocumentURI || "",
        score: item.ScoreAttributes && item.ScoreAttributes.ScoreConfidence ? item.ScoreAttributes.ScoreConfidence : "UNKNOWN",
      }));
    } catch (err) {
      assumptions.push("Kendra query failed; policy findings unavailable.");
      return [];
    }
  }

  async fetchS3Datasets(assumptions) {
    if (!this.clients.s3 || !s3Pkg || !s3Pkg.ListObjectsV2Command) {
      assumptions.push("S3 client unavailable; dataset listing skipped.");
      return [];
    }

    const bucket = process.env.GLOBALSELLER_DATA_BUCKET;
    if (!bucket) {
      assumptions.push("GLOBALSELLER_DATA_BUCKET missing; dataset listing skipped.");
      return [];
    }

    try {
      const cmd = new s3Pkg.ListObjectsV2Command({ Bucket: bucket, MaxKeys: 20 });
      const result = await this.clients.s3.send(cmd);
      return (result.Contents || []).map((obj) => ({
        key: obj.Key || "",
        lastModified: obj.LastModified ? obj.LastModified.toISOString() : null,
        size: obj.Size || 0,
      }));
    } catch (_) {
      assumptions.push("S3 listing failed; dataset freshness unknown.");
      return [];
    }
  }

  async fetchDynamoSignals(request, assumptions) {
    if (!this.clients.dynamodb || !dynamoPkg || !dynamoPkg.ScanCommand) {
      assumptions.push("DynamoDB client unavailable; metadata retrieval skipped.");
      return [];
    }

    const tableName = process.env.GLOBALSELLER_METADATA_TABLE;
    if (!tableName) {
      assumptions.push("GLOBALSELLER_METADATA_TABLE missing; metadata retrieval skipped.");
      return [];
    }

    try {
      const cmd = new dynamoPkg.ScanCommand({ TableName: tableName, Limit: 20 });
      const result = await this.clients.dynamodb.send(cmd);
      return (result.Items || []).slice(0, 10);
    } catch (_) {
      assumptions.push("DynamoDB scan failed; product metadata unavailable.");
      return [];
    }
  }

  async fetchRdsSignals(request, assumptions) {
    if (!this.clients.rdsData || !rdsDataPkg || !rdsDataPkg.ExecuteStatementCommand) {
      assumptions.push("RDS Data client unavailable; manufacturer/logistics DB skipped.");
      return [];
    }

    const resourceArn = process.env.RDS_CLUSTER_ARN;
    const secretArn = process.env.RDS_SECRET_ARN;
    const database = process.env.RDS_DATABASE;

    if (!resourceArn || !secretArn || !database) {
      assumptions.push("RDS env vars missing; manufacturer/logistics DB skipped.");
      return [];
    }

    try {
      const sql = "SELECT manufacturer_name, risk_score, lead_time_days, region FROM manufacturer_risk_view ORDER BY risk_score DESC LIMIT 10";
      const cmd = new rdsDataPkg.ExecuteStatementCommand({
        resourceArn,
        secretArn,
        database,
        sql,
        includeResultMetadata: true,
      });
      const result = await this.clients.rdsData.send(cmd);
      return result.records || [];
    } catch (_) {
      assumptions.push("RDS query failed; supply risk table unavailable.");
      return [];
    }
  }

  async fetchComprehendSignals(reviewText, assumptions) {
    if (!this.clients.comprehend || !comprehendPkg || !comprehendPkg.DetectSentimentCommand) {
      assumptions.push("Comprehend unavailable; review manipulation analysis skipped.");
      return null;
    }

    try {
      const cmd = new comprehendPkg.DetectSentimentCommand({
        Text: String(reviewText).slice(0, 4500),
        LanguageCode: "en",
      });
      const result = await this.clients.comprehend.send(cmd);
      return {
        sentiment: result.Sentiment || "UNKNOWN",
        score: result.SentimentScore || {},
      };
    } catch (_) {
      assumptions.push("Comprehend sentiment failed; fraud signal confidence reduced.");
      return null;
    }
  }

  async fetchTranscribeText(voiceS3Uri, assumptions) {
    if (!this.clients.transcribe || !transcribePkg || !transcribePkg.StartTranscriptionJobCommand) {
      assumptions.push("Transcribe unavailable; voice input not transcribed.");
      return null;
    }

    assumptions.push("Transcribe job accepted asynchronously; final transcript must be fetched from output bucket.");

    try {
      const jobName = `globalseller-${Date.now()}`;
      const cmd = new transcribePkg.StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: "en-IN",
        Media: { MediaFileUri: voiceS3Uri },
      });
      await this.clients.transcribe.send(cmd);
      return `Transcribe job started: ${jobName}`;
    } catch (_) {
      assumptions.push("Transcribe job start failed; using text query only.");
      return null;
    }
  }

  buildSystemPrompt({ mode, activeModules, dataContext, request }) {
    const moduleList = activeModules.map((m, idx) => `${idx + 1}. ${m}`).join("\n");
    const modulePlaybook = [
      "GLOBAL MODULE PLAYBOOK:",
      "- M1 Market Expansion: score all Amazon marketplaces 0-100, explain demand/competition, recommend best market, provide 90-day entry plan.",
      "- M2 Supply Chain Risk: analyze supplier geography risk, inventory runway, alternate suppliers, contingency triggers.",
      "- M3 Cultural Listing Adaptation: adapt listing copy by buyer psychology and local culture.",
      "- M4 Compliance Navigation: include CE, FCC, REACH, CPSC with cost/time estimates.",
      "- M5 Pricing Intelligence: competitor ranges, recommended pricing bands, seasonal pricing calendar.",
      "- M6 Manufacturer Trust Scoring: financial stability, delivery reliability, compliance history.",
      "- M7 Launch Intelligence: week-by-week launch plan from Week -4 to Month 3 with keywords, review velocity, ad spend and pivots.",
      "",
      "INDIA MODULE PLAYBOOK:",
      "- I1 Multi-Platform Expansion: compare Amazon.in, Flipkart, Meesho, JioMart, Snapdeal with opportunity score 0-100.",
      "- I2 Indian Sourcing Hub Finder: Moradabad brass, Tiruppur garments, Surat textiles, Jaipur handicrafts, Ludhiana woollens, Agra footwear, Firozabad glass, Panipat blankets, Rajkot engineering (with MOQ and cost tiers).",
      "- I3 GST and Compliance: include GST slab, HSN code flow, FSSAI, BIS, ISI, MSME registration with costs/timelines.",
      "- I4 Regional Pricing: North/South/East/West and Tier1/Tier2/Tier3 price differences plus festival strategy.",
      "- I5 B2B Wholesale Connect: IndiaMART, TradeIndia, Udaan with wholesale pricing formulas.",
      "- I6 Logistics Optimizer: Delhivery, Shiprocket, Ekart, DTDC, Blue Dart, India Post with per-kg cost, speed, COD and return risk.",
      "- I7 Bharat Voice Shopping: reply in same language for Hindi/Telugu/Tamil/Bengali/Marathi/Kannada/Malayalam/Gujarati.",
      "- I8 Fake Review Detector: review bursts, templates, incentives, manipulated pricing and authenticity verdict.",
      "- I9 Festival Demand Forecast: Diwali, Navratri, Durga Puja, Eid, Onam, Pongal, Christmas, Holi, Raksha Bandhan with inventory multipliers.",
      "- I10 Seller Policy Shield: interpret Amazon.in and Flipkart policy with severity, corrective steps, POA template and appeal letter draft.",
    ].join("\n");

    return [
      "You are GlobalSeller AI - a world-class Amazon global selling strategist with expertise in global marketplaces and Indian e-commerce.",
      "You provide highly tactical advice about market expansion, pricing, compliance, logistics, and supply chains.",
      "Always produce structured analysis with numbers, costs, and timelines.",
      "",
      "LOAD-BEARING RULE:",
      "- You must reason deeply across market scoring, demand analysis, supply chain risk, regulatory interpretation, logistics optimization, fraud detection, pricing models, and demand forecasting.",
      "- Do not output generic templates.",
      "",
      `ACTIVE MODE: ${mode}`,
      "ACTIVE MODULES:",
      moduleList,
      "",
      modulePlaybook,
      "",
      "REAL DATA CONTEXT (DO NOT FABRICATE):",
      JSON.stringify(dataContext, null, 2),
      "",
      "REAL DATA RULE:",
      "- Use provided retrieval context first.",
      "- If data is missing, explicitly state assumptions and confidence impact.",
      "",
      "RESPONSE FORMAT (STRICT):",
      "1) Intent and scope",
      "2) Module-by-module analysis",
      "3) Quantitative output (scores 0-100, ranges, timelines)",
      "4) Risks and mitigations",
      "5) Action plan (week-by-week where relevant)",
      "6) Data confidence and assumptions",
      "",
      "MANDATORY OUTPUTS:",
      "- Market scores with rationale",
      "- Pricing recommendation and guardrails",
      "- Compliance checklist with estimated costs/timelines",
      "- Logistics partner comparison",
      "- Fraud review verdict when review signals are present",
      "- 90-day execution plan",
      "",
      "USER LANGUAGE:",
      `- Respond in ${request.language || "English"}.`,
    ].join("\n");
  }

  async invokeBedrock({ query, systemPrompt }) {
    if (!this.clients.bedrock || !bedrockPkg || !bedrockPkg.InvokeModelCommand) {
      throw new Error("Bedrock client unavailable. GlobalSellerEngine cannot run without AI reasoning layer.");
    }

    const body = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2500,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: query }],
        },
      ],
    };

    const command = new bedrockPkg.InvokeModelCommand({
      modelId: this.modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    });

    const response = await this.clients.bedrock.send(command);
    const decoded = JSON.parse(Buffer.from(response.body).toString("utf8"));

    const text = decoded && decoded.content && decoded.content[0] && decoded.content[0].text
      ? decoded.content[0].text
      : "";

    if (!text) {
      throw new Error("Bedrock returned empty response for GlobalSellerEngine.");
    }

    return text;
  }

  estimateRiskSeverity(aiText) {
    const text = String(aiText || "").toLowerCase();
    if (text.includes("high risk") || text.includes("critical")) return "HIGH";
    if (text.includes("medium risk")) return "MEDIUM";
    return "LOW";
  }

  async publishSnsAlert(severity, query, aiResult) {
    if (!this.clients.sns || !snsPkg || !snsPkg.PublishCommand) return;
    const topicArn = process.env.GLOBALSELLER_SNS_TOPIC_ARN;
    if (!topicArn) return;

    try {
      const cmd = new snsPkg.PublishCommand({
        TopicArn: topicArn,
        Subject: `[GlobalSellerEngine] ${severity} risk detected`,
        Message: JSON.stringify({ severity, query, snippet: String(aiResult).slice(0, 1200) }),
      });
      await this.clients.sns.send(cmd);
    } catch (_) {
      // Non-blocking alert path
    }
  }

  async synthesizeVoice(text, languageCode) {
    if (!this.clients.polly || !pollyPkg || !pollyPkg.SynthesizeSpeechCommand) return null;
    try {
      const cmd = new pollyPkg.SynthesizeSpeechCommand({
        Text: String(text).slice(0, 3000),
        OutputFormat: "mp3",
        VoiceId: "Aditi",
        LanguageCode: languageCode,
      });
      const result = await this.clients.polly.send(cmd);
      if (!result.AudioStream) return null;
      const audioBytes = await streamToBuffer(result.AudioStream);
      return audioBytes.toString("base64");
    } catch (_) {
      return null;
    }
  }

  async putMetric(name, value) {
    if (!this.clients.cloudwatch || !cloudwatchPkg || !cloudwatchPkg.PutMetricDataCommand) return;
    try {
      const cmd = new cloudwatchPkg.PutMetricDataCommand({
        Namespace: "BUAIP/GlobalSellerEngine",
        MetricData: [
          {
            MetricName: name,
            Value: Number(value),
            Unit: "Count",
            Timestamp: new Date(),
          },
        ],
      });
      await this.clients.cloudwatch.send(cmd);
    } catch (_) {
      // Non-blocking metrics path
    }
  }
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function analyzeGlobalSellerQuery(input) {
  const engine = new GlobalSellerEngine();
  return engine.analyze(input);
}

module.exports = {
  GlobalSellerEngine,
  analyzeGlobalSellerQuery,
  shouldRouteToGlobalSellerEngine,
  isIndiaCommerceQuery,
  GLOBAL_MODULES,
  INDIA_MODULES,
};
