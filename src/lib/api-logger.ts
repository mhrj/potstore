/**
 * Global API call logger utility.
 * Controlled by the DEBUG_API_CALLS environment variable.
 */
export function logApiCall(
  provider: string,
  endpoint: string,
  payload: unknown,
  response: unknown,
): void {
  if (process.env.DEBUG_API_CALLS !== 'true') return;
  console.log(`\n=== [${provider.toUpperCase()}] API CALL ===`);
  console.log(`Endpoint: ${endpoint}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('Response:', JSON.stringify(response, null, 2));
  console.log('=================================\n');
}

