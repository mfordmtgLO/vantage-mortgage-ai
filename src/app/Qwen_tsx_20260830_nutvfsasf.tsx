export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">VANTAGE</h1>
          <p className="text-gray-400 text-sm mt-2">Your 24/7 Mortgage AI Assistant</p>
        </header>
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 text-center">
           <p className="text-gray-300">Boilerplate loaded. Ready for the AI brain.</p>
        </div>
      </div>
    </main>
  );
}