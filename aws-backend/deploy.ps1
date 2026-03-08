# BUAIP Deploy Script — Run this to deploy the entire stack
# Prerequisites: AWS CLI configured, Node.js 18+, CDK CLI

param(
    [string]$Stage = "prod",
    [string]$DataGovApiKey = "",
    [string]$OpenWeatherApiKey = "",
    [string]$BedrockModelId = "anthropic.claude-3-5-sonnet-20241022-v2:0"
)

$ErrorActionPreference = "Stop"
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  BUAIP AWS Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ─── Step 1: Verify prerequisites ────────────────────────────────────
Write-Host "[1/7] Checking prerequisites..." -ForegroundColor Yellow

$awsVersion = aws --version 2>&1
if ($LASTEXITCODE -ne 0) { Write-Error "AWS CLI not found. Install from https://aws.amazon.com/cli/"; exit 1 }
Write-Host "  AWS CLI: $awsVersion" -ForegroundColor Green

$nodeVersion = node --version
if ($LASTEXITCODE -ne 0) { Write-Error "Node.js not found. Install from https://nodejs.org/"; exit 1 }
Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green

# Verify AWS credentials
$identity = aws sts get-caller-identity --output json 2>&1 | ConvertFrom-Json
if (-not $identity.Account) { Write-Error "AWS credentials not configured. Run 'aws configure'"; exit 1 }
Write-Host "  AWS Account: $($identity.Account)" -ForegroundColor Green
Write-Host "  AWS User: $($identity.Arn)" -ForegroundColor Green

# ─── Step 2: Install dependencies ────────────────────────────────────
Write-Host "`n[2/7] Installing dependencies..." -ForegroundColor Yellow
Push-Location $PSScriptRoot
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed"; exit 1 }
Write-Host "  Dependencies installed" -ForegroundColor Green

# ─── Step 3: Set environment variables ───────────────────────────────
Write-Host "`n[3/7] Setting environment..." -ForegroundColor Yellow
$env:STAGE = $Stage
$env:DATA_GOV_IN_API_KEY = $DataGovApiKey
$env:OPENWEATHER_API_KEY = $OpenWeatherApiKey
$env:BEDROCK_MODEL_ID = $BedrockModelId
$env:CDK_DEFAULT_ACCOUNT = $identity.Account
$env:CDK_DEFAULT_REGION = "ap-south-1"
Write-Host "  Stage: $Stage" -ForegroundColor Green
Write-Host "  Region: ap-south-1 (Mumbai)" -ForegroundColor Green
Write-Host "  data.gov.in API key: $(if ($DataGovApiKey) {'SET'} else {'NOT SET (mandi prices will be empty)'})" -ForegroundColor $(if ($DataGovApiKey) {'Green'} else {'DarkYellow'})
Write-Host "  OpenWeather API key: $(if ($OpenWeatherApiKey) {'SET'} else {'NOT SET (weather will be empty)'})" -ForegroundColor $(if ($OpenWeatherApiKey) {'Green'} else {'DarkYellow'})

# ─── Step 4: Bootstrap CDK (first-time only) ────────────────────────
Write-Host "`n[4/7] Bootstrapping CDK..." -ForegroundColor Yellow
Push-Location infra
npx cdk bootstrap "aws://$($identity.Account)/ap-south-1" 2>&1 | Out-Null
Write-Host "  CDK bootstrapped" -ForegroundColor Green

# ─── Step 5: Synthesize CloudFormation ───────────────────────────────
Write-Host "`n[5/7] Synthesizing CloudFormation template..." -ForegroundColor Yellow
npx cdk synth
if ($LASTEXITCODE -ne 0) { Write-Error "CDK synth failed"; exit 1 }
Write-Host "  Template generated" -ForegroundColor Green

# ─── Step 6: Deploy ──────────────────────────────────────────────────
Write-Host "`n[6/7] Deploying to AWS..." -ForegroundColor Yellow
Write-Host "  This deploys: API Gateway + 10 Lambdas + 4 DynamoDB + S3 + CloudFront + EventBridge" -ForegroundColor DarkGray
npx cdk deploy BuaipStack --require-approval never --outputs-file ../deployment-output.json
if ($LASTEXITCODE -ne 0) { Write-Error "CDK deploy failed"; exit 1 }
Pop-Location
Write-Host "  Deployment complete!" -ForegroundColor Green

# ─── Step 7: Upload scheme data ──────────────────────────────────────
Write-Host "`n[7/7] Uploading scheme dataset to S3..." -ForegroundColor Yellow
$dataBucket = "buaip-data-$Stage"
$schemeCsv = Join-Path $PSScriptRoot ".." "BUAIP" "public" "india_schemes_7domains.csv"
if (Test-Path $schemeCsv) {
    aws s3 cp $schemeCsv "s3://$dataBucket/datasets/india_schemes_7domains.csv"
    Write-Host "  Scheme CSV uploaded" -ForegroundColor Green
    
    # Trigger the scheme seeder Lambda
    Write-Host "  Seeding schemes into DynamoDB..." -ForegroundColor DarkGray
    aws lambda invoke --function-name "buaip-schemeseeder-$Stage" --payload '{}' /dev/null 2>&1 | Out-Null
    Write-Host "  Schemes seeded" -ForegroundColor Green
} else {
    Write-Host "  Scheme CSV not found at $schemeCsv — skip seeding" -ForegroundColor DarkYellow
}

# ─── Done ────────────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

if (Test-Path (Join-Path $PSScriptRoot "deployment-output.json")) {
    $outputs = Get-Content (Join-Path $PSScriptRoot "deployment-output.json") | ConvertFrom-Json
    Write-Host "Your endpoints:" -ForegroundColor Yellow
    $outputs.BuaipStack.PSObject.Properties | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor White
    }
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Update your Next.js .env.local with the API URL above" -ForegroundColor White
Write-Host "  2. Get API keys: data.gov.in (free) + openweathermap.org (free tier)" -ForegroundColor White
Write-Host "  3. Enable Bedrock Claude model in AWS Console > Bedrock > Model access" -ForegroundColor White
Write-Host "  4. Run: npm run build && aws s3 sync out/ s3://buaip-frontend-$Stage/" -ForegroundColor White
Pop-Location
