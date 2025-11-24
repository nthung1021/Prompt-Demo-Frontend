"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MessageBox from "@/components/MessageBox";

type Result = {
  stimuli?: string | null;
  finalAnswer?: string | null;
  justification?: string | null;
  raw?: any;
};

export default function DirectionalStimulusPage() {
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
              // No specific params needed for this technique's default behavior
              maxTokens: 1000,
            },
          }),
        }
      );

      const data = await resp.json();
      const item = Array.isArray(data?.results) ? data.results[0] : data;
      setPromptShown(item?.prompt ?? null);

      const out = item?.outputs?.[0] ?? null;

      setResult({
        stimuli: out?.stimuli ?? null,
        finalAnswer: out?.finalAnswer ?? out?.text ?? null,
        justification: out?.justification ?? null,
        raw: out?.raw ?? null,
      });
    } catch (err: any) {
      console.error("directional-stimulus run error", err);
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
          Directional Stimulus Prompting Demo
        </h2>
      </div>

      <div className="chat-container">
        {/* Left column: stimuli, justification & final answer */}
        <div className="output-card">
          <h3 className="text-lg font-semibold mb-4">
            Generated Stimuli & Final Answer
          </h3>

          {!result && !loading && (
            <div className="text-sm text-gray-600">
              Click "Run" to generate directional stimuli (hints) and the final
              answer based on them.
            </div>
          )}

          {loading && (
            <div className="mt-4 text-sm text-gray-500">
              Generating stimuli and solving... (may take a few seconds)
            </div>
          )}

          {result?.stimuli && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded">
              <div className="text-sm font-bold text-blue-800 mb-2">
                DIRECTIONAL STIMULI (Hints):
              </div>
              <div className="whitespace-pre-wrap text-sm text-blue-900">
                {result.stimuli}
              </div>
            </div>
          )}

          {result?.justification && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-1">Justification:</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {result.justification}
              </div>
            </div>
          )}

          {result?.finalAnswer && (
            <div className="final-answer mt-6">
              <div className="text-sm text-gray-600 mb-2">FINAL ANSWER:</div>
              <div className="text-lg font-bold">{result.finalAnswer}</div>
            </div>
          )}

          {promptShown && (
            <details className="mt-4 text-xs text-gray-500">
              <summary className="cursor-pointer">
                Show prompts (Generator & Solver)
              </summary>
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
          <h3 className="text-lg font-semibold">Directional Stimulus Demo</h3>

          <div className="mt-4 text-sm">
            <div className="font-medium">Input</div>
            <div className="mt-2">
              <MessageBox
                value={inputText}
                onChange={setInputText}
                onSubmit={run}
                placeholder="Enter a problem to solve..."
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
