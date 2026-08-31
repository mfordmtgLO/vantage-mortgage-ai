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
    const documentContext = body.documentContext; 

    let processedMessages = [...messages];

    if (documentContext) {
      const lastMessage = processedMessages[processedMessages.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        lastMessage.content = `${lastMessage.content}\n\n[SECURE DOCUMENT CONTEXT START]\n${documentContext}\n[SECURE DOCUMENT CONTEXT END]\n\nAnalyze this document. Format your response as a 'Speech-Ready Script' for a mortgage client. Use clear, conversational language, short paragraphs, and bullet points. Avoid heavy jargon.`;
      }
    }

    const result = await streamText({
      model: deepseek('deepseek-chat'),
      system: `You are VANTAGE, the ultimate 24/7 mortgage and real estate financing assistant. You are a problem-solver. Be concise, mobile-first, and prioritize compliance. When analyzing documents, always format your output as a 'Speech-Ready Script' that a loan officer can easily read aloud to a client.`,
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
