/**
 * Safely parses JSON from a fetch Response object.
 * Handles cases where the response might be a non-JSON error message (like "Rate exceeded.")
 */
export async function safeJson<T = any>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  
  // Clone the response if we might need to read it twice (e.g., for error logging)
  // but usually we just want to be careful.
  
  if (!contentType.includes('application/json')) {
    try {
      const text = await res.text();
      if (text.includes('Rate exceeded')) {
        throw new Error('System is currently busy (Rate Limit Exceeded). Please try again in a few moments.');
      }
      return null;
    } catch {
      return null;
    }
  }

  try {
    const text = await res.text();
    if (!text) return null;
    
    try {
      return JSON.parse(text) as T;
    } catch (parseErr) {
      if (text.includes('Rate exceeded')) {
        throw new Error('System is currently busy (Rate Limit Exceeded). Please try again in a few moments.');
      }
      console.error('Failed to parse JSON response content:', text.substring(0, 100));
      return null;
    }
  } catch (err: any) {
    console.error('Failed to read response body:', err);
    return null;
  }
}
