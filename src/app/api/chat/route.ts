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
    
    // Check ALL possible locations the SDK might hide the attachment
    const attachments = body.experimental_attachments || 
                        body.attachments || 
                        messages[messages.length - 1]?.experimental_attachments || 
                        messages[messages.length - 1]?.attachments;

    console.log(' INCOMING PAYLOAD KEYS:', Object.keys(body));
    console.log('📎 ATTACHMENTS FOUND:', !!attachments);

    let processedMessages = [...messages];

    if (attachments && attachments.length > 0) {
      console.log('📄 ATTACHMENT DETECTED! Processing PDF...');
      const attachment = attachments[0];
      
      if (attachment.contentType === 'application/pdf' && attachment.url) {
        try {
          const pdfParse = require('pdf-parse');
          const base64Data = attachment.url.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const pdfData = await pdfParse(buffer);
          
          const lastMessage = processedMessages[processedMessages.length - 1];
          lastMessage.content = `${lastMessage.content}\n\n[PDF EXTRACTED TEXT START]\n${pdfData.text}\n[PDF EXTRACTED TEXT END]\n\nAnalyze this tax return. Identify Gross Receipts, Total Expenses, and specifically call out potential add-backs (Depreciation, Depletion, Amortization, One-time expenses, Home Office, Auto). Calculate the adjusted qualifying income.`;
          
          // Clean up the message so the AI doesn't get confused by the raw base64
          if (lastMessage.experimental_attachments) delete lastMessage.experimental_attachments;
          if (lastMessage.attachments) delete lastMessage.attachments;
          
          console.log('✅ PDF PARSED SUCCESSFULLY. Text length:', pdfData.text.length);
        } catch (error) {
          console.error('❌ PDF PARSE ERROR:', error);
          return new Response('Failed to parse PDF. Please ensure it is a valid, text-based PDF.', { status: 400 });
        }
      }
    } else {
      console.log('ℹ️ NO ATTACHMENT FOUND in payload.');
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