'use client';
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <main className="flex min-h-screen flex-col bg-gray-900 text-white">
      <div className="w-full max-w-md mx-auto flex flex-col h-screen">
        {/* Header */}
        <header className="p-4 border-b border-gray-800 text-center sticky top-0 bg-gray-900 z-10">
          <h1 className="text-2xl font-bold text-blue-400">VANTAGE</h1>
          <p className="text-gray-400 text-xs">Your 24/7 Mortgage AI Assistant</p>
        </header>
        
        {/* Chat Window */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-24">
          {messages.length === 0 && (
             <div className="text-center text-gray-500 mt-10">
                <p className="text-lg">Vantage online.</p>
                <p className="text-sm mt-2">Ready to structure some wins. What's the scenario, boss?</p>
             </div>
          )}
          
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700 prose prose-invert prose-sm max-w-none'
              }`}>
                {m.role === 'user' ? (
                  m.content
                ) : (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
             <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-400 p-3 rounded-2xl rounded-bl-none border border-gray-700 text-sm">
                  <span className="animate-pulse">Thinking...</span>
                </div>
             </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800 fixed bottom-0 w-full max-w-md bg-gray-900">
          <div className="flex gap-2">
            <input 
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about a scenario, rate, or guideline..." 
              className="flex-1 bg-gray-800 text-white p-3 rounded-full border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-full font-semibold transition text-sm"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}