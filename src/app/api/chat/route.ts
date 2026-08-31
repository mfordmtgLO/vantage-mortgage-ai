import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export const maxDuration = 30;

// ️ POLYFILL: Mock browser APIs that pdf-parse tries to use in Node.js serverless
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {}
    multiply() { return this; }
    transformPoint() { return { x: 0, y: 0 }; }
  } as any;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    const lastMessage = messages[messages.length - 1];
    const attachments = lastMessage?.experimental_attachments || lastMessage?.attachments;

    let processedMessages = [...messages];

    if (attachments && attachments.length > 0) {
      const attachment = attachments[0];
      if (attachment.contentType === 'application/pdf' && attachment.url) {
        try {
          // Dynamic require bypasses Next.js ESM strictness
          const pdfParse = require('pdf-parse');
          const base64Data = attachment.url.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const pdfData = await pdfParse(buffer);
          
          lastMessage.content = `${lastMessage.content}\n\n[PDF EXTRACTED TEXT START]\n${pdfData.text}\n[PDF EXTRACTED TEXT END]\n\nAnalyze this document. Identify key numbers, rates, and terms.`;
          delete lastMessage.experimental_attachments;
          delete lastMessage.attachments;
        } catch (error: any) {
          return new Response(JSON.stringify({ error: 'PDF Parse Failed', details: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
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