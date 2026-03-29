/** OpenAI-compatible Lovable AI gateway helpers for Edge Functions */

export const LOVABLE_CHAT_COMPLETIONS_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
  error?: { message?: string; code?: string };
};

export type LovableFetchResult =
  | { ok: true; status: number; data: ChatCompletionResponse }
  | { ok: false; status: number; data?: ChatCompletionResponse; rawBody: string };

/**
 * POST /v1/chat/completions with abort timeout and safe JSON parsing.
 */
export async function lovableChatCompletion(
  apiKey: string,
  body: Record<string, unknown>,
  options?: { timeoutMs?: number },
): Promise<LovableFetchResult> {
  const timeoutMs = options?.timeoutMs ?? 55_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(LOVABLE_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const rawBody = await response.text();
    let data: ChatCompletionResponse | undefined;
    try {
      data = JSON.parse(rawBody) as ChatCompletionResponse;
    } catch {
      /* empty or non-JSON */
    }
    if (!response.ok) {
      return { ok: false, status: response.status, data, rawBody };
    }
    if (!data) {
      return { ok: false, status: response.status, rawBody };
    }
    return { ok: true, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

export function extractToolCallArguments(
  data: ChatCompletionResponse | undefined,
  toolName: string,
): string | null {
  const calls = data?.choices?.[0]?.message?.tool_calls;
  if (!calls?.length) return null;
  const match = calls.find((c) => c.function?.name === toolName);
  const args = match?.function?.arguments;
  return typeof args === "string" && args.trim() ? args : null;
}

export function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw) as unknown;
    return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
