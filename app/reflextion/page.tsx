"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MessageBox from "@/components/MessageBox";

type ReflexionStep = {
  type: 'initial' | 'reflection' | 'revision';
  stepNumber: number;
  content: string;
};

type Result = {
  steps?: ReflexionStep[];
  finalAnswer?: string | null;
  reasoning?: string | null;
  reflectionCount?: number;
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

// Add paragraph wrapper
const wrapWithParagraph = (html: string) => {
  if (!html.includes('<p')) {
    return `<p>${html}</p>`;
  }
  return html;
};

// Function to truncate text and add expand functionality
const truncateText = (text: string, maxLength: number = 200) => {
  if (text.length <= maxLength) return text;
  
  // Try to truncate at sentence boundary
  const truncated = text.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  
  // If we have a sentence boundary, use that
  if (lastSentence > maxLength * 0.5) {
    return text.substring(0, lastSentence + 1) + '...';
  }
  
  // If we have a newline boundary, use that
  if (lastNewline > maxLength * 0.3) {
    return text.substring(0, lastNewline) + '...';
  }
  
  // Otherwise, truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return text.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

export default function ReflexionPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [tech, setTech] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [promptShown, setPromptShown] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

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
              maxReflections: 3,
              temperature: 0.1,
              maxTokens: 1500,
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
        reflectionCount: out?.reflectionCount ?? 0,
        raw: out?.raw ?? null,
      });
    } catch (err: any) {
      console.error("reflextion run error", err);
      alert("API error: " + (err?.message ?? "Unknown"));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setInputText("");
    setResult(null);
    setPromptShown(null);
    setExpandedSteps(new Set());
  };

  const toggleExpanded = (stepIndex: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex);
    } else {
      newExpanded.add(stepIndex);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'initial': return '🎯';
      case 'reflection': return '🤔';
      case 'revision': return '📝';
      default: return '🔸';
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'initial': return 'from-blue-50 to-blue-100 border-blue-400';
      case 'reflection': return 'from-yellow-50 to-yellow-100 border-yellow-400';
      case 'revision': return 'from-green-50 to-green-100 border-green-400';
      default: return 'from-gray-50 to-gray-100 border-gray-400';
    }
  };

  const getStepTitle = (step: ReflexionStep) => {
    switch (step.type) {
      case 'initial': return 'Initial Attempt';
      case 'reflection': return `Reflexion ${step.stepNumber}`;
      case 'revision': return `Revised Solution ${step.stepNumber}`;
      default: return 'Step';
    }
  };

  return (
    <div className="chat-layout">
      <div className="px-6 py-4 flex items-center gap-4">
        <button className="back-btn" onClick={goBack}>
          ← Back
        </button>
        <h2 className="text-xl font-semibold">Reflextion Prompting Demo</h2>
      </div>

      <div className="chat-container">
        {/* Left column: reflextion steps & final answer */}
        <div className="output-card">
          <h3 className="text-lg font-semibold mb-4">
            Self-Reflexion Process & Final Answer
          </h3>

          {!result && !loading && (
            <div className="text-sm text-gray-600">
              Click "Run" to see the agent solve the problem through self-reflexion.
              The agent will make an initial attempt, reflect on it critically, 
              and iteratively improve the solution through multiple reflexion cycles.
            </div>
          )}

          {loading && (
            <div className="mt-4 text-sm text-gray-500">
              Agent is reflecting and improving solution... (may take a few seconds)
            </div>
          )}

          {result?.steps && result.steps.length > 0 && (
            <div className="mt-4 space-y-4">
              <div className="text-sm font-medium">
                REFLEXION PROCESS:
                {result.reflectionCount !== undefined && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {result.reflectionCount} reflexion{result.reflectionCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              {result.steps.map((step, idx) => {
                const isExpanded = expandedSteps.has(idx);
                const displayText = isExpanded ? step.content : truncateText(step.content);
                const needsExpansion = step.content.length > 150;
                
                return (
                  <div
                    key={idx}
                    className={`p-4 bg-gradient-to-r ${getStepColor(step.type)} border-l-4 rounded text-sm`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-800">
                        {getStepIcon(step.type)} {getStepTitle(step)}
                      </div>
                      {needsExpansion && (
                        <button
                          onClick={() => toggleExpanded(idx)}
                          className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-70 transition-colors"
                        >
                          {isExpanded ? '📕 Collapse' : '📖 Expand'}
                        </button>
                      )}
                    </div>
                    
                    <div 
                      className="text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: wrapWithParagraph(formatMarkdown(displayText)) }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {result?.finalAnswer && (
            <div className="final-answer mt-6">
              <div className="text-sm text-gray-600 mb-3 font-medium">
                🏆 FINAL ANSWER (After Reflexion):
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 shadow-sm">
                <div 
                  className="text-base text-green-900 leading-relaxed prose prose-green max-w-none"
                  style={{ 
                    wordWrap: 'break-word', 
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-wrap'
                  }}
                  dangerouslySetInnerHTML={{ __html: wrapWithParagraph(formatMarkdown(result.finalAnswer)) }}
                />
              </div>
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
          <h3 className="text-lg font-semibold">Reflextion Prompting Demo</h3>

          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Reflextion</strong> is a prompting technique that encourages
              the model to engage in self-reflexion and iterative improvement
              of its responses.
            </p>
            <p className="mt-2">
              The agent will:
            </p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Make an initial attempt</li>
              <li>Reflect critically on the attempt</li>
              <li>Provide improved solutions</li>
              <li>Continue reflecting until satisfied</li>
            </ul>
          </div>

          <div className="mt-4 text-sm">
            <div className="font-medium">Input</div>
            <div className="mt-2">
              <MessageBox
                value={inputText}
                onChange={setInputText}
                onSubmit={run}
                placeholder="Enter a problem that benefits from reflection and refinement..."
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={run}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {loading ? "Reflecting…" : "Run"}
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