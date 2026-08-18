// ===========================================================================
// RankRentDeep OS — OpenRouter chat client
// Thin wrapper over the OpenAI-compatible chat completions API. Used by the AI
// committee to query multiple models with a single key.
// ===========================================================================

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  /** Optional OpenAI-compatible base URL override (e.g. a local gateway). */
  baseUrl?: string;
  /** Optional API key override (defaults to OPENROUTER_API_KEY). */
  apiKey?: string;
}

export async function chatCompletion(
  model: string,
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<string> {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set.");
  }

  const res = await fetch(`${options.baseUrl ?? OPENROUTER_URL}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...(options.baseUrl ? {} : { "HTTP-Referer": "https://rankrentdeep.local" }),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 800,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Empty response from model.");
  return content;
}
