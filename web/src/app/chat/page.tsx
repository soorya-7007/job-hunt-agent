"use client";

import { useState, useRef, useEffect } from "react";
import { API } from "@/lib/api";
import { Bot, User, ArrowUp, Sparkles, Loader2 } from "lucide-react";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
}

const SUGGESTED_PROMPTS = [
  "Find remote Python roles with salary > ₹25L",
  "What jobs match my Docker & FastAPI experience?",
  "Show high-match GenAI jobs in Bangalore",
  "How should I answer 'Tell me about yourself'?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I am your AI career search assistant. I can search our live index for specific roles, filter by location and salary, or give advice based on your uploaded resume skills. What roles are you targeting today?",
      isUser: false,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounterRef = useRef<number>(2);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const nextId = idCounterRef.current++;
    const userMessage: Message = { id: nextId, text, isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await API.chat(text);
      const botMessage: Message = {
        id: idCounterRef.current++,
        text: response.reply || "I couldn't generate a response. Please try again.",
        isUser: false,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: idCounterRef.current++,
          text: "I encountered an error communicating with the agent backend. Please ensure the server is running.",
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const formatText = (text: string) => {
    return text.split("\n").map((str, index) => (
      <span key={index}>
        {str.split(/\*\*(.*?)\*\*/g).map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="font-bold text-slate-900">
              {part}
            </strong>
          ) : (
            part
          )
        )}
        <br />
      </span>
    ));
  };

  return (
    <main className="w-full flex-1 flex flex-col max-w-4xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-64px)]">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-base text-slate-900">
              AI Career Assistant
            </h1>
            <p className="text-xs text-slate-500">
              Natural language role queries and career advice grounded in your profile.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Online</span>
        </div>
      </div>

      {/* Suggested Prompts Ribbon */}
      <div className="py-3 flex items-center gap-1.5 overflow-x-auto custom-scroll shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span className="text-[11px] text-slate-500 font-medium shrink-0 mr-1">Suggestions:</span>
        {SUGGESTED_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[11px] font-medium text-slate-700 whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4 bg-white border border-slate-200 rounded-2xl">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${
              msg.isUser ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                msg.isUser
                  ? "bg-slate-900 text-white"
                  : "bg-blue-50 text-blue-700 border border-blue-100"
              }`}
            >
              {msg.isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                msg.isUser
                  ? "bg-slate-900 text-white font-medium"
                  : "bg-slate-50 border border-slate-200 text-slate-800 font-normal"
              }`}
            >
              {msg.isUser ? msg.text : formatText(msg.text)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center text-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-xl p-3.5 bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-3 shrink-0 flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask anything about roles, salaries, or interview tips..."
          className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-xs"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center shadow-xs transition-colors disabled:opacity-50"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </form>
    </main>
  );
}
