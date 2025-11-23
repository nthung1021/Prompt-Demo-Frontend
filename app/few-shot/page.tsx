'use client'

import React, { useState } from 'react';
import MessageBox from '@/components/MessageBox';

type Example = { text: string; label: string };
type Result = { finalAnswer?: string; reasoning?: string | null; raw?: any };

export default function FewShotPage() {
  const [task, setTask] = useState(
    'Perform the task shown in examples.'
  );

  const [inputText, setInputText] = useState('');
  const [examples, setExamples] = useState<Example[]>([
    { text: '', label: '' },
  ]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  function updateExample(idx: number, field: keyof Example, value: string) {
    setExamples(prev => prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex)));
  }

  function addExample() {
    setExamples(prev => [...prev, { text: '', label: '' }]);
  }

  function removeExample(idx: number) {
    setExamples(prev => prev.filter((_, i) => i !== idx));
  }

  async function run() {
    setLoading(true);
    setResult(null);

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompt/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText,
          techniques: ['few_shot'],
          params: {
            instruction: task,
            examples: examples.map(e => ({ text: e.text, label: e.label }))
          }
        })
      });

      const data = await resp.json();
      const item = Array.isArray(data?.results) ? data.results[0] : data;
      const out = item?.outputs?.[0] ?? null;

      // Defensive extraction — backend returns { finalAnswer } or raw
      let final = '';
      if (out) {
        if (typeof out.finalAnswer === 'string') final = out.finalAnswer;
        else if (typeof out.raw === 'string') final = out.raw;
        else if (out?.raw?.text) final = out.raw.text;
        else final = JSON.stringify(out?.raw ?? out).slice(0, 2000);
      }

      setResult({ finalAnswer: final, reasoning: out?.reasoning ?? null, raw: out?.raw ?? null });
    } catch (err: any) {
      console.error(err);
      alert('API error: ' + (err?.message ?? 'Unknown'));
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setInputText('');
    setResult(null);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Few-shot Prompting Demo</h1>
        <p className="text-sm text-gray-500 mt-2">Edit the task, examples, and input, then press Run.</p>
      </div>

      {/* Task instruction */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Task instruction</label>
        <textarea
          className="w-full border rounded p-3"
          rows={2}
          value={task}
          onChange={e => setTask(e.target.value)}
        />
      </div>

      {/* Input message (main) */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Input text</label>
        <MessageBox value={inputText} onChange={setInputText} onSubmit={run} placeholder="Enter input text..." />
      </div>

      {/* Examples */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Examples</h3>
          <button
            className="text-sm px-3 py-1 border rounded"
            type="button"
            onClick={addExample}
          >
            + Add example
          </button>
        </div>

        <div className="space-y-3">
          {examples.map((ex, idx) => (
            <div key={idx} className="p-3 border rounded bg-gray-50">
              <div className="mb-2">
                <label className="text-xs font-medium">Example text</label>
                <textarea
                  className="w-full border rounded p-2 mt-1"
                  rows={2}
                  value={ex.text}
                  placeholder="Example input text related to the task instruction"
                  onChange={e => updateExample(idx, 'text', e.target.value)}
                />
              </div>

              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <label className="text-xs font-medium">Label</label>
                  <input
                    className="w-full border rounded p-2 mt-1"
                    value={ex.label}
                    placeholder="Your expected output for the example input text  "
                    onChange={e => updateExample(idx, 'label', e.target.value)}
                  />
                </div>

                <div>
                  <button
                    className="px-3 py-2 border rounded text-sm bg-red-400"
                    type="button"
                    onClick={() => removeExample(idx)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? 'Running…' : 'Run'}
        </button>

        <button onClick={clear} className="px-4 py-2 border rounded">Clear</button>
      </div>

      {/* Result */}
      {result && (
        <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-semibold mb-2">Final Answer</h3>
          <div className="text-lg">{result.finalAnswer}</div>

          {result.reasoning && (
            <>
              <h4 className="mt-3 font-medium">Reasoning</h4>
              <pre className="mt-1 whitespace-pre-wrap text-sm bg-white border p-3 rounded">{result.reasoning}</pre>
            </>
          )}

          <details className="mt-3 text-xs text-gray-500">
            <summary>Show raw response</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs">{JSON.stringify(result.raw, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
