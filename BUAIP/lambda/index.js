// Lambda handler for Next.js API routes
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.BEDROCK_ACCESS_KEY,
    secretAccessKey: process.env.BEDROCK_SECRET_KEY
  }
});

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Parse the request body
    const body = JSON.parse(event.body || '{}');
    const { userMessage, selectedLanguage = 'en' } = body;
    
    if (!userMessage) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'userMessage is required' })
      };
    }

    // Call Bedrock AI
    const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: userMessage
      }]
    };

    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        response: responseBody.content[0].text,
        model: modelId
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: error.message,
        type: error.constructor.name
      })
    };
  }
};
