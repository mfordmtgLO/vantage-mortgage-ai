export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">VANTAGE</h1>
          <p className="text-gray-400 text-sm mt-2">Your 24/7 Mortgage AI Assistant</p>
        </header>
        
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
          <div className="h-96 overflow-y-auto mb-4 flex flex-col gap-3" id="chat-window">
            <div className="bg-blue-600 text-white p-3 rounded-lg self-start max-w-[80%]">
              <p className="text-sm">Vantage online. Ready to structure some wins. What's the scenario, boss?</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Ask about a scenario, rate, or guideline..." 
              className="flex-1 bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
            />
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition">
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}