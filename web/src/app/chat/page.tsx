"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API } from "@/lib/api";
import { Bot, User, ArrowUp, Sparkles } from "lucide-react";

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
      <span key={index} className="block">
        {str.split(/\*\*(.*?)\*\*/g).map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="font-bold text-violet-800">
              {part}
            </strong>
          ) : (
            part
          )
        )}
      </span>
    ));
  };

  return (
    <main className="w-full flex-1 flex flex-col max-w-4xl mx-auto px-3 sm:px-6 py-6 h-[calc(100vh-80px)] relative">
      {/* Ambient aurora */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="animate-blob absolute -top-24 left-1/4 w-[380px] h-[300px] rounded-full bg-violet-200/35 blur-3xl" />
        <div className="animate-blob-delayed absolute top-1/3 -right-20 w-[340px] h-[280px] rounded-full bg-fuchsia-200/30 blur-3xl" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 rounded-2xl bg-white/75 backdrop-blur-xl border border-violet-100 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.15)] mb-3 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-base text-slate-900">
              AI Career Assistant
            </h1>
            <p className="text-xs text-slate-500">
              Natural language role queries grounded in your profile.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
          </span>
          <span>Online</span>
        </div>
      </motion.div>

      {/* Suggested Prompts Ribbon */}
      <div className="pb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
        <span className="text-[11px] text-slate-500 font-medium shrink-0 mr-1">Suggestions:</span>
        {SUGGESTED_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(prompt)}
            className="px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-violet-100 hover:border-violet-400 hover:bg-violet-50 text-[11px] font-medium text-slate-700 whitespace-nowrap transition-all hover:-translate-y-0.5 shadow-sm"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4 bg-white/70 backdrop-blur-xl border border-violet-100 rounded-2xl shadow-[0_8px_30px_-12px_rgba(124,58,237,0.12)]">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`flex gap-3 max-w-[85%] ${msg.isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                msg.isUser
                  ? "bg-slate-900 text-white"
                  : "bg-brand-gradient text-white shadow-violet-500/25"
              }`}
            >
              {msg.isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                msg.isUser
                  ? "bg-brand-gradient text-white font-medium rounded-tr-md"
                  : "bg-violet-50/70 border border-violet-100 text-slate-800 font-normal rounded-tl-md"
              }`}
            >
              {msg.isUser ? msg.text : formatText(msg.text)}
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center">
            <div className="w-8 h-8 rounded-xl bg-brand-gradient text-white flex items-center justify-center text-xs shadow-sm shadow-violet-500/25">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl rounded-tl-md p-4 bg-violet-50/70 border border-violet-100 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:300ms]" />
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
        className="pt-3 shrink-0 relative"
      >
        <div className="absolute -inset-0.5 bg-brand-gradient rounded-2xl opacity-0 blur transition-opacity focus-within:opacity-25 pointer-events-none" />
        <div className="relative flex items-center gap-2 bg-white rounded-2xl border border-violet-200/80 shadow-lg shadow-violet-500/10 p-1.5 pl-4 transition-all focus-within:border-violet-400">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything about roles, salaries, or interview tips..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2.5 bg-brand-gradient text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all disabled:opacity-40 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </form>
    </main>
  );
}
