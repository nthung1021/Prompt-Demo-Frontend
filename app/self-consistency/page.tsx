"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MessageBox from "@/components/MessageBox";

type Result = {
  reasoningPaths?: string[];
  finalAnswer?: string | null;
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

export default function SelfConsistencyPage() {
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
              instruction:
                "You are solving this problem using self-consistency.",
              temperature: 0.7, // Higher temp for diversity
              maxTokens: 1000,
            },
          }),
        }
      );

      const data = await resp.json();
      const item = Array.isArray(data?.results) ? data.results[0] : data;
      setPromptShown(item?.prompt ?? null);

      const out = item?.outputs?.[0] ?? null;

      let reasoningPaths = out?.reasoningPaths ?? [];
      let finalAnswer = out?.finalAnswer ?? null;
      let raw = out?.raw ?? null;

      // Fallback parsing if backend didn't parse well
      if ((!reasoningPaths.length || !finalAnswer) && out?.text) {
        // ... (client side parsing if needed, but backend should handle it)
        // For now rely on backend
      }

      setResult({
        reasoningPaths,
        finalAnswer: finalAnswer ?? out?.text ?? null,
        raw,
      });
    } catch (err: any) {
      console.error("self-consistency run error", err);
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
        <h2 className="text-xl font-semibold">
          Self-Consistency Prompting Demo
        </h2>
      </div>

      <div className="chat-container">
        {/* Left column: paths & final answer */}
        <div className="output-card">
          <h3 className="text-lg font-semibold mb-4">
            Reasoning Paths & Final Answer
          </h3>

          {!result && !loading && (
            <div className="text-sm text-gray-600">
              Click "Run" to generate multiple reasoning paths and the final
              consensus answer.
            </div>
          )}

          {loading && (
            <div className="mt-4 text-sm text-gray-500">
              Generating multiple paths... (may take a few seconds)
            </div>
          )}

          {result?.reasoningPaths && result.reasoningPaths.length > 0 && (
            <div className="mt-4 space-y-4">
              <div className="text-sm font-medium">REASONING PATHS:</div>
              {result.reasoningPaths.map((path, idx) => (
                <div key={idx} className="p-3 bg-white border rounded text-sm">
                  <div className="font-semibold text-gray-500 mb-1">
                    Path {idx + 1}
                  </div>
                  <div className="whitespace-pre-wrap">{path}</div>
                </div>
              ))}
            </div>
          )}

          {result?.finalAnswer && (
            <div className="final-answer mt-6">
              <div className="text-sm text-gray-600 mb-2">
                FINAL ANSWER (Consensus):
              </div>
              <div className="text-lg font-bold" dangerouslySetInnerHTML={{ __html: formatMarkdown(result.finalAnswer) }} />
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
          <h3 className="text-lg font-semibold">Self-Consistency Demo</h3>

          <div className="mt-4 text-sm">
            <div className="font-medium">Input</div>
            <div className="mt-2">
              <MessageBox
                value={inputText}
                onChange={setInputText}
                onSubmit={run}
                placeholder="Enter a problem that requires reasoning..."
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={run}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {loading ? "Running…" : "Run"}
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
