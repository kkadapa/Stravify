import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Activity, MessageSquare, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// TODO: Replace with your actual Strava Client ID
// TODO: Replace with your actual Strava Client ID
const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const REDIRECT_URI = "http://localhost:5173";
const BACKEND_URL = "http://localhost:8000";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [stravaToken, setStravaToken] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check for auth code in URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code && !isAuthenticated) {
      handleAuthExchange(code);
      // Clean URL
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  const handleAuthExchange = async (code) => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/auth/exchange`, { code });
      if (res.data.access_token) {
        setStravaToken(res.data.access_token);
        setIsAuthenticated(true);
        setMessages([{ role: 'ai', content: "Hello! I'm connected to your Strava. Ask me anything about your activities!" }]);
      }
    } catch (err) {
      console.error("Auth failed", err);
      alert("Failed to connect with Strava.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&approval_prompt=force&scope=activity:read_all,profile:read_all`;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !stravaToken) return;

    const userMsg = inputText.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputText("");
    setIsLoading(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/chat`, {
        message: userMsg,
        strava_token: stravaToken
      });

      setMessages(prev => [...prev, { role: 'ai', content: res.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error analyzing your data." }]);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white p-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/20 rounded-full">
              <Activity className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Stravify - Ask your running data</h1>
          <p className="text-secondary text-lg">
            Chat with your running data using AI. Connect your account to get started.
            (How many miles did I run last year 2025?)
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 bg-primary hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            Connect with Strava
          </button>

          <div className="text-sm text-secondary mt-8">
            <p>Make sure to configure your Client ID in the code.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10 bg-surface/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Stravify - Ask your running activities</h1>
        </div>
        <div className="text-xs text-green-400 flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Connected
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-surface scrollbar-track-transparent">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex w-full mb-4",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap",
                msg.role === 'user'
                  ? "bg-primary text-white rounded-tr-none"
                  : "bg-surface text-gray-100 rounded-tl-none border border-white/5"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start w-full">
            <div className="bg-surface p-4 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2 text-secondary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing your runs...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-surface/30 backdrop-blur-md border-t border-white/10">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center gap-2">
          <input
            type="text"
            className="flex-1 bg-background/50 border border-white/10 rounded-full py-3 px-6 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="Ask about your recent activities..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-primary hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-full transition-colors duration-200 shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;
