'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MessageBox from '@/components/MessageBox';

type Result = {
  reasoning?: string | null;
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

export default function ChainOfThoughtPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [tech, setTech] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [promptShown, setPromptShown] = useState<string | null>(null);
  
  useEffect(() => {
    const storedTech = sessionStorage.getItem('demo_tech');
    if (!storedTech) {
      router.replace('/');
      return;
    }
    setTech(storedTech);
  }, [router]);

  const goBack = () => {
    router.push('/');
  };

  const run = async () => {
    if (!tech) return;
    setLoading(true);
    setResult(null);
    setPromptShown(null);

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompt/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText,
          techniques: [tech],
          params: {
            instruction: 'Reason step-by-step and then provide the final concise answer.',
            temperature: 0.0,
            maxTokens: 500
          }
        })
      });

      const data = await resp.json();
      // backend shape: { prompt, outputs: [{ reasoning, finalAnswer, raw }] } or results array
      const item = Array.isArray(data?.results) ? data.results[0] : data;
      setPromptShown(item?.prompt ?? null);

      const out = item?.outputs?.[0] ?? null;

      // out may already contain reasoning & finalAnswer (as our services produce)
      let reasoning = out?.reasoning ?? null;
      let finalAnswer = out?.finalAnswer ?? null;
      let raw = out?.raw ?? null;

      // defensive parsing: if backend returned raw text only, try to extract sections client-side
      if (!reasoning && typeof out?.raw === 'string') {
        const txt = out.raw;
        // attempt to find REASONING and FINAL_ANSWER sections
        const reasoningMatch = txt.match(/REASONING:\s*([\s\S]*?)\n\s*FINAL_ANSWER:/i);
        if (reasoningMatch) reasoning = reasoningMatch[1].trim();
        const finalMatch = txt.match(/FINAL_ANSWER:\s*([\s\S]*)/i);
        if (finalMatch) finalAnswer = finalMatch[1].trim();
      }

      // fallback: if only text available in out.text
      if ((!reasoning || !finalAnswer) && out?.text) {
        const txt = out.text as string;
        const reasoningMatch = txt.match(/REASONING:\s*([\s\S]*?)\n\s*FINAL_ANSWER:/i);
        if (reasoningMatch) reasoning = reasoningMatch[1].trim();
        const finalMatch = txt.match(/FINAL_ANSWER:\s*([\s\S]*)/i);
        if (finalMatch) finalAnswer = finalMatch[1].trim();
      }

      setResult({
        reasoning: reasoning ?? null,
        finalAnswer: finalAnswer ?? (out?.text ?? null),
        raw
      });
    } catch (err: any) {
      console.error('cot run error', err);
      alert('API error: ' + (err?.message ?? 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setInputText('');
    setResult(null);
    setPromptShown(null);
  };

  return (
    <div className="chat-layout">
      <div className="px-6 py-4 flex items-center gap-4">
        <button className="back-btn" onClick={goBack}>← Back</button>
        <h2 className="text-xl font-semibold">Chain-of-Thought Demo</h2>
      </div>

      <div className="chat-container">
        {/* Left column: reasoning & final answer */}
        <div className="output-card">
          <h3 className="text-lg font-semibold mb-4">Step-by-step reasoning & final answer</h3>

          {!result && !loading && (
            <div className="text-sm text-gray-600">
              Click "Run" to produce the reasoning and final answer. <br></br>
              The FINAL ANSWER with REASONING will appears here.
            </div>
          )}

          {loading && <div className="mt-4 text-sm text-gray-500">Generating reasoning... (may take a few seconds)</div>}

          {result?.reasoning && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">REASONING (step-by-step):</div>
              {result.reasoning.split(/\n+/).map((line, idx) => (
                <div key={idx} className="reasoning-step">
                  {line}
                </div>
              ))}
            </div>
          )}

          {result?.finalAnswer && (
            <div className="final-answer">
              <div className="text-sm text-gray-600 mb-2">FINAL ANSWER:</div>
              <div dangerouslySetInnerHTML={{ __html: formatMarkdown(result.finalAnswer) }} />
            </div>
          )}

          {promptShown && (
            <details className="mt-4 text-xs text-gray-500">
              <summary className="cursor-pointer">Show prompt</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs p-2 bg-gray-50 border rounded">{promptShown}</pre>
            </details>
          )}
       
          {result?.raw && (
            <details className="mt-4 text-xs text-gray-500">
              <summary className="cursor-pointer">Show raw model response</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs">{JSON.stringify(result?.raw ?? {}, null, 2)}</pre>
            </details>
          )}
        </div>

        {/* Right column: input and controls */}
        <div className="tech-card">
          <h3 className="text-lg font-semibold">Chain-of-Thought Prompting Demo</h3>

          <div className="mt-4 text-sm">
            <div className="font-medium">Input</div>
            <div className="mt-2">
              <MessageBox value={inputText} onChange={setInputText} onSubmit={run} placeholder="Enter the prompt to reason about..." />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={run} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
              {loading ? 'Running…' : 'Run'}
            </button>
            <button onClick={clear} className="px-3 py-2 border rounded">Clear</button>
          </div>

        </div>
      </div>
    </div>
  );
}
