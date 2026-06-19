import React, { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import { API } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Sparkles, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "../components/Markdown";

export default function AIChat() {
  const [sessionId] = useState(() => `chat-${Date.now()}`);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi, I'm **Verdant**, your AI health assistant. Ask me anything — symptoms, medications, healthy habits, or how this platform works. I'll always remind you to talk to a doctor for diagnosis." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const token = localStorage.getItem("verdant_token");
      const res = await fetch(`${API}/ai/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId, message: userMsg }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.delta) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + data.delta };
                return copy;
              });
            }
          }
        }
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "_Sorry, something went wrong._" };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-6 flex flex-col">
        <div className="mb-6">
          <div className="overline mb-1 flex items-center gap-2"><Sparkles className="h-3 w-3 text-terra" /> Health Assistant</div>
          <h1 className="font-display text-3xl font-light tracking-tight">Talk to Verdant.</h1>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4" data-testid="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} fade-in`}>
              <Card className={`max-w-[80%] p-4 rounded-2xl ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`} data-testid={`message-${i}`}>
                {m.role === "assistant" ? (
                  m.content ? <ReactMarkdown content={m.content} /> : <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <div className="text-sm">{m.content}</div>
                )}
              </Card>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 pt-4 border-t border-border">
          <Input
            placeholder="Ask anything about your health…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            disabled={streaming}
            data-testid="chat-input"
            className="rounded-full h-11"
          />
          <Button onClick={send} disabled={streaming} className="rounded-full bg-primary hover:bg-primary/90 h-11" data-testid="chat-send-btn">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
