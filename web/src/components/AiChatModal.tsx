import { useState } from "react";
import { Sparkles, Send, X } from "lucide-react";
import { askMkulimaAI } from "../lib/aiAgronomist";

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiChatModal({ isOpen, onClose }: AiChatModalProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;
    setLoading(true);
    setAnswer("");
    const response = await askMkulimaAI(question);
    setAnswer(response);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-600" /> 
          Mkulima Agronomist AI
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Ask about weather, pests, soil, harvesting, or livestock.
        </p>
        
        <form onSubmit={handleAsk} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="e.g., Will it rain in Kisii this week?"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" disabled={loading} className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        </form>

        {loading && <p className="text-sm text-gray-500 animate-pulse">AI is thinking...</p>}
        
        {answer && (
          <div className="bg-purple-50 p-4 rounded-lg text-sm text-gray-800 border border-purple-100 max-h-60 overflow-y-auto">
            <strong>AI Advice:</strong> {answer}
          </div>
        )}
      </div>
    </div>
  );
}