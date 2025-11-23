'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MessageBox from '@/components/MessageBox';

type Output = {
  reasoning?: string | null;
  finalAnswer?: string;
  raw?: string;
};

export default function ChatPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [tech, setTech] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Output | null>(null);
  const [promptShown, setPromptShown] = useState<string | null>(null);

  const TECHNIQUE_LABELS: Record<string, string> = {
    zero_shot: 'Zero-shot',
    few_shot: 'Few-shot',
    cot: 'Chain-of-Thought',
  };

  useEffect(() => {
    const storedInput = sessionStorage.getItem('demo_input') ?? '';
    const storedTech = sessionStorage.getItem('demo_tech');
    if (!storedTech) {
      router.replace('/');
      return;
    }
    setInputText(storedInput);
    setTech(storedTech);
  }, [router]);

  const goBack = () => {
    router.push('/');
  };

  const run = async () => {
    if (!tech) return;
    setLoading(true);
    setResult(null);

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompt/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText,
          techniques: [tech],
          params: { constraints: '3 bullet points' }
        })
      });
      const data = await resp.json();
      // expected shape from backend: { technique, model, prompt, outputs: [...] }
      const item = Array.isArray(data?.results) ? data.results[0] : data;
      setPromptShown(item?.prompt ?? null);

      // pick first output
      const out = item?.outputs?.[0] ?? null;
      let displayedText = '';
      let rawObj = null;
      if (out) {
        if (typeof out.finalAnswer === 'string' && out.finalAnswer.trim().startsWith('{')) {
          try {
            rawObj = JSON.parse(out.finalAnswer);
            // try to extract content candidates -> parts -> text
            const candidateText = rawObj?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text ?? '').join('') ?? null;
            displayedText = candidateText || JSON.stringify(rawObj, null, 2);
          } catch (e) {
            // not valid JSON, use raw string
            displayedText = out.finalAnswer;
          }
        } else {
          displayedText = out.finalAnswer ?? out.raw ?? '';
        }
      }
      setResult({ 
        reasoning: out?.reasoning ?? null, 
        finalAnswer: displayedText, 
        raw: rawObj ?? out?.raw ?? null 
      });
    } catch (err) {
      console.error(err);
      alert('API error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // resolve human-friendly label for the technique
  const techniqueLabel = tech ? (TECHNIQUE_LABELS[tech] ?? tech) : '';

  return (
    <div className="chat-layout">
      <div className="px-6 py-4 flex items-center gap-4">
        <button className="back-btn" onClick={goBack}>← Back</button>
        <h2 className="text-xl font-semibold">Technique demo</h2>
      </div>

      <div className="chat-container">
        <div className="output-card">
          <h3 className="text-lg font-semibold mb-4">Step-by-step reasoning & final answer</h3>

          {!result && !loading && (
            <div className="text-sm text-gray-600">Click "Run" to produce the answer. The left shows step-by-step reasoning (if any) and the final answer.</div>
          )}

          {loading && <div className="mt-4 text-sm text-gray-500">Generating... (may take a few seconds)</div>}

          {result?.reasoning && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">REASONING (step-by-step):</div>
              {/* split reasoning lines */}
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
              <div>{result.finalAnswer}</div>
            </div>
          )}
        </div>

        <div className="tech-card">
          <h3 className="text-lg font-semibold">{techniqueLabel}</h3>

          <div className="mt-4 text-sm">
            <div className="font-medium">Input</div>
            <MessageBox value={inputText} onChange={setInputText} onSubmit={run} placeholder="Edit input and run..." />
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={run} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">Run</button>
            <button onClick={() => { setPromptShown(null); setResult(null); }} className="px-3 py-2 border rounded">Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}
