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
    
    // The frontend is sending the attachment INSIDE the last message object
    const lastMessage = messages[messages.length - 1];
    const attachments = lastMessage?.experimental_attachments || lastMessage?.attachments;

    console.log(' INCOMING PAYLOAD KEYS:', Object.keys(body));
    console.log('📎 ATTACHMENTS FOUND IN MESSAGE:', !!attachments);

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
          
          // Inject the text and clean up the attachment object
          lastMessage.content = `${lastMessage.content}\n\n[PDF EXTRACTED TEXT START]\n${pdfData.text}\n[PDF EXTRACTED TEXT END]\n\nAnalyze this document. Identify key numbers, rates, and terms.`;
          delete lastMessage.experimental_attachments;
          delete lastMessage.attachments;
          
          console.log('✅ PDF PARSED SUCCESSFULLY. Text length:', pdfData.text.length);
        } catch (error) {
          console.error('❌ PDF PARSE ERROR:', error);
          return new Response('Failed to parse PDF.', { status: 400 });
        }
      }
    } else {
      console.log('ℹ️ NO ATTACHMENT FOUND in message.');
    }

    const result = await streamText({
      model: deepseek('deepseek-chat'),
      system: `You are VANTAGE, the ultimate 24/7 mortgage and real estate financing assistant. You are a problem-solver. Be concise, mobile-first, and prioritize compliance.`,
      messages: processedMessages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('🔥 API Route Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
