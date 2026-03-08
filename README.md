BUAIP — Bharat Unified AI Platform
India's first unified, multi-language AI assistant that delivers government scheme matching, agriculture intelligence, legal guidance, career counseling, entrepreneurship support, export assistance, travel planning and expat services — all through a single chat interface.

Built with Next.js AWS Serverless AI Engine Languages Government Schemes License

Table of Contents
Problem Statement
Solution Overview
Architecture
Technology Stack
AWS Service Justifications
AI Engine Deep Dive
Real-Time Data Pipeline
Multi-Language System
Frontend
API Reference
Infrastructure as Code
Deployment Guide
Cost Analysis
Project Metrics
Repository Structure
Contributing
1. Problem Statement
India has 700+ central and state government schemes spanning welfare, agriculture, education, health, business and housing. Yet the average citizen faces critical barriers:

Barrier	Impact
Information fragmentation	Schemes are scattered across 50+ ministry websites, each with different formats, languages and eligibility criteria.
Language exclusion	65% of Indians do not speak English. Most government portals are English-only.
Digital illiteracy	400M+ Indians lack the skills to navigate complex government websites, fill online forms or track applications.
No unified access	A farmer needing crop prices, weather, subsidies and legal advice must visit 4+ different platforms.
Middleman exploitation	Lack of direct access drives citizens to touts and intermediaries who charge fees for free government services.
BUAIP eliminates every one of these barriers by putting 10 domain-expert AI engines behind a single WhatsApp-style chat window that speaks 16 languages.

2. Solution Overview
BUAIP is a conversational AI platform where the user simply types or speaks a question in any of 16 supported languages. The system:

Detects intent — Classifies the query into one of 10 domains (agriculture, legal, schemes, career, business, export, travel, translation, voice, general).
Routes to the right engine — Each domain has a purpose-built Lambda with a domain-specific system prompt, knowledge base and data sources.
Fetches real data — Live mandi prices from data.gov.in, weather from OpenWeatherMap, 70+ government scheme eligibility rules from DynamoDB.
Generates an expert response — Claude 3.5 Sonnet produces a detailed, contextual, actionable response grounded in real data.
Translates & speaks — Response is translated to the user's language via AWS Translate and optionally synthesized to audio via Amazon Polly.
What makes BUAIP different
Feature	Traditional Portal	BUAIP
Access method	Navigate 10+ websites	Single chat message
Language	English only	16 languages (11 Indian)
Intelligence	Static FAQ pages	Context-aware AI with real-time data
Voice support	None	Full TTS in Indian languages
Scheme matching	Manual checkbox filters	AI profiling with eligibility scores
Cross-domain	Separate silos	One conversation, all domains
3. Architecture
3.1 High-Level Architecture
┌──────────────────────────────────────────────────────────────────────┐
│                          USER (Browser / Mobile)                     │
│                     Types or speaks in any of 16 languages           │
└─────────────────────────────────┬────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      AMAZON CLOUDFRONT (CDN)                         │
│              Global edge caching · HTTPS termination                 │
│     ┌───────────────────────┬────────────────────────┐              │
│     │   Static Assets       │     /api/* Requests     │              │
│     │   (S3 Origin)         │     (API GW Origin)     │              │
│     └───────────┬───────────┴────────────┬───────────┘              │
└─────────────────┼────────────────────────┼───────────────────────────┘
                  │                        │
                  ▼                        ▼
┌─────────────────────────┐  ┌─────────────────────────────────────────┐
│    S3 FRONTEND BUCKET   │  │        AMAZON API GATEWAY               │
│    (Next.js Static)     │  │   Rate: 100 req/s · Burst: 200         │
│                         │  │   Daily quota: 10,000 requests          │
└─────────────────────────┘  │   CORS: enabled · API Key: admin       │
                             └──────────────┬──────────────────────────┘
                                            │
                    ┌───────────────────────┬┴──────────────────────┐
                    ▼                       ▼                       ▼
         ┌──────────────────┐  ┌────────────────────┐  ┌───────────────────┐
         │  ENGINE LAMBDAS  │  │  UTILITY LAMBDAS   │  │  DATA FETCHERS    │
         │  (10 functions)  │  │  (Translate, TTS)  │  │  (3 scheduled)    │
         └────────┬─────────┘  └────────┬───────────┘  └────────┬──────────┘
                  │                     │                        │
     ┌────────────┼────────────┐       │              ┌──────────┼──────────┐
     ▼            ▼            ▼       ▼              ▼          ▼          ▼
┌──────────┐┌──────────┐┌──────────┐┌────────┐ ┌──────────┐┌──────────┐┌────────┐
│ BEDROCK  ││ DYNAMODB ││  POLLY   ││TRANSLAT│ │data.gov.in│OpenWeather│ S3 CSV │
│Claude 3.5││ 4 tables ││   TTS    ││   E    │ │   API    ││Map API   │datasets│
└──────────┘└──────────┘└──────────┘└────────┘ └──────────┘└──────────┘└────────┘
3.2 Request Flow (Example: Farmer asks about wheat prices in Hindi)
1. User types: "गेहूं का भाव क्या चल रहा है पंजाब में?"
   │
2. CloudFront → API Gateway → Unified-AI Lambda
   │
3. Unified-AI detects language (hi) & intent (agriculture/mandi_price)
   │
4. Routes to Annadata Lambda with translated query
   │
5. Annadata Lambda:
   ├── Queries DynamoDB BUAIP_MandiPrices (crop=Wheat, state=Punjab)
   ├── Queries DynamoDB BUAIP_Weather (state=Punjab)
   ├── Builds system prompt with real data context
   └── Calls Bedrock Claude 3.5 Sonnet
   │
6. Claude generates response with real prices, market names, advisory
   │
7. Response → AWS Translate (en → hi) → Amazon Polly (hi-IN voice)
   │
8. User receives: Hindi text + audio playback
   Total latency: ~2-4 seconds
3.3 Data Flow: Scheduled Fetchers
┌──────────────────────────────────────────────────────────────┐
│                    AMAZON EVENTBRIDGE                         │
│                                                              │
│   ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│   │ Every 6 hours   │  │ Every 6 hours│  │ Every 7 days │  │
│   │ Mandi Prices    │  │ Weather      │  │ Schemes      │  │
│   └────────┬────────┘  └──────┬───────┘  └──────┬───────┘  │
└────────────┼──────────────────┼──────────────────┼───────────┘
             ▼                  ▼                  ▼
   ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
   │ MandiPriceFetcher│ │WeatherFetcher│ │  SchemeSeeder    │
   │    Lambda        │ │   Lambda     │ │    Lambda        │
   └────────┬─────────┘ └──────┬───────┘ └────────┬─────────┘
            │                  │                   │
            ▼                  ▼                   ▼
   ┌──────────────┐    ┌────────────┐      ┌────────────┐
   │ data.gov.in  │    │OpenWeather │      │  S3 Bucket │
   │ REST API     │    │  Map API   │      │  (CSV)     │
   │ 15 crops     │    │ 28 cities  │      │ 70+ schemes│
   │ 16 states    │    │            │      │            │
   └──────┬───────┘    └─────┬──────┘      └─────┬──────┘
          │                  │                    │
          ▼                  ▼                    ▼
   ┌─────────────────────────────────────────────────────┐
   │                  AMAZON DYNAMODB                     │
   │                                                     │
   │  BUAIP_MandiPrices  │ BUAIP_Weather │ BUAIP_Schemes │
   │  240 records/day    │ 28 records/6h │ 70+ schemes   │
   │  TTL: 30 days       │ TTL: 6 hours  │ No expiry     │
   └─────────────────────────────────────────────────────┘
4. Technology Stack
4.1 Frontend
Technology	Version	Role
Next.js	14.x	React meta-framework (SSR, API routes, file-based routing)
React	18.3.1	UI component library
TypeScript	5.9	Type-safe development
Tailwind CSS	3.4	Utility-first styling
Framer Motion	—	Animations and transitions
Three.js	—	3D background scene on landing page
Web Speech API	Browser	Voice input (speech-to-text)
4.2 Backend (AWS Serverless)
Technology	Version	Role
AWS Lambda	Node.js 20	Serverless compute for all engines
Amazon Bedrock	—	Claude 3.5 Sonnet inference
Amazon DynamoDB	—	NoSQL data storage (4 tables)
Amazon S3	—	Static hosting + dataset storage
Amazon CloudFront	—	Global CDN with edge caching
Amazon API Gateway	REST	HTTP routing with rate limiting
Amazon Polly	Neural	Text-to-speech synthesis
Amazon Translate	—	Real-time text translation
Amazon Comprehend	—	Language detection
Amazon EventBridge	—	Scheduled data fetching
AWS CDK	2.130+	Infrastructure as Code
4.3 External Data Sources
Source	Data	Frequency
data.gov.in	Mandi crop prices (15 crops × 16 states)	Every 6 hours
OpenWeatherMap	Weather for 28 agricultural districts	Every 6 hours
S3 CSV dataset	70+ government scheme definitions	Weekly refresh
5. AWS Service Justifications
Every AWS service in BUAIP was chosen after evaluating alternatives. Below is a comparative analysis explaining why each service was selected over competing options.

5.1 Amazon Bedrock (AI Inference)
Chosen for: AI response generation across all 10 engines.

Criteria	Amazon Bedrock	OpenAI API	Self-hosted LLM	Google Vertex AI
Data residency	ap-south-1 (Mumbai) — data stays in India	US servers only	Anywhere, but needs GPU infra	Limited India presence
Model access	Claude 3.5 Sonnet, Llama, Titan	GPT-4, GPT-3.5	Open-source models	Gemini, PaLM
IAM integration	Native — Lambda role, no API keys in code	API key management	Manual auth	Google IAM (different ecosystem)
Latency	<2s from Mumbai	3-5s cross-Pacific latency	Depends on hardware	2-4s
Compliance	SOC2, ISO27001, HIPAA	SOC2	Self-managed	SOC2
Cost model	Pay per token, no commitment	Pay per token	GPU rental ($2-8/hr)	Pay per token
Serverless	Yes — no infrastructure	Yes	No — needs EC2/EKS	Yes
Why Bedrock wins: Data stays in India (legal compliance for government data), zero infrastructure management, native IAM integration with Lambda (no API key rotation headaches), and Claude 3.5 Sonnet has the strongest reasoning for complex Indian regulatory/legal queries.

5.2 Amazon DynamoDB (Data Storage)
Chosen for: Storing mandi prices, weather data, government schemes and query logs.

Criteria	DynamoDB	Amazon RDS (PostgreSQL)	Amazon Aurora	MongoDB Atlas
Pricing model	Pay-per-request (₹0 when idle)	Per-hour (₹2,000+/month minimum)	Per-hour (₹5,000+/month)	Per-hour
Scaling	Auto — 0 to millions of requests	Manual — resize instance	Auto — but costly	Auto
Cold start impact	None — serverless	Connection pool needed	Connection pool needed	Connection pooling
Schema flexibility	Schemaless — easy to evolve	Rigid schema, migrations	Rigid schema	Schemaless
TTL support	Native — auto-delete expired data	Manual cron jobs	Manual cron jobs	Native
Lambda integration	Native SDK, no connection limits	Max 6 connections per Lambda	Connection limits	Connection limits
Latency	Single-digit millisecond	5-20ms	5-15ms	10-30ms
Backup	Point-in-time recovery (PITR)	Automated snapshots	Automated snapshots	Atlas backup
Why DynamoDB wins: The data access patterns in BUAIP are simple key-value lookups (get price by crop+state, get weather by state+district, get schemes by domain). DynamoDB's pay-per-request pricing means zero cost when the system is idle — critical for a project that may have variable traffic. No connection pool issues with Lambda. Native TTL auto-deletes stale mandi prices and weather data without any cron job.

Table Design:

Table	Partition Key	Sort Key	TTL	Access Pattern
BUAIP_MandiPrices	cropState (e.g., "Rice#Punjab")	date	30 days	Get latest price for crop in state
BUAIP_Weather	stateDistrict (e.g., "Punjab#Ludhiana")	fetchedAt	6 hours	Get current weather for district
BUAIP_Schemes	domain (e.g., "agriculture")	schemeId	None	List all schemes in domain
BUAIP_Queries	userId	timestamp	90 days	Query history for analytics
5.3 AWS Lambda (Compute)
Chosen for: Running all 10 AI engines, 2 utility handlers and 3 data fetchers.

Criteria	Lambda	EC2	ECS Fargate	App Runner
Cost at low traffic	₹0 (free tier: 1M requests)	₹2,000+/month (t3.micro)	₹3,000+/month	₹2,500+/month
Cost at scale	Linear per request	Fixed regardless of traffic	Per-task	Per-request
Scaling	0 → 1000 instances in seconds	Manual / ASG (minutes)	Task-based (30s)	Auto
Cold start	<1s (Node.js 20)	None (always running)	5-30s	5-15s
Maintenance	Zero — AWS manages OS, runtime	Patch OS, security updates	Patch containers	Low
Max execution	15 minutes	Unlimited	Unlimited	Unlimited
Concurrency	1000 default (adjustable)	Instance-limited	Task-limited	Auto
Why Lambda wins: BUAIP's traffic pattern is bursty and unpredictable — a few hundred queries during the day, near-zero at night. Lambda's per-invocation pricing means we pay nothing during idle hours. Cold starts under 1 second on Node.js 20 are acceptable for a chat interface. Each engine runs independently, so a failure in Annadata doesn't affect Nyaya. The max 15-minute timeout is more than enough (our longest Lambda is 5 minutes for the mandi price fetcher).

Lambda Configuration:

Function	Timeout	Memory	Purpose
Unified-AI	60s	1024 MB	Central router + AI reasoning
Annadata	60s	1024 MB	Farmer advisory (complex data joins)
Scheme Eligibility	60s	768 MB	Profile matching + AI ranking
PathAI	45s	768 MB	Career guidance (5-phase conversation)
GlobalSeller	60s	768 MB	Export intelligence
Nyaya	45s	512 MB	Legal guidance
Udyog	45s	512 MB	Entrepreneurship
Atithi	45s	512 MB	Travel planning
Translate	15s	256 MB	Text translation
Text-to-Speech	15s	256 MB	Polly TTS
Mandi Fetcher	300s	512 MB	Fetch prices from data.gov.in
Weather Fetcher	180s	256 MB	Fetch weather from OpenWeatherMap
Scheme Seeder	120s	256 MB	Parse CSV, populate DynamoDB
5.4 Amazon API Gateway (HTTP Routing)
Chosen for: Routing HTTP requests to Lambda functions with rate limiting and CORS.

Criteria	API Gateway (REST)	ALB (Application Load Balancer)	API Gateway (HTTP)	Direct Lambda URL
Rate limiting	Built-in (100/s, burst 200)	None built-in	Basic	None
API key management	Built-in	None	None	None
Request validation	JSON schema validation	None	None	None
CORS	Built-in configuration	Manual headers	Built-in	Manual headers
Cost	$3.50/million requests	$16+/month fixed	$1/million requests	Free
WAF integration	Yes	Yes	No	No
Usage plans	Quotas per API key	None	None	None
Why API Gateway (REST) wins: We need rate limiting to prevent abuse (100 req/s), API key authentication for admin endpoints (scheme seeding), and built-in CORS handling. The REST variant was chosen over HTTP API because we need usage plans and request quotas (10,000 daily) to control costs during early deployment. The slightly higher per-request cost is offset by the security and management features.

5.5 Amazon S3 + CloudFront (Frontend Hosting)
Chosen for: Hosting the Next.js static export and serving it globally.

Criteria	S3 + CloudFront	Vercel	AWS Amplify	EC2 + Nginx
Cost	~$1-5/month (CDN + storage)	Free tier limited, then $20+/month	$0-12/month	$15+/month
Global CDN	400+ edge locations	100+ edge locations	CloudFront	Manual setup
Custom domain	Yes (Route 53 or external)	Yes	Yes	Yes
SSL/TLS	Free (ACM certificate)	Free	Free	Free (Let's Encrypt)
Backend integration	API Gateway origin routing	Serverless functions	AppSync / Lambda	Same server
Cache control	Full control (behaviors, TTLs)	Automatic	Automatic	Manual
Lock-in	Low — standard S3 + CDN	Vercel-specific	AWS-specific	None
Why S3 + CloudFront wins: Complete control over caching behavior, edge routing rules, and origin failover. CloudFront's /api/* path-based routing sends API requests directly to API Gateway while serving static assets from S3 — all from a single domain (no CORS issues between frontend and backend). Cost is minimal: S3 storage for a Next.js app is under $0.50/month, and CloudFront's free tier includes 1TB/month transfer.

5.6 Amazon Polly (Text-to-Speech)
Chosen for: Converting AI responses to audio in Indian languages.

Criteria	Amazon Polly	Google Cloud TTS	Azure Speech	ElevenLabs
Indian voice quality	Kajal (neural, natural)	WaveNet Indian voices	Indian neural voices	No Indian voices
Hindi quality	Excellent — native neural	Good	Good	Unavailable
IAM integration	Native Lambda role	Service account JSON	Azure AD token	API key
Latency	<500ms (same region)	500-1000ms	500-1000ms	1-2s
Cost	$4/million chars (neural)	$16/million chars (WaveNet)	$16/million chars	$330/million chars
SSML support	Yes	Yes	Yes	Limited
Streaming	Yes	Yes	Yes	Yes
Why Polly wins: Kajal is Amazon's neural Indian voice that handles Hindi, English-Indian and transliterated text naturally. It costs 4x less than Google/Azure alternatives. Native IAM integration means no API key management — the Lambda execution role grants access automatically. Same-region deployment (ap-south-1) minimizes latency.

5.7 Amazon Translate (Translation)
Chosen for: Real-time translation of user queries and AI responses between 16 languages.

Criteria	Amazon Translate	Google Cloud Translate	DeepL	Azure Translator
Indian language support	11 Indian languages	10 Indian languages	0 Indian languages	8 Indian languages
Telugu/Tamil/Kannada	Yes	Yes	No	Partial
IAM integration	Native	Service account	API key	Azure AD
Cost	$15/million chars	$20/million chars	$25/million chars	$10/million chars
Auto-detection	Yes	Yes	Yes	Yes
Custom terminology	Yes	Glossary support	Glossary	Custom translator
Why Translate wins: Supports all 11 Indian languages we need (including Telugu, Tamil, Kannada, Malayalam, Gujarati, Punjabi). DeepL was eliminated immediately — zero Indian language support. Native IAM integration eliminates credential management. Combined with Comprehend for language detection, it provides a seamless pipeline.

5.8 Amazon EventBridge (Scheduling)
Chosen for: Triggering data fetcher Lambdas on schedule.

Criteria	EventBridge	CloudWatch Events	Step Functions	Cron on EC2
Cost	Free for scheduled rules	Free	$25/million state transitions	EC2 cost ($15+/month)
Reliability	99.99% SLA	99.99% SLA	99.99% SLA	Single point of failure
Monitoring	CloudWatch metrics	CloudWatch metrics	Built-in execution history	Manual logging
Maintenance	Zero	Zero	Zero	OS patching, cron configuration
Event filtering	Advanced rules	Basic	State machine logic	None
Why EventBridge wins: Three simple schedules (every 6 hours for mandi/weather, weekly for schemes) don't justify Step Functions' workflow engine. EventBridge rules are free, require zero maintenance, and integrate directly with Lambda targets. CloudWatch Events would also work (it's the same underlying service), but EventBridge is the modern recommended replacement with better monitoring.

5.9 Amazon Comprehend (Language Detection)
Chosen for: Detecting the user's input language to route translation correctly.

Criteria	Amazon Comprehend	Client-side detection	Manual regex	Google NLP
Accuracy	99%+ for Indian scripts	80-90% (browser APIs)	50-60%	98%+
Script detection	Devanagari, Telugu, Tamil, etc.	Limited	Unicode ranges only	Good
IAM integration	Native	N/A	N/A	Service account
Latency overhead	<100ms	0ms	0ms	200ms+
Cost	$0.0001/request	Free	Free	$0.001/request
Why Comprehend wins: Accurately distinguishes between Hindi, Marathi, Sanskrit (all Devanagari script) and between similar scripts. Client-side detection was considered but fails on short inputs and transliterated text (e.g., "mujhe batao" in Latin script → should detect as Hindi). The minimal cost ($0.0001/request) is negligible.

6. AI Engine Deep Dive
BUAIP has 10 specialized AI engines, each a standalone Lambda function with domain-specific knowledge, system prompts and data integrations.

6.1 Unified-AI (Super Router)
The central brain that receives every user message. It classifies intent and routes to the correct specialized engine.

How routing works:

User msg → Language detection → Intent classification → Engine selection → Response
Intent is classified using a combination of:

Keyword patterns (regex matching in multiple languages)
Session context (if the user was already talking about farming, continue with Annadata)
Explicit capability (if the frontend sends capability: "annadata")
Pattern	Engine	Example Triggers
farm|crop|mandi|harvest|कृषि|ధర	Annadata	"What's the wheat price?", "मेरी फसल में कीड़ा लगा है"
law|legal|court|FIR|कानून|చట్టం	Nyaya	"How to file an FIR?", "my landlord won't return deposit"
business|loan|startup|MUDRA|उद्यम	Udyog	"How to get MUDRA loan?", "GST registration process"
career|college|exam|NEET|करियर	PathAI	"Best career after 12th science?", "IIT preparation"
travel|hotel|temple|destination	Atithi	"Plan a trip to Kerala", "best time to visit Ladakh"
export|amazon|customs|IEC	GlobalSeller	"How to sell on Amazon USA?", "IEC code process"
scheme|yojana|subsidy|pension|योजना	Scheme Eligibility	"Am I eligible for PM-KISAN?", "widow pension scheme"
Session management:

Each conversation gets a session ID (1-hour TTL)
Last 6 messages are kept as context for multi-turn conversations
User profile is accumulated across turns (age, state, occupation detected from conversation)
6.2 Annadata — Agriculture Intelligence Engine
The most data-rich engine. Serves India's 150M+ farming households with actionable intelligence.

13 Advisory Panels:

Panel	What It Does	Data Source
mandi_price	Real-time crop prices with market names, min/max/modal rates, sell/hold advice	data.gov.in → DynamoDB
weather_advisor	7-day forecast with farming impact analysis, irrigation advice, pest risk	OpenWeatherMap → DynamoDB
scheme	Farmer-specific schemes (PM-KISAN, PM-FASAL, KCC), eligibility and application steps	DynamoDB schemes table
crop_advisor	Planting calendar, crop rotation, inter-cropping suggestions, seed variety selection	Claude knowledge
disease_doctor	Plant disease identification, organic/chemical treatment, prevention measures	Claude knowledge
seeds_fertilizer	Seed variety comparison, fertilizer dose calculation, soil amendment recommendations	Claude knowledge
soil_health	Soil testing guidance, pH correction, micronutrient deficiency identification	Claude knowledge
irrigation_planner	Water management, drip/sprinkler comparison, rainwater harvesting	Claude knowledge
loan_insurance	KCC (Kisan Credit Card), PM-FASAL Bima Yojana, crop insurance claim process	Claude knowledge
smart_selling	Best time to sell, storage advice, FPO/cooperative selling, e-NAM registration	Claude + mandi data
market	Market trends, seasonal patterns, price forecasting	Claude + mandi data
weather	Seasonal outlook, monsoon predictions, frost/heatwave warnings	Claude + weather data
general	Any agriculture question not fitting above categories	Claude knowledge
Data coverage:

15 crops: Rice, Wheat, Cotton, Soyabean, Maize, Sugarcane, Potato, Onion, Tomato, Groundnut, Tur, Chana, Mustard, Jowar, Bajra
16 states: Punjab, Haryana, UP, MP, Maharashtra, Rajasthan, Gujarat, Karnataka, AP, Telangana, TN, WB, Bihar, Odisha, Assam, Kerala
240 price points updated every 6 hours
6.3 Scheme Eligibility — Government Scheme Matching
Matches citizens to 70+ government schemes across 7 domains using a two-stage algorithm:

Stage 1 — Rule-based pre-filtering (hard constraints):

For each scheme:
  IF scheme.minAge && user.age < scheme.minAge → SKIP
  IF scheme.maxAge && user.age > scheme.maxAge → SKIP
  IF scheme.maxIncome && user.income > scheme.maxIncome → SKIP
  IF scheme.requiredCategory && user.category NOT IN scheme.categories → SKIP
  IF scheme.requiredGender && user.gender != scheme.gender → SKIP
  IF scheme.requiredState && user.state NOT IN scheme.states → SKIP
  ELSE → PASS to Stage 2
Stage 2 — AI-enhanced ranking (Claude analyzes each passed scheme):

For each passed scheme:
  Claude evaluates:
  - How well does the user's full profile match this scheme?
  - What specific benefits apply?
  - What documents will they need?
  → Assigns eligibility score (0-100%)
  → Generates personalized explanation
Citizen profile (20+ fields):

Category	Fields
Personal	age, gender, state, district, areaType (rural/urban)
Social	socialCategory (SC/ST/OBC/General/EWS), BPL status
Occupation	farmer, student, entrepreneur, worker, unemployed
Financial	annualIncome, landOwnership, landArea
Conditions	disability, widow, singleParent, veteran, artisan
Agriculture	farmerType, primaryCrop, loanStatus, irrigationAccess, sellingChannel
Output per scheme:

{
  "schemeName": "PM-KISAN",
  "isEligible": true,
  "eligibilityScore": 92,
  "matchedCriteria": ["Small farmer", "Land < 2 hectares", "Age > 18"],
  "unmatchedCriteria": [],
  "benefits": ["₹6,000/year in 3 installments directly to bank account"],
  "applicationLink": "https://pmkisan.gov.in",
  "documentsNeeded": ["Aadhaar card", "Land records", "Bank passbook"],
  "explanation": "You are a small farmer in Punjab with less than 2 hectares..."
}
6.4 Nyaya — Legal Rights Engine
Covers 8 legal categories with specific section citations, form numbers and step-by-step processes.

Category	Key Laws Covered	Common Queries
Labor	Payment of Wages Act, Minimum Wages Act, Industrial Disputes Act, EPF Act, ESI Act, Gratuity Act	Salary not paid, PF withdrawal, wrongful termination
Consumer	Consumer Protection Act 2019, E-Commerce Rules, CCPA	Defective product refund, online fraud, warranty claim
Housing	State Rent Control Acts, RERA 2016, Transfer of Property Act	Landlord eviction, security deposit, builder delay
Family	Hindu Marriage Act, Special Marriage Act, Domestic Violence Act, Succession Act	Divorce procedure, child custody, maintenance
Property	Registration Act, Transfer of Property Act, Revenue Code	Land dispute, mutation process, encroachment
RTI	Right to Information Act 2005	How to file RTI (₹10 fee, 30-day response deadline)
Cyber	IT Act 2000 (Sections 43, 66, 67), Data Protection Bill	Online fraud, identity theft, social media harassment
Criminal	CrPC/BNSS, IPC/BNS	FIR filing, bail process, Zero FIR concept
Every response includes:

Specific law sections and act names
Government form numbers and websites
Step-by-step process with timelines
Free legal aid information (NALSA / District Legal Services Authority)
Limitation periods (how long you have to file)
Evidence checklists
6.5 PathAI — Career Guidance Engine
A 5-phase conversational career counselor, especially designed for first-generation learners.

Phase	What Happens	Output
1. Intake	Collects profile: name, age, class, stream, subjects, interests, family background, location, financial constraints. Asks 2-3 questions per turn.	Structured student profile
2. Matching	Suggests 5-8 careers with fitment scores (0-100). Traditional (Engineering, Medicine, Law, CA, IAS), emerging (Data Science, UX, Product Management), skill-based (Animation, Culinary, Hospitality), government (UPSC, SSC, Banking, Railways).	Career cards with scores
3. Deep Dive	For the selected career: day-in-the-life, education pathway (after 10th/12th/graduation), top colleges with fees and entrance exams, salary progression (entry → 5yr → 10yr), skills to develop.	Detailed career profile
4. Roadmap	Personalized action plan: immediate (this month), short-term (3-6 months), medium-term (1-2 years), long-term (3-5 years). Specific exam dates, application deadlines.	Timeline with milestones
5. First-Gen	Extra guidance for first-generation students: simple college application walkthroughs, free resources (SWAYAM, NPTEL, Khan Academy), government scholarships (NSP, Post-Matric), fee waivers at IITs/NITs, education loans (Vidya Lakshmi), hostel guidance.	Support resources
6.6 Udyog — Entrepreneurship Engine
Serves micro-entrepreneurs, street vendors, home businesses and small startups with practical, accessible advice.

Module	Coverage
Credit	MUDRA loans (Shishu ≤₹50K, Kishore ≤₹5L, Tarun ≤₹10L — no collateral), Stand Up India (₹10L–₹1Cr for SC/ST/Women), PMEGP (15-35% subsidy up to ₹50L)
Formalization	Udyam Registration (free, udyamregistration.gov.in), GST (₹20L threshold services, ₹40L goods), FSSAI (₹100 basic registration), Trade License
Digital	UPI business acceptance, Google My Business (free), GeM registration (government procurement), ONDC
Growth	Market expansion, first employee hiring (ESIC/EPF thresholds), product diversification, franchising
Schemes	PMEGP, MUDRA, Stand Up India, NSIC, MSME Samadhan (delayed payment portal), state-specific schemes
General	Street vendor support (PM SVANidhi), home business formalization, startup India registration
6.7 Atithi — Travel & Tourism Engine
Comprehensive travel guide covering domestic Indian tourism.

Covers: Destination recommendations with best seasons, day-by-day itineraries with time estimates, budget breakdowns (accommodation, food, transport, activities), safety tips (8 areas: scams, health, transport, women safety, monsoon, wildlife, food hygiene, emergency), cultural etiquette (8 areas: temples, greetings, dress code, food customs, photography, bargaining, tipping, local customs), transport (IRCTC, buses, flights, local apps), hidden gems, accessibility information.

Government Helpline: 1800-11-1363 (Incredible India)

6.8 GlobalSeller — Export Intelligence Engine
Cross-border e-commerce guidance for Indian sellers entering global marketplaces.

Mode	Coverage
Marketplace	Amazon Global Selling, eBay, Etsy, Shopify — registration, listing, seller fees, FBA vs self-fulfill
Supply Chain	Sourcing, MOQ negotiation, quality control, supplier directories
Compliance	IEC code (DGFT), GST for exports (0% rate / refund mechanism), FEMA, product certifications (CE, FDA, BIS)
Pricing	Landed cost calculation, currency hedging, competitive pricing, margin optimization
Logistics	India Post EMS, DHL eCommerce, FedEx, Amazon FBA, bonded warehouse
Marketing	Cross-cultural branding, Amazon SEO (A9 algorithm), international Google Ads
General	Top export products (Textiles, Gems, Pharma, IT, Spices, Handicrafts), RoDTEP, Districts as Export Hubs
6.9 Translate & Text-to-Speech (Utility Engines)
Engine	Purpose	Lambda Config
Translate	Translate any text between 20+ languages using AWS Translate	15s timeout, 256 MB
Text-to-Speech	Convert text to MP3 audio using Amazon Polly (Kajal neural voice)	15s timeout, 256 MB
7. Real-Time Data Pipeline
7.1 Mandi Price Fetcher
Source: data.gov.in REST API (Government of India Open Data Platform)

Schedule: Every 6 hours via EventBridge
Scope:    15 crops × 16 states = 240 price points per run
API:      https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
Auth:     API key (free registration at data.gov.in)
Crops tracked: Rice, Wheat, Cotton, Soyabean, Maize, Sugarcane, Potato, Onion, Tomato, Groundnut, Tur (Arhar), Chana (Gram), Mustard, Jowar (Sorghum), Bajra (Pearl Millet)

States covered: Punjab, Haryana, Uttar Pradesh, Madhya Pradesh, Maharashtra, Rajasthan, Gujarat, Karnataka, Andhra Pradesh, Telangana, Tamil Nadu, West Bengal, Bihar, Odisha, Assam, Kerala

Data stored per record:

{
  "cropState": "Wheat#Punjab",
  "date": "2026-03-08",
  "crop": "Wheat",
  "state": "Punjab",
  "market": "Ludhiana - Jagraon",
  "minPrice": 2125,
  "maxPrice": 2275,
  "modalPrice": 2200,
  "unit": "₹/quintal",
  "ttl": 1711929600
}
7.2 Weather Fetcher
Source: OpenWeatherMap API (Current Weather + 7-day Forecast)

Schedule: Every 6 hours via EventBridge
Scope:    28 agricultural districts across India
APIs:     /weather (current) + /forecast (7-day)
Auth:     API key (free tier: 1000 calls/day)
28 districts with coordinates:

State	Districts
Punjab	Ludhiana, Amritsar
Haryana	Karnal, Hisar
Uttar Pradesh	Lucknow, Varanasi
Madhya Pradesh	Indore, Bhopal
Maharashtra	Pune, Nagpur, Nashik
Rajasthan	Jaipur, Jodhpur
Gujarat	Ahmedabad, Rajkot
Karnataka	Bangalore, Belgaum
Andhra Pradesh	Guntur, Vijayawada
Telangana	Hyderabad, Warangal
Tamil Nadu	Chennai, Coimbatore
West Bengal	Kolkata
Bihar	Patna
Odisha	Bhubaneswar
Assam	Guwahati
Kerala	Kochi
Rainfall risk assessment logic:

Rainfall (mm)	Risk Level	Advisory
> 50mm	High	Heavy rainfall, waterlogging risk. Delay spraying.
20–50mm	Moderate	Good for kharif crops. Ensure drainage.
5–20mm	Low	Light rain expected. Normal operations.
< 5mm	Minimal	Consider irrigation if soil moisture is low.
7.3 Scheme Seeder
Source: CSV file on S3 (s3://buaip-data-{stage}/datasets/india_schemes_7domains.csv)

Schedule:   Weekly via EventBridge
Processing: Parse CSV → extract eligibility rules → categorize → write to DynamoDB
Coverage:   70+ schemes across 7 domains
Domains: Agriculture, Education, Healthcare, Business/MSME, Social Welfare, Housing, Women & Child

8. Multi-Language System
8.1 Supported Languages (16)
#	Language	Code	Script	Population Coverage
1	English	en	Latin	~130M speakers
2	Hindi	hi	Devanagari	~600M speakers
3	Telugu	te	Telugu	~85M speakers
4	Tamil	ta	Tamil	~80M speakers
5	Bengali	bn	Bengali	~270M speakers
6	Marathi	mr	Devanagari	~85M speakers
7	Gujarati	gu	Gujarati	~60M speakers
8	Kannada	kn	Kannada	~45M speakers
9	Malayalam	ml	Malayalam	~38M speakers
10	Punjabi	pa	Gurmukhi	~35M speakers
11	Urdu	ur	Perso-Arabic	~70M speakers
12	Spanish	es	Latin	~550M speakers
13	French	fr	Latin	~320M speakers
14	German	de	Latin	~130M speakers
15	Arabic	ar	Arabic	~420M speakers
16	Japanese	ja	Kanji/Kana	~125M speakers
Total population coverage: ~3 billion speakers worldwide.

8.2 Language Pipeline
User input (any language)
    │
    ▼
AWS Comprehend (detect language)
    │
    ▼
AWS Translate (→ English, if needed)
    │
    ▼
AI Engine processes in English
    │
    ▼
AWS Translate (English → user's language)
    │
    ▼
Amazon Polly (generate audio in user's language)
    │
    ▼
User receives: translated text + audio
8.3 Translation Caching
In-memory cache: 500 entries, 5-minute TTL for repeated queries
Translation cache: 1-hour TTL for translated strings
Static translations: 200+ UI strings pre-translated in TypeScript files (en.ts, hi.ts, te.ts, ta.ts)
8.4 Language Override
Users can force a response language using the prefix syntax:

[Hindi] What is PM-KISAN scheme?     → Response in Hindi
[Telugu] How to file RTI?            → Response in Telugu
9. Frontend
9.1 Overview
Metric	Value
Framework	Next.js 14 (App Router)
Components	32 React components
API Routes	30+ server-side routes
Library Files	40+ utility modules
Build Output	Standalone (supports SSR)
Styling	Tailwind CSS 3.4
9.2 Key Components
Chat Interface (WhatsApp-style):

ChatWindow.tsx — Auto-scrolling message container with animations
ChatMessage.tsx — Message bubbles (user = right/blue, AI = left/white) with Markdown rendering
ChatInput.tsx — Sticky input bar with text, voice, file upload, AI capabilities menu
TypingIndicator.tsx — Animated dots while AI is thinking
WelcomeScreen.tsx — Landing screen with 5 suggested prompts
Voice Input:

useSpeechToText.ts — Web Speech API hook for continuous voice input
Supports all 16 languages for voice recognition
Live transcript display while speaking
Auto-restart on Chrome silence timeouts
Scheme Explorer:

SchemeEligibilityPage.tsx — Step-by-step profile builder (wizard form)
SchemeEligibilityResults.tsx — Results with matched/unmatched criteria and scores
SchemeCard.tsx — Grid card previews
SchemeDetailModal.tsx — Full scheme details with application links and document lists
AI Capabilities Menu (triggered by "+" button):

Document Explainer — Upload PDF/DOC, AI explains in simple language
Photo Answer — Upload image (crop photo, document scan), AI analyzes
Learning Mode — Interactive Q&A for educational topics
Voice Query — Tap to speak
File Upload — General file analysis
9.3 Pages
Route	Component	Purpose
/	Landing page	Hero section with 3D scene, feature highlights, CTA
/chat	ChatPage	Main AI chat interface
/citizen-dashboard	Scheme explorer	Browse and filter government schemes
/admin-dashboard	Analytics	Query logs, usage statistics, engine performance
10. API Reference
10.1 Core AI Endpoint
POST /api/unified-ai
Content-Type: application/json

{
  "message": "What is the wheat price in Punjab?",
  "sessionId": "abc-123-def",     // optional, auto-generated if omitted
  "language": "hi",               // optional, auto-detected if omitted
  "userId": "user-456",           // optional
  "capability": "annadata"        // optional, auto-routed if omitted
}

Response:
{
  "response": "पंजाब में गेहूं का भाव...",
  "engine": "annadata",
  "language": "hi",
  "confidence": 0.95,
  "audioUrl": "data:audio/mp3;base64,...",  // if voice enabled
  "sessionId": "abc-123-def"
}
10.2 Scheme Eligibility
POST /api/scheme-eligibility
{
  "profile": {
    "age": 35,
    "gender": "male",
    "state": "Punjab",
    "occupation": "farmer",
    "annualIncome": 120000,
    "socialCategory": "General",
    "landOwnership": true,
    "landArea": 1.5,
    "farmerType": "small"
  }
}

Response:
{
  "schemes": [
    {
      "name": "PM-KISAN",
      "eligibilityScore": 95,
      "isEligible": true,
      "benefits": ["₹6,000/year in 3 installments"],
      "documentsNeeded": ["Aadhaar", "Land records", "Bank passbook"],
      "applicationLink": "https://pmkisan.gov.in"
    }
  ],
  "totalMatched": 12,
  "totalEvaluated": 70
}
10.3 Translation
POST /api/translate
{
  "text": "How to apply for PM-KISAN?",
  "targetLanguage": "hi",
  "sourceLanguage": "en"    // optional, auto-detected
}

Response:
{
  "translatedText": "पीएम-किसान के लिए कैसे आवेदन करें?",
  "sourceLanguage": "en",
  "targetLanguage": "hi"
}
10.4 Text-to-Speech
POST /api/text-to-speech
{
  "text": "Welcome to BUAIP",
  "language": "hi"
}

Response:
{
  "audio": "data:audio/mp3;base64,//uQxAAAAAANIAAAAAExBTUUzLjEw...",
  "format": "mp3"
}
10.5 Domain-Specific Engines
All follow the same request pattern:

POST /api/annadata-ai        → Farmer advisory
POST /api/nyaya-ai           → Legal guidance
POST /api/udyog-ai           → Entrepreneurship
POST /api/pathai             → Career counseling
POST /api/atithi-ai          → Travel planning
POST /api/globalseller-engine → Export intelligence

{
  "message": "Your question here",
  "language": "en",
  "sessionId": "optional-session-id"
}
11. Infrastructure as Code
The entire AWS infrastructure is defined in a single CDK stack: aws-backend/infra/buaip-stack.ts.

11.1 Resources Created
Resource	Count	Details
S3 Buckets	2	Frontend hosting + data/datasets
CloudFront Distribution	1	Global CDN with S3 + API Gateway origins
DynamoDB Tables	4	MandiPrices, Weather, Schemes, Queries (all PAY_PER_REQUEST)
Lambda Functions	13	10 engines + 3 data fetchers
API Gateway (REST)	1	12 routes, rate limiting, API key
EventBridge Rules	3	Mandi (6hr), Weather (6hr), Schemes (7d)
IAM Role	1	Lambda execution role with Bedrock, Polly, Translate, DynamoDB, S3 permissions
CloudWatch Log Groups	13	1 per Lambda, 30-day retention
11.2 Stack Outputs
BuaipApiUrl          = https://xxxxx.execute-api.ap-south-1.amazonaws.com/prod/
BuaipCloudFrontUrl   = https://dxxxxx.cloudfront.net
BuaipFrontendBucket  = buaip-frontend-prod
BuaipDataBucket      = buaip-data-prod
BuaipApiKeyId        = xxxxxxxxxx
12. Deployment Guide
12.1 Prerequisites
Requirement	Minimum	How to Get
AWS Account	Free tier eligible	https://aws.amazon.com
AWS CLI	v2.x	winget install Amazon.AWSCLI
Node.js	20.x	winget install OpenJS.NodeJS.LTS
AWS CDK	2.130+	npm install -g aws-cdk
data.gov.in API Key	Free	Register at https://data.gov.in
OpenWeatherMap API Key	Free tier	Register at https://openweathermap.org
Bedrock Model Access	Claude 3.5 Sonnet	AWS Console → Bedrock → Model Access → Enable
12.2 Step-by-Step Deployment
Step 1: Configure AWS credentials

aws configure
# AWS Access Key ID: [your-key]
# AWS Secret Access Key: [your-secret]
# Default region: ap-south-1
# Default output format: json
Step 2: Install dependencies

cd aws-backend
npm install
Step 3: Set environment variables

# Copy and edit the template
cp .env.example .env
# Fill in:
#   DATA_GOV_IN_API_KEY=your-key-from-data-gov-in
#   OPENWEATHER_API_KEY=your-key-from-openweathermap
#   STAGE=prod
Step 4: Bootstrap CDK (one-time)

cd infra
npx cdk bootstrap aws://ACCOUNT-ID/ap-south-1
Step 5: Deploy

npx cdk deploy BuaipStack --require-approval never
Step 6: Deploy frontend

cd ../BUAIP
npm run build
aws s3 sync out/ s3://buaip-frontend-prod/ --delete
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"
Step 7: Seed initial data

# Upload schemes CSV to S3
aws s3 cp datasets/india_schemes_7domains.csv s3://buaip-data-prod/datasets/

# Trigger initial data fetch
aws lambda invoke --function-name BUAIP-MandiPriceFetcher-prod /dev/null
aws lambda invoke --function-name BUAIP-WeatherFetcher-prod /dev/null
aws lambda invoke --function-name BUAIP-SchemeSeeder-prod /dev/null
13. Cost Analysis
13.1 Estimated Monthly Cost (1,000 daily active users)
Service	Usage Estimate	Monthly Cost
Lambda	~100K invocations, avg 5s each	$2.50
Bedrock (Claude)	~50K calls, avg 2K tokens	$25-40
DynamoDB	~500K reads, ~10K writes	$1.50
API Gateway	~100K requests	$0.35
S3	1 GB storage + 100K requests	$0.05
CloudFront	50 GB transfer	$4.25
Polly	~10K TTS calls, avg 500 chars	$2.00
Translate	~50K calls, avg 200 chars	$1.50
EventBridge	12 rules/day	Free
CloudWatch	13 log groups	$2.00
Total		~$39-54/month
13.2 Cost at Zero Traffic
Service	Idle Cost
Lambda	$0
DynamoDB (PAY_PER_REQUEST)	$0
API Gateway	$0
S3	$0.02 (storage only)
CloudFront	$0
EventBridge data fetchers	~$0.50 (Lambda invocations only)
Total	~$0.52/month
This is why serverless was chosen — near-zero cost when idle.

14. Project Metrics
Metric	Value
Frontend Components	32 React components
API Routes	30+ Next.js routes
AI Engines	10 specialized Lambdas
Data Fetcher Lambdas	3 scheduled functions
Shared Libraries	5 shared utilities
Library Files	40+ utility modules
Languages Supported	16 (11 Indian + 5 international)
Government Schemes	70+ across 7 domains
Crops Tracked	15 major Indian crops
States Covered	16 agricultural states
Weather Districts	28 agricultural districts
Legal Categories	8 (labor, consumer, housing, family, property, RTI, cyber, criminal)
Career Phases	5 conversational guidance phases
Entrepreneur Modules	6 (credit, formalization, digital, growth, schemes, general)
Export Modes	7 (marketplace, supply chain, compliance, pricing, logistics, marketing, general)
Translation Pairs	16 × 16 = 256 possible language pairs
Static UI Strings	200+ per language
DynamoDB Tables	4
S3 Buckets	2
Lambda Functions	13 total
EventBridge Rules	3 scheduled
Mandi Price Updates	240 records every 6 hours
Weather Updates	28 records every 6 hours
Cold Start	<1 second (Node.js 20)
Warm Response	<200ms
15. Repository Structure
BUAIP/
├── README.md                           ← You are here
│
├── BUAIP/                              # FRONTEND (Next.js 14)
│   ├── app/
│   │   ├── api/                        # 30+ API routes
│   │   │   ├── unified-ai/            # Central AI brain
│   │   │   ├── unified-ai-stream/     # Streaming responses
│   │   │   ├── annadata-ai/           # Farmer advisory
│   │   │   ├── scheme-eligibility/    # Scheme matching
│   │   │   ├── scheme-ai/            # Scheme explanation
│   │   │   ├── scheme-assistance/     # Scheme Q&A
│   │   │   ├── nyay-ai/              # Legal guidance
│   │   │   ├── udyog-ai/             # Entrepreneurship
│   │   │   ├── pathai/               # Career guidance
│   │   │   ├── atithi-ai/            # Travel planning
│   │   │   ├── globalseller/         # Export assistance
│   │   │   ├── globalseller-engine/   # Export (alternate)
│   │   │   ├── india-insider-*/       # 8 India Insider routes
│   │   │   ├── text-to-speech/        # Polly TTS
│   │   │   ├── translate/             # AWS Translate
│   │   │   ├── assistant-translate/   # Translation helper
│   │   │   ├── ai-capabilities/       # Doc/photo analysis
│   │   │   ├── governance-ai/         # Policy analysis
│   │   │   └── categories/            # Scheme categories
│   │   │
│   │   ├── components/                 # 32 React components
│   │   │   ├── ChatWindow.tsx         # Message container
│   │   │   ├── ChatMessage.tsx        # Message bubbles
│   │   │   ├── ChatInput.tsx          # Input bar + voice + file
│   │   │   ├── Navbar.tsx             # Header with language selector
│   │   │   ├── WelcomeScreen.tsx      # Landing prompts
│   │   │   ├── SchemeEligibilityPage.tsx
│   │   │   ├── SchemeCard.tsx
│   │   │   ├── SchemeDetailModal.tsx
│   │   │   ├── EngineSelector.tsx
│   │   │   ├── EngineRoutingIndicator.tsx
│   │   │   └── ...
│   │   │
│   │   ├── lib/                        # 40+ utility libraries
│   │   │   ├── unifiedAIBrain.ts      # Central routing logic
│   │   │   ├── bedrock.ts             # Bedrock client
│   │   │   ├── bedrockStream.ts       # Streaming handler
│   │   │   ├── annadataEngine.ts      # Agriculture engine
│   │   │   ├── nyayEngine.ts          # Legal engine
│   │   │   ├── globalSellerEngine.ts  # Export engine
│   │   │   ├── eligibilityEngine.ts   # Scheme matching
│   │   │   ├── schemeDatabase.ts      # 70+ schemes
│   │   │   ├── languageConfig.ts      # 16 languages
│   │   │   ├── languageContext.tsx     # Language state
│   │   │   ├── regionContext.tsx       # Region state
│   │   │   ├── cache.ts              # Query cache (5min TTL)
│   │   │   └── ...
│   │   │
│   │   ├── i18n/                       # Static translations
│   │   │   ├── en.ts                  # English (200+ strings)
│   │   │   ├── hi.ts                  # Hindi
│   │   │   ├── te.ts                  # Telugu
│   │   │   └── ta.ts                  # Tamil
│   │   │
│   │   ├── chat/                      # Chat page
│   │   ├── [citizen-dashboard]/       # Scheme explorer page
│   │   └── [admin-dashboard]/         # Analytics page
│   │
│   ├── public/                         # Static assets
│   ├── package.json                    # Frontend dependencies
│   ├── next.config.js                  # Next.js configuration
│   ├── tailwind.config.ts              # Tailwind configuration
│   └── tsconfig.json                   # TypeScript config
│
├── aws-backend/                        # BACKEND (AWS Serverless)
│   ├── lambda/
│   │   ├── engines/                    # 10 AI engine Lambdas
│   │   │   ├── unified-ai.ts         # Super router
│   │   │   ├── annadata.ts           # Agriculture
│   │   │   ├── scheme-eligibility.ts  # Scheme matching
│   │   │   ├── nyaya.ts              # Legal
│   │   │   ├── udyog.ts              # Business
│   │   │   ├── pathai.ts             # Career
│   │   │   ├── atithi.ts             # Travel
│   │   │   ├── globalseller.ts       # Export
│   │   │   ├── translate.ts          # Translation
│   │   │   └── text-to-speech.ts     # TTS
│   │   │
│   │   ├── data-fetchers/             # 3 scheduled Lambdas
│   │   │   ├── mandi-price-fetcher.ts # data.gov.in → DynamoDB
│   │   │   ├── weather-fetcher.ts     # OpenWeatherMap → DynamoDB
│   │   │   └── scheme-seeder.ts       # S3 CSV → DynamoDB
│   │   │
│   │   └── shared/                     # Shared utilities
│   │       ├── bedrock.ts             # Bedrock Claude client
│   │       ├── dynamodb.ts            # DynamoDB operations
│   │       ├── polly-translate.ts     # Polly TTS + Translate
│   │       └── response.ts           # HTTP response helpers
│   │
│   ├── infra/
│   │   ├── buaip-stack.ts             # Complete CDK stack
│   │   └── cdk.json                   # CDK configuration
│   │
│   ├── package.json                    # Backend dependencies
│   ├── tsconfig.json                   # TypeScript config
│   ├── deploy.ps1                      # PowerShell deploy script
│   └── .env.example                    # Environment template
│
├── aws-engines/                        # Legacy engine handlers
└── engines/                            # Legacy JavaScript engine
16. Contributing
Fork the repository
Create a feature branch: git checkout -b feature/my-feature
Commit changes: git commit -m "Add my feature"
Push to branch: git push origin feature/my-feature
Open a Pull Request
Development Setup
# Frontend
cd BUAIP
npm install
npm run dev          # http://localhost:3000

# Backend (local testing)
cd aws-backend
npm install
npx cdk synth        # Validate CDK stack
License
MIT License. See LICENSE for details.

BUAIP — Empowering every Indian citizen with AI-powered access to government services, in their own language.
