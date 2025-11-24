"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MessageBox from "@/components/MessageBox";

type Result = {
  code?: string | null;
  finalAnswer?: string | null;
  raw?: any;
};

export default function PalPage() {
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
                "Write a JavaScript function named `solution` that solves the problem and returns the answer.",
              temperature: 0.0,
              maxTokens: 1000,
            },
          }),
        }
      );

      const data = await resp.json();
      const item = Array.isArray(data?.results) ? data.results[0] : data;
      setPromptShown(item?.prompt ?? null);

      const out = item?.outputs?.[0] ?? null;

      let code = out?.code ?? null;
      let finalAnswer = out?.finalAnswer ?? null;
      let raw = out?.raw ?? null;

      // defensive parsing: if backend returned raw text only, try to extract sections client-side
      if (!code && typeof out?.raw === "string") {
        const txt = out.raw;
        const codeMatch = txt.match(/JAVASCRIPT_CODE:\s*([\s\S]*?)\n/i);
        if (codeMatch) code = codeMatch[1].trim();
      }

      // Clean up code block markers if present
      if (code) {
        code = code
          .replace(/```javascript/g, "")
          .replace(/```js/g, "")
          .replace(/```/g, "")
          .trim();
      }

      setResult({
        code: code ?? null,
        finalAnswer: finalAnswer ?? out?.text ?? null,
        raw,
      });
    } catch (err: any) {
      console.error("pal run error", err);
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
          Program-Aided Language Models (PAL) Demo
        </h2>
      </div>

      <div className="chat-container">
        {/* Left column: code & final answer */}
        <div className="output-card">
          <h3 className="text-lg font-semibold mb-4">
            Generated Code & Executed Result
          </h3>

          {!result && !loading && (
            <div className="text-sm text-gray-600">
              Click "Run" to generate JavaScript code and execute it on the
              server. <br></br>
              The CODE and EXECUTED RESULT will appear here.
            </div>
          )}

          {loading && (
            <div className="mt-4 text-sm text-gray-500">
              Generating code and executing... (may take a few seconds)
            </div>
          )}

          {result?.code && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">JAVASCRIPT CODE:</div>
              <pre className="bg-gray-800 text-white p-4 rounded text-sm overflow-x-auto">
                {result.code}
              </pre>
            </div>
          )}

          {result?.finalAnswer && (
            <div className="final-answer mt-6">
              <div className="text-sm text-gray-600 mb-2">EXECUTED RESULT:</div>
              <div className="text-lg font-bold">{result.finalAnswer}</div>
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
          <h3 className="text-lg font-semibold">PAL Prompting Demo</h3>

          <div className="mt-4 text-sm">
            <div className="font-medium">Input</div>
            <div className="mt-2">
              <MessageBox
                value={inputText}
                onChange={setInputText}
                onSubmit={run}
                placeholder="Enter a math or logic problem..."
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
