'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MessageBox from '@/components/MessageBox';

type Output = {
  reasoning?: string | null;
  finalAnswer?: string;
  raw?: string;
};

// Simple markdown formatter for basic formatting
const formatMarkdown = (text: string) => {
  if (!text) return text;
  
  return text
    // Convert **bold** to <strong>bold</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert * bullet points to proper list items
    .replace(/^\s*\*\s+(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive list items in <ul> tags
    .replace(/((<li>.*<\/li>\s*)+)/g, '<ul class="list-disc list-inside space-y-1 mt-2">$1</ul>')
    // Convert line breaks to <br> tags
    .replace(/\n/g, '<br>');
};

export default function ZeroShotPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [tech, setTech] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Output | null>(null);
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

  const clear = () => {
    setInputText('');
    setResult(null);
    setPromptShown(null);
  };

  return (
    <div className="chat-layout">
      <div className="px-6 py-4 flex items-center gap-4">
        <button className="back-btn" onClick={goBack}>← Back</button>
        <h2 className="text-xl font-semibold">Zero-shot Demo</h2>
      </div>

      <div className="chat-container">
        <div className="output-card">
          <h3 className="text-lg font-semibold mb-4">Final answer</h3>

          {!result && !loading && (
            <div className="text-sm text-gray-600">Click "Run" to produce the answer. The left shows the final answer.</div>
          )}

          {loading && <div className="mt-4 text-sm text-gray-500">Generating... (may take a few seconds)</div>}     

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

        <div className="tech-card">
          <h3 className="text-lg font-semibold">Zero-shot Prompting Demo</h3>

          <div className="mt-4 text-sm">
            <div className="font-medium">Input</div>
            <MessageBox value={inputText} onChange={setInputText} onSubmit={run} placeholder="Edit input and run..." />
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={run} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">Run</button>
            <button onClick={clear} className="px-3 py-2 border rounded">Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}
