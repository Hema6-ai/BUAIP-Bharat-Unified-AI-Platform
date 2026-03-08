// Common Lambda response helpers
export function ok(body: Record<string, any>) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
    body: JSON.stringify(body),
  };
}

export function err(statusCode: number, message: string) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ error: message }),
  };
}

export function parseBody(event: any): Record<string, any> {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return {};
  }
}
