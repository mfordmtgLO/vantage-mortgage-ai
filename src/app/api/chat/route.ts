import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

// INCREASE TIME LIMIT to 60 seconds to prevent 504 timeouts
export const maxDuration = 60;

// Helper to parse PDF with a safety timeout
function parsePDFBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const PDFParser = require("pdf2json");
    const pdfParser = new PDFParser();
    
    // Safety timeout: if parsing takes > 20 seconds, abort to prevent 504
    const timeout = setTimeout(() => reject(new Error("PDF parsing took too long")), 20000);

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      clearTimeout(timeout);
      let fullText = "";
      pdfData.Pages.forEach((page: any) => {
        page.Texts.forEach((textItem: any) => {
          fullText += decodeURIComponent(textItem.R.map((r: any) => r.T).join(" "));
        });
        fullText += "\n";
      });
      resolve(fullText);
    });

    pdfParser.on("pdfParser_dataError", (err: any) => {
      clearTimeout(timeout);
      reject(err);
    });

    pdfParser.parseBuffer(buffer);
  });
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
          const base64Data = attachment.url.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          const extractedText = await parsePDFBuffer(buffer);
          
          lastMessage.content = `${lastMessage.content}\n\n[PDF EXTRACTED TEXT START]\n${extractedText}\n[PDF EXTRACTED TEXT END]\n\nAnalyze this document. Identify key numbers, rates, and terms.`;
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
