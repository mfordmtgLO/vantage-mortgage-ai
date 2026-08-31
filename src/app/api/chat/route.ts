import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    let processedMessages = [...messages];
    const lastMessage = processedMessages[processedMessages.length - 1];

    // Check if the user attached a file
    if (lastMessage?.experimental_attachments?.length > 0) {
      const attachment = lastMessage.experimental_attachments[0];
      
      if (attachment.contentType === 'application/pdf' && attachment.url) {
        try {
          // Dynamic require bypasses Next.js ESM strictness
          const pdfParse = require('pdf-parse');
          
          // Convert base64 data URL to buffer
          const base64Data = attachment.url.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Extract text from the PDF
          const pdfData = await pdfParse(buffer);
          
          // Replace the attachment object with the extracted text to save tokens and prevent API errors
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\n[PDF EXTRACTED TEXT START]\n${pdfData.text}\n[PDF EXTRACTED TEXT END]\n\nAnalyze this tax return. Identify Gross Receipts, Total Expenses, and specifically call out potential add-backs (Depreciation, Depletion, Amortization, One-time expenses, Home Office, Auto). Calculate the adjusted qualifying income.`,
            experimental_attachments: undefined 
          };
        } catch (error) {
          console.error('PDF Parse Error:', error);
          return new Response('Failed to parse PDF. Please ensure it is a valid, text-based PDF.', { status: 400 });
        }
      }
    }

    const result = await streamText({
      model: deepseek('deepseek-chat'),
      system: `You are VANTAGE, the ultimate 24/7 mortgage and real estate financing assistant. You are a problem-solver. Be concise, mobile-first, and prioritize compliance.`,
      messages: processedMessages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('API Route Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}