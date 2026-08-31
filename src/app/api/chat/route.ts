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
    
    console.log(' Received messages:', JSON.stringify(messages, null, 2));
    
    let processedMessages = [...messages];
    const lastMessage = processedMessages[processedMessages.length - 1];

    // Debug: Check if attachments exist
    if (lastMessage?.experimental_attachments) {
      console.log('📎 Attachments found:', lastMessage.experimental_attachments);
      
      const attachment = lastMessage.experimental_attachments[0];
      
      if (attachment.contentType === 'application/pdf' && attachment.url) {
        console.log('📄 Processing PDF:', attachment.name);
        
        try {
          const pdfParse = require('pdf-parse');
          const base64Data = attachment.url.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const pdfData = await pdfParse(buffer);
          
          console.log('✅ PDF parsed successfully, text length:', pdfData.text.length);
          
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\n[PDF EXTRACTED TEXT START]\n${pdfData.text}\n[PDF EXTRACTED TEXT END]\n\nAnalyze this tax return. Identify Gross Receipts, Total Expenses, and specifically call out potential add-backs (Depreciation, Depletion, Amortization, One-time expenses, Home Office, Auto). Calculate the adjusted qualifying income.`,
            experimental_attachments: undefined 
          };
        } catch (error) {
          console.error('❌ PDF Parse Error:', error);
          return new Response('Failed to parse PDF. Please ensure it is a valid, text-based PDF.', { status: 400 });
        }
      }
    } else {
      console.log('ℹ️ No attachments found in message');
    }

    const result = await streamText({
      model: deepseek('deepseek-chat'),
      system: `You are VANTAGE, the ultimate 24/7 mortgage and real estate financing assistant. You are a problem-solver. Be concise, mobile-first, and prioritize compliance.`,
      messages: processedMessages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error(' API Route Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}