import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Configure DeepSeek using your exact Vercel Environment Variable
const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1', // The /v1 is required for the SDK
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = await streamText({
      // We cast ONLY the model name to bypass the strict type check, 
      // keeping the result object fully typed so the stream doesn't break.
      model: deepseek('deepseek-chat' as any),
      system: `You are VANTAGE, the ultimate 24/7 mortgage and real estate financing assistant. You are a problem-solver. Be concise, mobile-first, and prioritize compliance.`,
      messages: messages,
    });

    // Because we didn't cast the whole result to 'any', this method works perfectly
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('API Route Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}