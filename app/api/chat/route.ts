import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@/types';
import { systemPrompt } from '@/lib/systemPrompt';

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY が設定されていません' },
      { status: 500 },
    );
  }

  const { messages }: { messages: Message[] } = await request.json();

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
          stream: true,
        });

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        if (error instanceof Anthropic.APIError) {
          controller.error(
            new Error(`API エラー (${error.status}): ${error.message}`),
          );
        } else {
          controller.error(new Error('予期せぬエラーが発生しました'));
        }
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
