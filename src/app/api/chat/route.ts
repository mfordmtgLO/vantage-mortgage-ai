import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import pdfParse from 'pdf-parse';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Create a copy of messages to modify
    let processedMessages = [...messages];
    const lastMessage = processedMessages[processedMessages.length - 1];

    // Check if the last message has attachments
    if (lastMessage?.experimental_attachments?.length > 0) {
      const attachment = lastMessage.experimental_attachments[0];
      
      if (attachment.contentType === 'application/pdf' && attachment.url) {
        try {
          // Convert base64 URL to buffer
          const base64Data = attachment.url.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Parse the PDF text
          const pdfData = await pdfParse(buffer);
          
          // Replace the attachment with the extracted text to save tokens
          processedMessages[processedMessages.length - 1] = {
            ...lastMessage,
            content: `${lastMessage.content}\n\n[PDF EXTRACTED TEXT START]\n${pdfData.text}\n[PDF EXTRACTED TEXT END]\n\nAnalyze this tax return. Identify Gross Receipts, Total Expenses, and call out potential add-backs (Depreciation, Amortization, One-time expenses, Home Office, Auto). Calculate the adjusted qualifying income.`,
            experimental_attachments: undefined // Remove attachment object to prevent OpenAI API errors
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