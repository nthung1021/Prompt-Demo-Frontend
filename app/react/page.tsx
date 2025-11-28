"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MessageBox from "@/components/MessageBox";

type ReActStep = {
  thought: string;
  action: string;
  actionInput: string;
  observation?: string;
};

type Result = {
  steps?: ReActStep[];
  finalAnswer?: string | null;
  reasoning?: string | null;
  completed?: boolean;
  iterations?: number;
  raw?: any;
};

// Simple markdown formatter for basic formatting
const formatMarkdown = (text: string) => {
  if (!text) return text;
  
  return text
    // Convert **bold** to <strong>bold</strong> but only for short phrases (< 50 chars)
    .replace(/\*\*(.{1,50}?)\*\*/g, '<strong>$1</strong>')
    // Convert * bullet points to proper list items
    .replace(/^\s*\*\s+(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive list items in <ul> tags
    .replace(/((<li>.*<\/li>\s*)+)/g, '<ul class="list-disc list-inside space-y-1 mt-2">$1</ul>')
    // Convert line breaks to <br> tags
    .replace(/\n/g, '<br>');
};

export default function ReActPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [tech, setTech] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [promptShown, setPromptShown] = useState<string | null>(null);

  useEffect(() => {
    const storedTech = sessionStorage.getItem("demo_tech");
    if (!storedTech) {
      router.replace("/");
      return;
    }
    setTech(storedTech);
  }, [router]);

  const goBack = () => {
    router.push("/");
  };

  const run = async () => {
    if (!tech) return;
    setLoading(true);
    setResult(null);
    setPromptShown(null);

    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompt/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputText,
            techniques: [tech],
            params: {
              maxIterations: 5,
              toolSpec: "search, calculate, lookup, analyze",
              temperature: 0.1,
              maxTokens: 800,
            },
          }),
        }
      );

      const data = await resp.json();
      const item = Array.isArray(data?.results) ? data.results[0] : data;
      setPromptShown(item?.prompt ?? null);

      const out = item?.outputs?.[0] ?? null;

      setResult({
        steps: out?.steps ?? [],
        finalAnswer: out?.finalAnswer ?? out?.text ?? null,
        reasoning: out?.reasoning ?? null,
        completed: out?.completed ?? false,
        iterations: out?.iterations ?? 0,
        raw: out?.raw ?? null,
      });
    } catch (err: any) {
      console.error("react run error", err);
      alert("API error: " + (err?.message ?? "Unknown"));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setInputText("");
    setResult(null);
    setPromptShown(null);
  };

  return (
    <div className="chat-layout">
      <div className="px-6 py-4 flex items-center gap-4">
        <button className="back-btn" onClick={goBack}>
          ← Back
        </button>
        <h2 className="text-xl font-semibold">ReAct Prompting Demo</h2>
      </div>

      <div className="chat-container">
        {/* Left column: reasoning steps & final answer */}
        <div className="output-card">
          <h3 className="text-lg font-semibold mb-4">
            ReAct Steps & Final Answer
          </h3>

          {!result && !loading && (
            <div className="text-sm text-gray-600">
              Click "Run" to see the ReAct agent reason and act step-by-step to
              solve the problem. The agent will think, take actions, observe
              results, and iterate until reaching a conclusion.
            </div>
          )}

          {loading && (
            <div className="mt-4 text-sm text-gray-500">
              Agent is reasoning and acting... (may take a few seconds)
            </div>
          )}

          {result?.steps && result.steps.length > 0 && (
            <div className="mt-4 space-y-4">
              <div className="text-sm font-medium">
                REASONING & ACTING STEPS:
              </div>
              {result.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 rounded text-sm"
                >
                  <div className="font-semibold text-blue-800 mb-2">
                    Step {idx + 1}
                  </div>
                  
                  {step.thought && (
                    <div className="mb-2">
                      <span className="font-medium text-gray-700">
                        💭 Thought:{" "}
                      </span>
                      <span className="text-gray-600">{step.thought}</span>
                    </div>
                  )}
                  
                  {step.action && (
                    <div className="mb-2">
                      <span className="font-medium text-green-700">
                        🎯 Action:{" "}
                      </span>
                      <span className="text-green-600">
                        {step.action} - {step.actionInput}
                      </span>
                    </div>
                  )}
                  
                  {step.observation && (
                    <div className="mb-2">
                      <span className="font-medium text-purple-700">
                        👀 Observation:{" "}
                      </span>
                      <div 
                        className="text-purple-600 inline" 
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(step.observation) }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result?.finalAnswer && (
            <div className="final-answer mt-6">
              <div className="text-sm text-gray-600 mb-2">
                🎉 FINAL ANSWER:
              </div>
              <div 
                className="text-lg font-bold text-green-800"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(result.finalAnswer) }}
              />
            </div>
          )}

          {result?.completed !== undefined && (
            <div className="mt-4 text-sm">
              <span
                className={`px-2 py-1 rounded ${
                  result.completed
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {result.completed ? "✅ Completed" : "⏱️ Incomplete"}
              </span>
              <span className="ml-2 text-gray-500">
                ({result.iterations} iterations)
              </span>
            </div>
          )}

          {promptShown && (
            <details className="mt-4 text-xs text-gray-500">
              <summary className="cursor-pointer">Show prompt</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs p-2 bg-gray-50 border rounded">
                {promptShown}
              </pre>
            </details>
          )}

          {result?.raw && (
            <details className="mt-4 text-xs text-gray-500">
              <summary className="cursor-pointer">
                Show raw model response
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {JSON.stringify(result?.raw ?? {}, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Right column: input and controls */}
        <div className="tech-card">
          <h3 className="text-lg font-semibold">ReAct Prompting Demo</h3>

          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>ReAct (Reasoning + Acting)</strong> combines reasoning
              traces and task-specific actions in an interleaved manner,
              allowing for greater synergy between the two.
            </p>
            <p className="mt-2">
              The agent will think, act, observe, and iterate until it finds a
              solution.
            </p>
          </div>

          <div className="mt-4 text-sm">
            <div className="font-medium">Input</div>
            <div className="mt-2">
              <MessageBox
                value={inputText}
                onChange={setInputText}
                onSubmit={run}
                placeholder="Enter a problem that requires reasoning and action..."
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={run}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {loading ? "Agent Working…" : "Run"}
            </button>
            <button onClick={clear} className="px-3 py-2 border rounded">
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}