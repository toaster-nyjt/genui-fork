"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ChatPanel, { Message } from "./components/ChatPanel";
import CodePreviewPanel from "./components/CodePreviewPanel";

// Strip markdown code fences from generated code
function stripCodeFences(code: string): string {
  // Remove opening fence: ```tsx, ```typescript, ```jsx, ```javascript, or just ```
  let stripped = code.replace(/^```(?:tsx?|jsx?|typescript|javascript)?\s*\n?/i, "");
  // Remove closing fence: ```
  stripped = stripped.replace(/\n?```\s*$/i, "");
  return stripped;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  // Called in API calling function, sets -> stream updates code -> sets again
  const [generatedCode, setGeneratedCode] = useState<string>("");
  // Informs components on if API is streaming resulting code
  const [isGenerating, setIsGenerating] = useState(false);
  // Proportion of main div that is the left chat panel
  const [splitPosition, setSplitPosition] = useState(38.2); // golden ratio: ~38.2% : ~61.8%
  // Whether mouse is down, applies only to drag bar
  const [isDragging, setIsDragging] = useState(false);
  // Pattern: Setting useRef vars of DOM objects (this is the main wrap container)
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // mouse drag bar->change width of chat panel
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const container = containerRef.current; 
      const rect = container.getBoundingClientRect(); // Position of main div
      // Handles proportion of container to the left of drag bar
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      
      // Clamp between 25% and 75%
      setSplitPosition(Math.min(75, Math.max(25, percentage)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    // Adds the event listeners only after drag, nothing on load in
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    // Cleanups
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  // Load-bearing 10%
  // Gets called when user sends prompt, function is cached with useCallback
  const handleSend = useCallback(async (prompt: string) => {
    // Create new user message from prompt
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    };
    // Destructures previous messages for multi-turn interaction
    setMessages((prev) => [...prev, userMessage]); // prev is current message[], adds the new message
    setIsGenerating(true); // Sets isStreaming 
    setGeneratedCode("");

    try {
      // Calls API Route (in route.ts)
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Sends in the latest prompt along with message history
        body: JSON.stringify({
          prompt,
          // Utilizes the messages state var
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullCode = "";

      // Gradual setting of code -> changes generatedCode
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullCode += chunk;
          setGeneratedCode(stripCodeFences(fullCode)); // Connects LLM output
        }
      }

      // Add assistant message (static response message)
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Component generated successfully! Check the Code tab to see the result.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Generation error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, there was an error generating the component. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false); // Shuts off isStreaming 
    }
  }, [messages]);

  return (
    <div 
      ref={containerRef} // Initializes .current
      className="flex h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Left Panel - Chat */}
      <div 
        className="h-full shrink-0"
        style={{ width: `${splitPosition}%` }}  
      >
        <ChatPanel
          messages={messages}
          onSend={handleSend} // Key: In ChatPanel: setInput -> handleSubmit -> onSend -> handleSend
          isGenerating={isGenerating}
        />
      </div>

      {/* Resizable Divider */}
      <div
        className="group relative h-full w-1 shrink-0 cursor-col-resize transition-colors"
        style={{ 
          backgroundColor: isDragging ? 'var(--divider-hover)' : 'var(--divider)',
        }}
        // Sets dragging to true
        onMouseDown={() => setIsDragging(true)}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.backgroundColor = 'var(--divider-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.backgroundColor = 'var(--divider)';
          }
        }}
      >
        <div 
          className="absolute inset-y-0 -left-1 -right-1"
          style={{ backgroundColor: isDragging ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}
        />
      </div>

      {/* Right Panel - Code/Preview */}
      <div className="h-full min-w-0 flex-1">
        <CodePreviewPanel code={generatedCode} isStreaming={isGenerating} />
      </div>
    </div>
  );
}
