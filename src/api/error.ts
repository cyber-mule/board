export function parseErrorMessage(text: string, fallback: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed) as { message?: string; error?: string };
    if (parsed && typeof parsed.message === 'string') {
      return parsed.message;
    }
    if (parsed && typeof parsed.error === 'string') {
      return parsed.error;
    }
  } catch (error) {
    return trimmed;
  }

  return trimmed;
}

export async function parseErrorResponse(response: Response, fallback: string): Promise<string> {
  const text = await response.text().catch(() => '');
  return parseErrorMessage(text, fallback);
}
