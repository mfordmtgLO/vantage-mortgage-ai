'use client';
import ReactMarkdown from 'react-markdown';
import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from "jspdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const redactPII = (text: string): string => {
  return text.replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, '***-**-****');
};

export default function Home() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const sendMessage = async (cleanUiMessage: any, documentContext?: string) => {
    const newAssistantId = `assistant-${Date.now()}`;
    const updatedMessages = [
      ...messages, 
      cleanUiMessage, 
      { role: 'assistant', content: '', id: newAssistantId }
    ];
    
    setMessages(updatedMessages);
    setIsLoading(true);
    setInput('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, cleanUiMessage],
          documentContext: documentContext 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('0:')) {
              let text = line.slice(2);
              try {
                const parsed = JSON.parse(text);
                text = typeof parsed === 'string' ? parsed : parsed.text || '';
              } catch (e) {}
              
              assistantContent += text;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (newMessages[lastIndex].id === newAssistantId) {
                  newMessages[lastIndex].content = assistantContent;
                }
                return newMessages;
              });
            }
          }
        }
      }
    } catch (error: any) {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = `Error: ${error.message}`;
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadResponseAsPDF = (content: string) => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(content, 170); 
    doc.setFontSize(12);
    doc.text(splitText, 10, 10);
    doc.save(`Vantage-Speech-Script-${Date.now()}.pdf`);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    const cleanUiMessage = { 
      role: 'user', 
      content: selectedFile ? `Analyze this document: ${selectedFile.name}` : input, 
      id: `user-${Date.now()}` 
    };

    if (selectedFile) {
      setIsLoading(true); 
      setMessages(prev => [...prev, { role: 'user', content: `Processing ${selectedFile.name}...`, id: `temp-${Date.now()}` }]);
      
      try {
        const rawText = await extractTextFromPDF(selectedFile);
        setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
        
        const sanitizedText = redactPII(rawText);
        await sendMessage(cleanUiMessage, sanitizedText);
      } catch (err: any) {
        setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error reading PDF: ${err.message}`, 
          id: `error-${Date.now()}` 
        }]);
        setIsLoading(false);
        return;
      }
    } else {
      await sendMessage(cleanUiMessage);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-gray-900 text-white">
      <div className="w-full max-w-md mx-auto flex flex-col h-screen">
        <header className="p-4 border-b border-gray-800 text-center sticky top-0 bg-gray-900 z-10">
          <h1 className="text-2xl font-bold text-blue-400">VANTAGE</h1>
          <p className="text-gray-400 text-xs">Your 24/7 Mortgage AI Assistant</p>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-24">
          {messages.length === 0 && (
             <div className="text-center text-gray-500 mt-10">
                <p className="text-lg">Vantage online.</p>
                <p className="text-sm mt-2">Ready to structure some wins. What's the scenario, boss?</p>
             </div>
          )}
          
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-4 rounded-2xl text-sm ${
                m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700 prose prose-invert prose-sm max-w-none'
              }`}>
                {m.role === 'user' ? (
                  m.content
                ) : (
                  <>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    
                    {/* MASSIVE OBVIOUS DOWNLOAD BUTTON */}
                    {m.content && m.content.length > 10 && (
                      <button 
                        onClick={() => downloadResponseAsPDF(m.content)}
                        className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg border border-blue-400"
                      >
                        <span>⬇️</span> Download Speech-Ready PDF
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.content === '' && (
             <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-400 p-3 rounded-2xl rounded-bl-none border border-gray-700 text-sm">
                  <span className="animate-pulse">Crunching the numbers...</span>
                </div>
             </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="p-4 border-t border-gray-800 fixed bottom-0 w-full max-w-md bg-gray-900">
          {selectedFile && (
            <div className="mb-2 text-xs bg-gray-800 p-2 rounded flex justify-between items-center">
              <span className="truncate max-w-[200px]">📎 {selectedFile.name}</span>
              <button type="button" onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-400 font-bold ml-2">✕</button>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <input type="file" accept=".pdf,.txt,.csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition shrink-0">📎</button>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question or attach a Schedule C..." className="flex-1 bg-gray-800 text-white p-3 rounded-full border border-gray-700 focus:outline-none focus:border-blue-500 text-sm min-w-0" disabled={isLoading} />
            <button type="submit" disabled={isLoading || (!input.trim() && !selectedFile)} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-full font-semibold transition text-sm shrink-0">Send</button>
          </div>
        </form>
      </div>
    </main>
  );
}
