/**
 * Engine API Helper
 * Provides a reusable function to call the AWS-deployed backend API
 * for all BUAIP AI engines.
 */

const API_ENDPOINT = 'https://nw5rxj4no3.execute-api.ap-south-1.amazonaws.com/Prod/engine';

/**
 * Send a query to a specific AI engine
 * @param {string} engine - The engine name (e.g., 'annadata', 'wingz', 'nyaya')
 * @param {string} query - The user's query text
 * @returns {Promise<Object>} Response object containing engine, query, and answer
 * @throws {Error} If the request fails or returns an error
 */
export async function askEngine(engine, query) {
  try {
    // Validate inputs
    if (!engine || typeof engine !== 'string') {
      throw new Error('Engine name is required and must be a string');
    }
    
    if (!query || typeof query !== 'string') {
      throw new Error('Query is required and must be a string');
    }

    // Make POST request to API Gateway
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        engine: engine.toLowerCase(),
        query: query.trim(),
      }),
    });

    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    // Parse and return JSON response
    const data = await response.json();
    
    // Validate response structure
    if (!data.answer) {
      throw new Error('Invalid response format: missing answer field');
    }

    return data;
  } catch (error) {
    // Log error for debugging
    console.error('Engine API Error:', error);
    
    // Re-throw with context
    throw new Error(`Failed to get response from ${engine} engine: ${error.message}`);
  }
}

/**
 * Check if the API is reachable (optional health check function)
 * @returns {Promise<boolean>} True if API is reachable
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'OPTIONS',
    });
    return response.ok;
  } catch (error) {
    console.error('API Health Check Failed:', error);
    return false;
  }
}
