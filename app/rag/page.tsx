"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MessageBox from "@/components/MessageBox";

type RAGStep = {
  type: 'retrieval' | 'reasoning' | 'generation';
  content: string;
  sources?: string[];
};

type RetrievedDocument = {
  content: string;
  source: string;
  relevanceScore?: number;
};

type UploadedDocument = {
  id: string;
  filename: string;
  content: string;
  uploadedAt: string;
  size: number;
  mimeType?: string;
  fileType?: 'text' | 'pdf' | 'image' | 'audio' | 'video' | 'document';
};

type Result = {
  steps?: RAGStep[];
  retrievedDocuments?: RetrievedDocument[];
  processedFiles?: string[];
  finalAnswer?: string | null;
  reasoning?: string | null;
  raw?: any;
};

// Simple markdown formatter for basic formatting
const formatMarkdown = (text: string) => {
  if (!text) return text;
  
  return text
    // Convert **bold** to <strong>bold</strong> - be selective for readability
    .replace(/\*\*([^*]+)\*\*/g, (match, content) => {
      if (content.length <= 80) {
        return `<strong class="font-semibold">${content}</strong>`;
      }
      return content;
    })
    // Convert numbered lists
    .replace(/^\s*(\d+)\s*[.)]\s+(.+)$/gm, '<li class="mb-1"><span class="font-medium text-blue-600">$1.</span> $2</li>')
    // Convert * bullet points to proper list items
    .replace(/^\s*[*•-]\s+(.+)$/gm, '<li class="mb-1">$1</li>')
    // Wrap consecutive list items in proper containers
    .replace(/((<li class="mb-1"><span class="font-medium text-blue-600">\d+\.<\/span>.*<\/li>\s*)+)/g, '<ol class="list-none space-y-1 mt-2 ml-2 border-l-2 border-blue-200 pl-4">$1</ol>')
    .replace(/((<li class="mb-1">(?!.*font-medium).*<\/li>\s*)+)/g, '<ul class="list-disc list-inside space-y-1 mt-2 ml-4 text-gray-700">$1</ul>')
    // Convert line breaks
    .replace(/\n\s*\n/g, '</p><p class="mt-3">')
    .replace(/\n/g, '<br>');
};

// Function to wrap content with paragraph tags
const wrapWithParagraph = (content: string) => {
  if (!content) return '';
  return `<p class="leading-relaxed">${content}</p>`;
};

// Function to get file type icon
const getFileTypeIcon = (filename: string, fileType?: string) => {
  const ext = filename.toLowerCase().split('.').pop();
  const type = fileType || 'text';
  
  if (type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')) {
    return '🖼️';
  } else if (type === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext || '')) {
    return '🎵';
  } else if (type === 'video' || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext || '')) {
    return '🎬';
  } else if (ext === 'pdf') {
    return '📑';
  } else if (['doc', 'docx'].includes(ext || '')) {
    return '📄';
  } else if (['txt', 'md'].includes(ext || '')) {
    return '📝';
  } else if (ext === 'json') {
    return '📋';
  } else {
    return '📄';
  }
};

export default function RAGPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [promptShown, setPromptShown] = useState<string | null>(null);
  
  // File upload states
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const tech = "rag";

  const goBack = () => router.push("/");

  const runDemo = async () => {
    if (!inputText.trim()) return;

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
              maxDocuments: 5,
              retrievalMethod: 'semantic',
              reasoningStyle: 'analytical',
              temperature: 0.1,
              maxTokens: 1200,
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
        retrievedDocuments: out?.retrievedDocuments ?? [],
        processedFiles: out?.processedFiles ?? [],
        finalAnswer: out?.finalAnswer ?? out?.text ?? null,
        reasoning: out?.reasoning ?? null,
        raw: out?.raw ?? null,
      });
    } catch (err: any) {
      console.error("RAG run error", err);
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

  // Load uploaded documents on component mount
  const loadUploadedDocs = async () => {
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents`);
      const data = await resp.json();
      setUploadedDocs(data.documents || []);
    } catch (err) {
      console.error("Error loading documents:", err);
    }
  };

  // Upload a new document
  const uploadDocument = async () => {
    if (!selectedFile) return;

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${resp.status}: ${resp.statusText}`);
      }

      const data = await resp.json();
      if (data.success) {
        await loadUploadedDocs(); // Reload the list
        setSelectedFile(null); // Clear selection
        alert('File uploaded successfully!');
      } else {
        alert('Upload failed: ' + data.message);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Upload error: " + (err?.message ?? "Unknown"));
    } finally {
      setUploadLoading(false);
    }
  };

  // Delete a document
  const deleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/${docId}`, {
        method: 'DELETE',
      });

      const data = await resp.json();
      if (data.success) {
        await loadUploadedDocs(); // Reload the list
        alert('Document deleted successfully!');
      } else {
        alert('Delete failed: ' + data.message);
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Delete error: " + (err?.message ?? "Unknown"));
    }
  };

  // Load documents on mount
  React.useEffect(() => {
    loadUploadedDocs();
  }, []);

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'retrieval': return '🔍';
      case 'reasoning': return '🧠';
      case 'generation': return '✍️';
      default: return '🔸';
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'retrieval': return 'from-blue-50 to-blue-100 border-blue-400';
      case 'reasoning': return 'from-yellow-50 to-yellow-100 border-yellow-400';
      case 'generation': return 'from-green-50 to-green-100 border-green-400';
      default: return 'from-gray-50 to-gray-100 border-gray-400';
    }
  };

  const getStepTitle = (type: string) => {
    switch (type) {
      case 'retrieval': return 'Document Retrieval';
      case 'reasoning': return 'Information Analysis';
      case 'generation': return 'Response Generation';
      default: return 'Step';
    }
  };

  return (
    <div className="chat-layout">
      <div className="px-6 py-4 flex items-center gap-4">
        <button className="back-btn" onClick={goBack}>
          ← Back
        </button>
        <h2 className="text-xl font-semibold">Retrieval-Augmented Generation (RAG) Demo</h2>
      </div>

      <div className="chat-container">
        {/* Left column: RAG process & final answer */}
        <div className="output-card">
          <h3 className="text-lg font-semibold mb-4">
            RAG Process & Generated Response
          </h3>

          {!result && !loading && (
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                Click "Run" to see how RAG retrieves relevant documents and generates 
                an informed response. The system will search for relevant information, 
                analyze the retrieved documents, and synthesize a comprehensive answer.
              </p>
            </div>
          )}

          {loading && (
            <div className="mt-4 text-sm text-gray-500">
              Retrieving documents and generating response... (may take a few seconds)
            </div>
          )}

          {/* Processed Files */}
          {result?.processedFiles && result.processedFiles.length > 0 && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="text-md font-semibold text-purple-800 mb-3">
                🧠 AI-Processed Files ({result.processedFiles.length})
              </h4>
              <div className="space-y-2">
                {result.processedFiles.map((filename, idx) => (
                  <div key={idx} className="p-2 bg-white border border-purple-200 rounded text-sm">
                    <div className="font-medium text-purple-700">
                      {getFileTypeIcon(filename)} {filename}
                    </div>
                    <div className="text-xs text-purple-600 mt-1">
                      Processed directly by Gemini 2.0 Flash AI for content analysis
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retrieved Documents */}
          {result?.retrievedDocuments && result.retrievedDocuments.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-md font-semibold text-blue-800 mb-3">
                📚 Retrieved Documents ({result.retrievedDocuments.length})
              </h4>
              <div className="space-y-3">
                {result.retrievedDocuments.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-white border border-blue-200 rounded text-sm">
                    <div className="font-medium text-blue-700 mb-1">
                      📄 {doc.source}
                      {doc.relevanceScore && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          Score: {doc.relevanceScore.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-700 leading-relaxed">
                      {doc.content.slice(0, 200)}
                      {doc.content.length > 200 && '...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RAG Steps */}
          {result?.steps && result.steps.length > 0 && (
            <div className="mt-4 space-y-4">
              <div className="text-sm font-medium">
                RAG PROCESSING STEPS:
              </div>
              
              {result.steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-4 bg-gradient-to-r ${getStepColor(step.type)} border-l-4 rounded text-sm`}
                >
                  <div className="flex items-center mb-2">
                    <div className="font-semibold text-gray-800">
                      {getStepIcon(step.type)} {getStepTitle(step.type)}
                    </div>
                  </div>
                  
                  <div 
                    className="text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: wrapWithParagraph(formatMarkdown(step.content)) }}
                  />

                  {step.sources && step.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-600 font-medium mb-1">Sources:</div>
                      <div className="flex flex-wrap gap-1">
                        {step.sources.map((source, sourceIdx) => (
                          <span key={sourceIdx} className="px-2 py-1 bg-white bg-opacity-60 rounded text-xs">
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Final Answer */}
          {result?.finalAnswer && (
            <div className="final-answer mt-6">
              <div className="text-sm text-gray-600 mb-3 font-medium">
                🎯 FINAL GENERATED RESPONSE:
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
          <h3 className="text-lg font-semibold">RAG Demo</h3>

          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>Retrieval-Augmented Generation (RAG)</strong> combines 
              document retrieval with language generation to provide more accurate, 
              well-sourced responses.
            </p>
            <p className="mt-2">
              The process includes:
            </p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Retrieving relevant documents from a knowledge base</li>
              <li>Analyzing and selecting the most pertinent information</li>
              <li>Generating responses grounded in retrieved evidence</li>
              <li>Providing source attribution for claims</li>
            </ul>
          </div>

          {/* File Upload Section */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">
              📁 Upload Your Documents
            </h4>
            
            <div className="space-y-3">
              <div>
                <input
                  type="file"
                  accept=".txt,.md,.json,.pdf,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs border rounded p-2"
                />
                <div className="text-xs text-gray-600 mt-1">
                  📄 <strong>Supported formats:</strong> .txt, .md, .json, .pdf, .doc, .docx (max 50MB)<br/>
                </div>
              </div>
              
              {selectedFile && (
                <div className="flex items-center justify-between bg-white p-2 rounded border">
                  <span className="text-xs text-gray-700 truncate">
                    {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
                  </span>
                  <button
                    onClick={uploadDocument}
                    disabled={uploadLoading}
                    className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploadLoading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              )}

              {/* Uploaded Documents List */}
              {uploadedDocs.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    Uploaded Documents ({uploadedDocs.length}):
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uploadedDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-white p-2 rounded border text-xs">
                        <div className="flex-1 truncate">
                          <div className="font-medium text-gray-800 flex items-center gap-1">
                            {getFileTypeIcon(doc.filename, doc.fileType)}
                            {doc.filename}
                          </div>
                          <div className="text-gray-600">
                            {new Date(doc.uploadedAt).toLocaleDateString()} • {Math.round(doc.size / 1024)}KB
                            {doc.fileType && doc.fileType !== 'text' && (
                              <span className="ml-2 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                {doc.fileType}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          title="Delete document"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {uploadedDocs.length === 0 && (
                <div className="text-xs text-gray-600 italic">
                  No documents uploaded yet. Upload files to enhance RAG responses with your own content.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Question or Topic:
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Ask a question about AI, climate change, renewable energy, quantum computing, etc."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={runDemo}
                disabled={loading || !inputText.trim()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Generating..." : "Run RAG"}
              </button>
              <button
                onClick={clear}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>
              <strong>Example questions:</strong>
            </p>
            <ul className="mt-1 space-y-1">
              <li>• "What are the benefits of renewable energy?"</li>
              <li>• "How does machine learning work?"</li>
              <li>• "What is quantum computing and its applications?"</li>
              <li>• "Explain sustainable transportation solutions"</li>
            </ul>
            
            <p className="mt-3">
              <strong>Upload your own documents:</strong>
            </p>
            <ul className="mt-1 space-y-1">
              <li>• Research papers (.pdf - filename reference only)</li>
              <li>• Reports (.doc, .docx - full text search)</li>
              <li>• Notes (.txt, .md - full text search)</li>
              <li>• Data files (.json - full text search)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}