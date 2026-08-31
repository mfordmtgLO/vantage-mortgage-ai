import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    let processedMessages = [...messages];
    const lastMessage = processedMessages[processedMessages.length - 1];

    if (lastMessage?.experimental_attachments?.length > 0) {
      const attachment = lastMessage.experimental_attachments[0];
      
      if (attachment.contentType === 'application/pdf' && attachment.url) {
        try {
          // Dynamically require to completely bypass Next.js ESM import issues with pdf-parse
          const pdfParse = require('pdf-parse');
          
          const base64Data = attachment.url.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          const pdfData = await pdfParse(buffer);
          
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\n[PDF EXTRACTED TEXT START]\n${pdfData.text}\n[PDF EXTRACTED TEXT END]\n\nAnalyze this tax return. Identify Gross Receipts, Total Expenses, and call out potential add-backs (Depreciation, Amortization, One-time expenses, Home Office, Auto). Calculate the adjusted qualifying income.`,
            experimental_attachments: undefined
          };
        } catch (error) {
          console.error('PDF Parse Error:', error);
          return new Response('Failed to parse PDF. Please ensure it is a valid, text-based PDF.', { status: 400 });
        }
      }
    }

    const result = await streamText({
      model: openai('gpt-4o') as any,
      system: `You are VANTAGE, the ultimate 24/7 mortgage and real estate financing assistant. You are a problem-solver. Be concise, mobile-first, and prioritize compliance.`,
      messages: processedMessages,
    });

    return (result as any).toDataStreamResponse();
  } catch (error) {
    console.error('API Route Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}