'use client';
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import { useState, useRef } from 'react';

export default function Home() {
  const { messages, input, handleInputChange, setMessages } = useChat();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const sendMessage = async (userMessage: any) => {
    // Update UI immediately
    setMessages([...messages, userMessage]);
    setIsStreaming(true);
    handleInputChange({ target: { value: '' } } as any);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      // Custom fetch call bypasses the SDK's broken append function
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

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
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantContent += parsed.text;
                  setMessages([...messages, userMessage, { 
                    role: 'assistant', 
                    content: assistantContent, 
                    id: `assistant-${Date.now()}` 
                  }]);
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    const userMessage: any = {
      role: 'user',
      content: input || `Analyze this document: ${selectedFile?.name}`,
    };

    if (selectedFile) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        userMessage.experimental_attachments = [
          {
            name: selectedFile.name,
            contentType: selectedFile.type,
            url: reader.result as string,
          },
        ];
        await sendMessage(userMessage);
      };
    } else {
      await sendMessage(userMessage);
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
              <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700 prose prose-invert prose-sm max-w-none'
              }`}>
                {m.role === 'user' ? (
                  <>
                    {(m as any).experimental_attachments?.map((att: any, i: number) => (
                      <div key={i} className="text-xs bg-blue-700 p-2 rounded mb-2 flex items-center gap-2">
                        📎 {att.name}
                      </div>
                    ))}
                    {m.content}
                  </>
                ) : (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          
          {isStreaming && (
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
              <span className="truncate max-w-[200px]"> {selectedFile.name}</span>
              <button type="button" onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-400 font-bold ml-2">✕</button>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <input 
              type="file" 
              accept=".pdf,.txt,.csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange} 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition shrink-0"
              title="Attach Tax Return"
            >
              📎
            </button>
            <input 
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question or attach a Schedule C..." 
              className="flex-1 bg-gray-800 text-white p-3 rounded-full border border-gray-700 focus:outline-none focus:border-blue-500 text-sm min-w-0"
              disabled={isStreaming}
            />
            <button 
              type="submit"
              disabled={isStreaming || (!input.trim() && !selectedFile)}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-full font-semibold transition text-sm shrink-0"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}