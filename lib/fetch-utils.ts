/**
 * Safely parses JSON from a fetch Response object.
 * Handles cases where the response might be a non-JSON error message (like "Rate exceeded.")
 */
export async function safeJson<T = any>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // If it's not JSON, it might be a text error
    const text = await res.text();
    if (text.includes('Rate exceeded')) {
      throw new Error('System is currently busy (Rate Limit Exceeded). Please try again in a few moments.');
    }
    return null;
  }

  try {
    return await res.json();
  } catch (err: any) {
    // Check if it's the "Rate exceeded" message in a non-standard way
    const text = await res.text().catch(() => '');
    if (text.includes('Rate exceeded')) {
      throw new Error('System is currently busy (Rate Limit Exceeded). Please try again in a few moments.');
    }
    console.error('Failed to parse JSON response:', err);
    return null;
  }
}
