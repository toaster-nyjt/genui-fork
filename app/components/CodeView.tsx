"use client";
import CodeProps from "@/app/utils/spec";
import useHandleDarkMode from "../utils/darkmode";
import { useEffect, useState, useRef } from "react";
import { codeToHtml } from "shiki";

// Shows the code that agent generates
export default function CodeView({ code, isStreaming }: CodeProps) {
  // Updates the displayed code
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");

  const codeContainerRef = useRef<HTMLDivElement>(null);
  // To determine how much the code has changed
  const lastCodeRef = useRef<string>("");

  const { isDarkMode } = useHandleDarkMode();

  // Updates displayed code
  useEffect(() => {
    // Only re-highlight if code changed significantly or streaming stopped
    const shouldHighlight =
      !isStreaming ||
      code.length - lastCodeRef.current.length > 50 ||
      code.length === 0;

    if (shouldHighlight && code) {
      // Set new ref to current code
      lastCodeRef.current = code;
      // Calls setter to update the embedded code view (in color coded html)
      codeToHtml(code, {
        lang: "tsx",
        theme: isDarkMode ? "github-dark" : "github-light",
      }).then(setHighlightedHtml);
    } else if (!code) {
      setHighlightedHtml("");
    }
  }, [code, isStreaming, isDarkMode]);

  useEffect(() => {
    // Auto-scroll to bottom while streaming
    if (isStreaming && codeContainerRef.current) {
      codeContainerRef.current.scrollTop =
        codeContainerRef.current.scrollHeight;
    }
  }, [code, isStreaming]);

  // Allows copy code button
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
  };

  // Initial
  if (!code) {
    return (
      <div 
        className="flex h-full flex-col items-center justify-center text-center"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="mb-4 rounded-full p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <svg
            className="h-8 w-8"
            style={{ color: 'var(--text-faint)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </div>
        <h3 className="mb-1 text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>No code yet</h3>
        <p className="max-w-xs text-sm" style={{ color: 'var(--text-faint)' }}>
          Generated code will appear here as it streams
        </p>
      </div>
    );
  }

  // W/ code
  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Toolbar */}
      <div 
        className="flex h-10 shrink-0 items-center justify-between px-5"
        style={{ borderBottom: '1px solid var(--border-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            GeneratedComponent.tsx
          </span>
          {/* If in middle of generation, displays animatic */}
          {isStreaming && (
            <span 
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
              style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: 'var(--accent-text)' }} />
              Streaming
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="rounded-md p-1.5 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
          title="Copy code"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>

      {/* Code container */}
      <div
        ref={codeContainerRef} // Ref gets this div as current
        className="flex-1 overflow-auto p-5 font-mono text-sm leading-relaxed"
      >
        {highlightedHtml ? (
          // Where the processed html is plugged into component 
          <div
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            className="[&_pre]:bg-transparent! [&_pre]:p-0! [&_code]:bg-transparent!"
          />
        ) : (
          // Pulsing cursor during generation
          <pre className="whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
            <code>{code}</code>
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
            )}
          </pre>
        )}
      </div>
    </div>
  );
}
