/**
 * AI Gateway wrapper — configurable endpoint instead of hardcoded Lovable gateway.
 */

interface AiCompletionOptions {
  model: string;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  tools?: unknown[];
  timeoutMs?: number;
}

interface AiCompletionResponse {
  content: string;
  toolCalls?: unknown[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Get environment variable safely across Deno and Node.js
 */
function getEnv(key: string): string | undefined {
  // @ts-ignore - Deno is only available in Deno runtime
  if (typeof Deno !== "undefined" && Deno.env) {
    // @ts-ignore
    return Deno.env.get(key);
  }
  return process.env[key];
}

/**
 * Get the AI gateway URL from environment.
 * Falls back to Google AI Studio direct endpoint if no gateway configured.
 */
export function getAiGatewayUrl(): string {
  return getEnv("AI_GATEWAY_URL") || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
}

/**
 * Get the AI API key from environment.
 */
export function getAiApiKey(): string {
  const key = getEnv("AI_API_KEY") || getEnv("LOVABLE_API_KEY") || getEnv("GOOGLE_AI_API_KEY");
  if (!key) {
    throw new Error("No AI API key configured. Set AI_API_KEY, LOVABLE_API_KEY, or GOOGLE_AI_API_KEY.");
  }
  return key;
}

/**
 * Call the AI completion API with configurable endpoint.
 */
export async function callAiCompletion(options: AiCompletionOptions): Promise<AiCompletionResponse> {
  const {
    model,
    systemPrompt,
    userMessage,
    temperature = 0.7,
    maxTokens = 2000,
    tools,
    timeoutMs = 15000,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetch(getAiGatewayUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getAiApiKey()}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || "",
      toolCalls: choice?.message?.tool_calls,
      usage: data.usage,
    };
  } finally {
    clearTimeout(timeout);
  }
}
