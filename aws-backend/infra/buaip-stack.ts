#!/usr/bin/env node
// BUAIP — Complete AWS CDK Stack
// One-command deployment: npx cdk deploy --all

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cfOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import * as path from "path";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  region: "ap-south-1", // Mumbai
  projectName: "BUAIP",
  stage: process.env.STAGE || "prod",

  // External API keys (set via environment or SSM)
  dataGovApiKey: process.env.DATA_GOV_IN_API_KEY || "",
  openWeatherApiKey:
    process.env.OPENWEATHER_API_KEY ||
    process.env.WEATHER ||
    process.env.weather ||
    "",

  // Bedrock model
  bedrockModelId:
    process.env.BEDROCK_MODEL_ID ||
    "anthropic.claude-3-5-sonnet-20241022-v2:0",

  // Schedule rates
  mandiPriceFetchRate: "rate(6 hours)",
  weatherFetchRate: "rate(6 hours)",
  schemeRefreshRate: "rate(7 days)",
};

// =============================================================================
// MAIN STACK
// =============================================================================

class BuaipStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── S3: Data Bucket ──────────────────────────────────────────────
    const dataBucket = new s3.Bucket(this, "DataBucket", {
      bucketName: `buaip-data-${CONFIG.stage}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: "archive-old-logs",
          prefix: "logs/",
          transitions: [
            { storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: cdk.Duration.days(30) },
          ],
          expiration: cdk.Duration.days(365),
        },
      ],
    });

    // ─── S3: Frontend Bucket (Next.js static export) ──────────────────
    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: `buaip-frontend-${CONFIG.stage}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // ─── CloudFront Distribution ──────────────────────────────────────
    const distribution = new cloudfront.Distribution(this, "CDN", {
      defaultBehavior: {
        origin: cfOrigins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html", // SPA fallback
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    // ─── DynamoDB Tables ──────────────────────────────────────────────

    // Queries / Logging table
    const queriesTable = new dynamodb.Table(this, "QueriesTable", {
      tableName: `BUAIP_Queries`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: "ttl",
      pointInTimeRecovery: true,
    });

    // Mandi Prices table
    const mandiTable = new dynamodb.Table(this, "MandiTable", {
      tableName: `BUAIP_MandiPrices`,
      partitionKey: { name: "cropState", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "date", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: "ttl",
    });

    // Weather Cache table
    const weatherTable = new dynamodb.Table(this, "WeatherTable", {
      tableName: `BUAIP_Weather`,
      partitionKey: { name: "stateDistrict", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "fetchedAt", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: "ttl",
    });

    // Schemes table
    const schemesTable = new dynamodb.Table(this, "SchemesTable", {
      tableName: `BUAIP_Schemes`,
      partitionKey: { name: "domain", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "schemeId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ─── IAM: Lambda execution role ───────────────────────────────────

    const lambdaRole = new iam.Role(this, "LambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // Bedrock access
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: [`arn:aws:bedrock:${CONFIG.region}::foundation-model/*`],
      })
    );

    // Polly access
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["polly:SynthesizeSpeech"],
        resources: ["*"],
      })
    );

    // Translate access
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["translate:TranslateText"],
        resources: ["*"],
      })
    );

    // Comprehend access (for entity extraction)
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["comprehend:DetectEntities", "comprehend:DetectSentiment"],
        resources: ["*"],
      })
    );

    // Rekognition access (for crop disease photos)
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["rekognition:DetectLabels", "rekognition:DetectText"],
        resources: ["*"],
      })
    );

    // DynamoDB + S3
    queriesTable.grantReadWriteData(lambdaRole);
    mandiTable.grantReadWriteData(lambdaRole);
    weatherTable.grantReadWriteData(lambdaRole);
    schemesTable.grantReadWriteData(lambdaRole);
    dataBucket.grantReadWrite(lambdaRole);

    // ─── Shared Lambda environment ────────────────────────────────────

    const commonEnv: Record<string, string> = {
      AWS_REGION_OVERRIDE: CONFIG.region,
      BEDROCK_MODEL_ID: CONFIG.bedrockModelId,
      QUERIES_TABLE: queriesTable.tableName,
      MANDI_TABLE: mandiTable.tableName,
      WEATHER_TABLE: weatherTable.tableName,
      SCHEMES_TABLE: schemesTable.tableName,
      DATA_BUCKET: dataBucket.bucketName,
      STAGE: CONFIG.stage,
    };

    // ─── Helper: create a Lambda function ─────────────────────────────

    const lambdaDir = path.join(__dirname, "..", "lambda");

    const createLambda = (
      id: string,
      entry: string,
      opts?: { timeout?: number; memory?: number; env?: Record<string, string> }
    ) => {
      return new lambda.Function(this, id, {
        functionName: `buaip-${id.toLowerCase()}-${CONFIG.stage}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(path.join(lambdaDir, entry), {
          bundling: {
            image: lambda.Runtime.NODEJS_20_X.bundlingImage,
            command: [
              "bash", "-c",
              [
                "npx esbuild index.ts --bundle --platform=node --target=node20 --outfile=/asset-output/index.js --external:@aws-sdk/*",
              ].join(" && "),
            ],
            environment: { NODE_ENV: "production" },
          },
        }),
        role: lambdaRole,
        timeout: cdk.Duration.seconds(opts?.timeout || 30),
        memorySize: opts?.memory || 512,
        environment: { ...commonEnv, ...opts?.env },
        logRetention: logs.RetentionDays.ONE_MONTH,
        tracing: lambda.Tracing.ACTIVE,
      });
    };

    // ─── Engine Lambdas ───────────────────────────────────────────────

    const annadataFn = createLambda("Annadata", "engines/annadata.ts", {
      timeout: 60,
      memory: 1024,
    });

    const schemeEligibilityFn = createLambda(
      "SchemeEligibility",
      "engines/scheme-eligibility.ts",
      { timeout: 60, memory: 768 }
    );

    const nyayaFn = createLambda("Nyaya", "engines/nyaya.ts", {
      timeout: 45,
    });

    const udyogFn = createLambda("Udyog", "engines/udyog.ts", {
      timeout: 45,
    });

    const pathaiFn = createLambda("PathAI", "engines/pathai.ts", {
      timeout: 45,
      memory: 768,
    });

    const atithiFn = createLambda("Atithi", "engines/atithi.ts", {
      timeout: 45,
    });

    const globalsellerFn = createLambda(
      "GlobalSeller",
      "engines/globalseller.ts",
      { timeout: 60, memory: 768 }
    );

    const unifiedAiFn = createLambda("UnifiedAI", "engines/unified-ai.ts", {
      timeout: 60,
      memory: 1024,
    });

    const translateFn = createLambda("Translate", "engines/translate.ts", {
      timeout: 15,
      memory: 256,
    });

    const ttsFn = createLambda("TextToSpeech", "engines/text-to-speech.ts", {
      timeout: 15,
      memory: 256,
    });

    // ─── Data Fetcher Lambdas ─────────────────────────────────────────

    const mandiPriceFetcherFn = createLambda(
      "MandiPriceFetcher",
      "data-fetchers/mandi-price-fetcher.ts",
      {
        timeout: 300, // 5 minutes — fetches many crop×state combos
        memory: 512,
        env: { DATA_GOV_IN_API_KEY: CONFIG.dataGovApiKey },
      }
    );

    const weatherFetcherFn = createLambda(
      "WeatherFetcher",
      "data-fetchers/weather-fetcher.ts",
      {
        timeout: 180,
        memory: 256,
        env: { OPENWEATHER_API_KEY: CONFIG.openWeatherApiKey },
      }
    );

    const schemeSeederFn = createLambda(
      "SchemeSeeder",
      "data-fetchers/scheme-seeder.ts",
      { timeout: 120, memory: 256 }
    );

    // ─── EventBridge Schedules ────────────────────────────────────────

    new events.Rule(this, "MandiPriceSchedule", {
      schedule: events.Schedule.expression(CONFIG.mandiPriceFetchRate),
      targets: [new targets.LambdaFunction(mandiPriceFetcherFn)],
    });

    new events.Rule(this, "WeatherSchedule", {
      schedule: events.Schedule.expression(CONFIG.weatherFetchRate),
      targets: [new targets.LambdaFunction(weatherFetcherFn)],
    });

    new events.Rule(this, "SchemeRefreshSchedule", {
      schedule: events.Schedule.expression(CONFIG.schemeRefreshRate),
      targets: [new targets.LambdaFunction(schemeSeederFn)],
    });

    // ─── API Gateway ──────────────────────────────────────────────────

    const api = new apigateway.RestApi(this, "BuaipApi", {
      restApiName: "BUAIP API",
      description: "Bharat Unified AI Platform API",
      deployOptions: {
        stageName: CONFIG.stage,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Amz-Date",
          "X-Api-Key",
        ],
      },
    });

    // API Key + Usage Plan (for rate limiting)
    const apiKey = api.addApiKey("BuaipApiKey", {
      apiKeyName: `buaip-key-${CONFIG.stage}`,
    });

    const usagePlan = api.addUsagePlan("BuaipUsagePlan", {
      name: `buaip-usage-${CONFIG.stage}`,
      throttle: { rateLimit: 50, burstLimit: 100 },
      quota: { limit: 10000, period: apigateway.Period.DAY },
    });
    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({ stage: api.deploymentStage });

    // Helper: add POST route
    const addRoute = (
      pathStr: string,
      fn: lambda.Function,
      requireApiKey = false
    ) => {
      const resource = api.root.resourceForPath(pathStr);
      resource.addMethod(
        "POST",
        new apigateway.LambdaIntegration(fn, { proxy: true }),
        { apiKeyRequired: requireApiKey }
      );
    };

    // Engine routes
    addRoute("/api/annadata-ai", annadataFn);
    addRoute("/api/scheme-eligibility", schemeEligibilityFn);
    addRoute("/api/nyaya-ai", nyayaFn);
    addRoute("/api/udyog-ai", udyogFn);
    addRoute("/api/pathai", pathaiFn);
    addRoute("/api/atithi-ai", atithiFn);
    addRoute("/api/globalseller-engine", globalsellerFn);
    addRoute("/api/unified-ai", unifiedAiFn);
    addRoute("/api/translate", translateFn);
    addRoute("/api/text-to-speech", ttsFn);

    // Legacy engine router (single Lambda for /engine/{name})
    const engineResource = api.root.resourceForPath("/engine/{engineName}");
    engineResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(unifiedAiFn, { proxy: true })
    );

    // Admin routes (require API key)
    addRoute("/api/seed-schemes", schemeSeederFn, true);

    // ─── CloudFront: Add API Gateway as behavior ──────────────────────
    distribution.addBehavior(
      "/api/*",
      new cfOrigins.RestApiOrigin(api),
      {
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      }
    );

    // ─── Outputs ──────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    });

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "CloudFront Distribution URL",
    });

    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: frontendBucket.bucketName,
      description: "S3 bucket for Next.js static export",
    });

    new cdk.CfnOutput(this, "DataBucketName", {
      value: dataBucket.bucketName,
      description: "S3 bucket for datasets",
    });

    new cdk.CfnOutput(this, "ApiKeyId", {
      value: apiKey.keyId,
      description: "API Key ID (retrieve value from AWS Console)",
    });
  }
}

// ─── App ────────────────────────────────────────────────────────────────────

const app = new cdk.App();
new BuaipStack(app, "BuaipStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: CONFIG.region,
  },
  description: "Bharat Unified AI Platform — Complete serverless backend",
});
