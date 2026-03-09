# AMPLIFY DEPLOYMENT - ENVIRONMENT VARIABLES GUIDE

## ✅ NEW VARIABLE NAMES (For Amplify - Use These!)

Since Amplify doesn't allow environment variable names starting with "AWS", use these instead:

```
BEDROCK_REGION = ap-south-1
BEDROCK_ACCESS_KEY = AKIAV75JH6MHI2J2V2IW
BEDROCK_SECRET_KEY = [your-secret-access-key]
BEDROCK_MODEL_ID = anthropic.claude-3-5-sonnet-20241022-v2:0
```

## ⚙️ HOW TO ADD THEM IN AMPLIFY

### Step 1: Go to AWS Amplify Console
```
https://console.aws.amazon.com/amplify/
```

### Step 2: Select Your App
- Click "BUAIP" or your app name

### Step 3: Go to Environment Variables
- Left sidebar → **App settings** → **Environment variables**

### Step 4: Add Variables
Copy-paste each one:

| Key | Value |
|-----|-------|
| `BEDROCK_REGION` | `ap-south-1` |
| `BEDROCK_ACCESS_KEY` | Your AWS Access Key (starts with AKIA...) |
| `BEDROCK_SECRET_KEY` | Your AWS Secret Access Key |
| `BEDROCK_MODEL_ID` | `anthropic.claude-3-5-sonnet-20241022-v2:0` |

**⚠️ Important**: 
- Don't use "AWS_" at the start of variable names
- Use exactly these names: `BEDROCK_REGION`, `BEDROCK_ACCESS_KEY`, `BEDROCK_SECRET_KEY`
- Leave out the "AWS_" prefix entirely

### Step 5: Save & Deploy
- Click "Save"
- Go to **Deployments** → **Redeploy this version**
- Wait 5-10 minutes for rebuild

---

## Where to Get Your Credentials

### Get Access Key & Secret Key:
1. Go to AWS Console → **IAM** → **Users**
2. Click your user name
3. Go to **Security credentials** tab
4. Click **Create access key**
5. Copy:
   - **Access Key ID** → Use for `BEDROCK_ACCESS_KEY`
   - **Secret Access Key** → Use for `BEDROCK_SECRET_KEY`

If you already have an access key:
1. IAM → Users → Your user
2. Security credentials
3. Find existing access key
4. Click **Show secret access key** (or create new one)

---

## Testing After Deployment

Once redeployed with these variables:

1. Visit your Amplify app URL
2. Try uploading a document → Should explain with 2000+ chars ✅
3. Try uploading a photo → Should analyze it ✅
4. Try learning mode → Should teach adaptively ✅

---

## If It Still Doesn't Work

### Verify credentials are set:
1. Amplify Console → Environment variables
2. Make sure all 4 variables are there
3. Check spelling (case-sensitive!)

### Check Amplify logs:
1. Deployments → Click the deployment
2. Frontend logs → Check for errors
3. Look for "credentials" or "AWS" errors

### Rebuild:
1. Click "Redeploy this version"
2. Wait for build to complete
3. Check logs again

---

## Code Changes Made

Your code now automatically reads from:
1. **BEDROCK_REGION** (new) → Falls back to AWS_REGION
2. **BEDROCK_ACCESS_KEY** (new) → Falls back to AWS_ACCESS_KEY_ID
3. **BEDROCK_SECRET_KEY** (new) → Falls back to AWS_SECRET_ACCESS_KEY

This means it works with BOTH names for maximum compatibility!

Files updated:
- `app/lib/bedrock.ts`
- `app/lib/bedrockStream.ts`
- `app/lib/aws/config.ts`
- `app/lib/annadataDataLayer.ts`
- `app/lib/aws/dynamodb.ts`
- `app/api/annadata-ai/route.ts`

---

## What NOT To Do

❌ Don't use: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`  
❌ Don't start environment variable names with "AWS"  
❌ Don't put credentials in code  
❌ Don't use .env.local file in production  

---

## Summary

**Old Way (doesn't work in Amplify):**
```
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

**New Way (works in Amplify):**
```
BEDROCK_REGION=ap-south-1
BEDROCK_ACCESS_KEY=AKIA...
BEDROCK_SECRET_KEY=...
```

That's it! Same values, different names.

