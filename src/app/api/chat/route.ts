import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    
    // SECURITY: The raw/redacted text is passed here, not in the messages array
    const documentContext = body.documentContext; 

    let processedMessages = [...messages];

    // If a document was uploaded, inject it into the last user message securely
    if (documentContext) {
      const lastMessage = processedMessages[processedMessages.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        lastMessage.content = `${lastMessage.content}\n\n[SECURE DOCUMENT CONTEXT START]\n${documentContext}\n[SECURE DOCUMENT CONTEXT END]\n\nAnalyze this document. Identify key numbers, rates, and terms.`;
      }
    }

    const result = await streamText({
      model: deepseek('deepseek-chat'),
      system: `You are VANTAGE, the ultimate 24/7 mortgage and real estate financing assistant. You are a problem-solver. Be concise, mobile-first, and prioritize compliance.`,
      messages: processedMessages,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
