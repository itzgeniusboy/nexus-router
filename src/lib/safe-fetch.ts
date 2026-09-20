/**
 * Safe fetch helper that protects against HTML/Text error responses
 * (e.g., Cloud Run 502/503 "A server error occurred...", Nginx HTML, or Vercel gateway errors)
 * preventing: SyntaxError: Unexpected token 'A', "A server e"... is not valid JSON
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

    if (!rawText || rawText.trim() === '') {
      return {
        ok: res.ok,
        status: res.status,
        data: {} as T,
      };
    }

    // Attempt JSON parse
    try {
      const parsed = JSON.parse(rawText);
      return {
        ok: res.ok,
        status: res.status,
        data: parsed,
      };
    } catch {
      // Non-JSON response (e.g. "A server error occurred", HTML 502/503 page, or plain text)
      // Extract cleanest message
      let cleanMsg = rawText.trim();
      if (cleanMsg.startsWith('<!DOCTYPE') || cleanMsg.startsWith('<html')) {
        const titleMatch = cleanMsg.match(/<title>([^<]*)<\/title>/i);
        cleanMsg = titleMatch ? titleMatch[1].trim() : `Server returned status ${res.status}`;
      } else if (cleanMsg.length > 200) {
        cleanMsg = cleanMsg.slice(0, 197) + '...';
      }

      return {
        ok: false,
        status: res.status || 500,
        data: {
          success: false,
          error: cleanMsg || `Server error (${res.status})`,
          message: cleanMsg || `Server error (${res.status})`,
        } as unknown as T,
      };
    }
  } catch (networkErr: any) {
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        error: networkErr?.message || 'Network request failed',
        message: networkErr?.message || 'Network request failed',
      } as unknown as T,
    };
  }
}
