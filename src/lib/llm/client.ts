type CallLLMArgs = {
  system: string;
  user: string;
  schema: { name: string; schema: unknown };
  model?: string;
  timeoutMs?: number;
};

export async function callLLMJson<T>(args: CallLLMArgs): Promise<T> {
  const {
    system,
    user,
    schema,
    model = process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini-2024-07-18',
    timeoutMs = 14000
  } = args;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Отсутствует ключ OpenAI API.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        response_format: {
          type: 'json_schema',
          json_schema: {
            ...schema,
            strict: true
          }
        },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ошибка OpenAI API: ${text}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const outputText = data.choices?.[0]?.message?.content;
    if (!outputText) {
      throw new Error('Пустой ответ от модели.');
    }

    return JSON.parse(outputText) as T;
  } catch (error) {
    console.error('LLM ошибка:', error);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
