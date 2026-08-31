import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // The SDK sends attachments at the ROOT of the body, not inside messages!
    const { messages, experimental_attachments } = await req.json();
    
    console.log('📥 INCOMING PAYLOAD:', { 
      hasMessages: !!messages, 
      hasAttachments: !!experimental_attachments 
    });

    let processedMessages = [...messages];

    // Check for attachments at the root level
    if (experimental_attachments && experimental_attachments.length > 0) {
      console.log(' ATTACHMENT DETECTED AT ROOT! Processing PDF...');
      const attachment = experimental_attachments[0];
      
      if (attachment.contentType === 'application/pdf' && attachment.url) {
        try {
          // Dynamic require bypasses Next.js ESM strictness
          const pdfParse = require('pdf-parse');
          
          // Convert base64 data URL to buffer
          const base64Data = attachment.url.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Extract text from the PDF
          const pdfData = await pdfParse(buffer);
          
          // Inject the extracted text into the last user message
          const lastMessage = processedMessages[processedMessages.length - 1];
          lastMessage.content = `${lastMessage.content}\n\n[PDF EXTRACTED TEXT START]\n${pdfData.text}\n[PDF EXTRACTED TEXT END]\n\nAnalyze this tax return. Identify Gross Receipts, Total Expenses, and specifically call out potential add-backs (Depreciation, Depletion, Amortization, One-time expenses, Home Office, Auto). Calculate the adjusted qualifying income.`;
          
          console.log('✅ PDF PARSED SUCCESSFULLY. Text length:', pdfData.text.length);
        } catch (error) {
          console.error('❌ PDF PARSE ERROR:', error);
          return new Response('Failed to parse PDF. Please ensure it is a valid, text-based PDF.', { status: 400 });
        }
      }
    } else {
      console.log('ℹ️ NO ATTACHMENT FOUND at root level.');
    }

    const result = await streamText({
      model: deepseek('deepseek-chat'),
      system: `You are VANTAGE, the ultimate 24/7 mortgage and real estate financing assistant. You are a problem-solver. Be concise, mobile-first, and prioritize compliance.`,
      messages: processedMessages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('🔥 API Route Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}