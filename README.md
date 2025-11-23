This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Introduction

Prompt Engineering Demo App - A web application that allow users to test all the prompt techniques (used for AI && LLMs), with detail template for each techniques (both input and output)

# Add New Prompt Technique — Frontend Guide

This document explains **how to add a new prompt technique** to the demo app. It is written for team members who will implement a new technique (for example: ReAct, RAG, Self-Consistency, PAL). Follow the steps below to add the technique cleanly, consistently, and safely.

---

# Frontend — Overview

**Goal:** Add UI to call the new technique, let the user configure technique params (if needed), and display the returned `reasoning` + `finalAnswer` + optional breakdown.

## Where to add files

Typical frontend structure (Next.js + Tailwind):

```
/app/
  page.tsx                // home
  zero-shot/page.tsx
  few-shot/page.tsx
  chain-of-thought/page.tsx
  ...
/components/
  MessageBox.tsx
  TechniqueSelector.tsx
/styles/
  globals.css
```

## Step-by-step — Frontend

### 1. Add a route/page

Create a new page for your technique to match current UX conventions, e.g. `app/<technique>/page.tsx`. Keep layout similar to existing pages (or you can modify the layout page based on the technique you implement):

* Left column: reasoning + final answer (displayed block)
* Right column: input area + Run/Clear + presets

If you prefer, reuse a generic page and pass the technique id (but pages per technique simplify UX).

> [!NOTE]
> <technique> should use the lower case name with dash, no space (e.g. few-shot, self-consistency, rag, react,...)

### 2. Build the request body (do not build prompts in the frontend)

The frontend should send the same shape for all techniques:

```json
{
  "inputText": "...",
  "techniques": ["react"],
  "params": { ... }
}
```

**What to include in `params`**

* `instruction` — optional instruction override
* `examples` — array for few-shot-like techniques
* `temperature`, `maxTokens` — optional model hyperparams

**Example fetch call**

```ts
const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompt/run`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ inputText, techniques: ['react'], params })
});
```

> [!TIP]
> Check the zero-show, few-shot and chain-of-thought prompt pages for further detail

### 3. UI controls & validation

* Provide small inputs for technique-specific params (e.g., examples editor, retrieval ID selector, temperature slider).
* Validate user inputs (non-empty examples, label format) before sending.

### 4. Display results consistently

Expect the backend to return `outputs[0]` with keys `reasoning`, `finalAnswer`, and `raw`.

* Render `reasoning` as collapsed by default (CoT-style) and allow expandable view.
* Render `finalAnswer` prominently.
* Add a `Show raw` toggle to display `raw` JSON (for debugging/demo).

### 5. Add label mapping and UI strings

Avoid chained conditionals. Have an inline map (or central constant) in the page/component:

```ts
const TECH_LABELS: Record<string,string> = { react: 'ReAct (Reason+Act)', rag: 'RAG', ... };
const label = TECH_LABELS[tech] ?? tech;
```

### 6. Always retrieve the technique name from session storage

When you enter a page, the technique name will be saved into the session storage, so you have to **get that name in the prompt page**. 

All the technique names are already included in the home page, so you don't have to put more in that page (but if you want, you can, check the `techniques` array in the home page for all tecniques includes).

In the technique page you implement, retrieve the technique name like this:

```tsx
export default function PromptPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [tech, setTech] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Output | null>(null);
  const [promptShown, setPromptShown] = useState<string | null>(null);

  // Retrieve chosen demo technique here
  useEffect(() => {
    const storedTech = sessionStorage.getItem('demo_tech');
    if (!storedTech) {
      router.replace('/');
      return;
    }
    setTech(storedTech);
  }, [router]);

  // Always keep this function
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
          techniques: [tech], // chosen technique will be sent from here, DO NOT CHANGE IT
          params: {}
        })
      });
      
      //... (more code here)
    } catch (err) {
      console.error(err);
      alert('API error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Always keep this function 
  const clear = () => {
    setInputText('');
    setResult(null);
    setPromptShown(null);
  };
```

### 7. Things every pages should include

To make all the pages consistent and give the best UI/UX design for the web app, make sure every page should include:

1. Back button, and the technique that is about to demonstrate next to it. Both should appear on the top-left corner of the page
2. "Show prompt" option below the final answer.
3. "Show raw model response" option below the "Show prompt" option
4. Run and Clear button under the input.

Example:
```tsx
return (
  <>  
    <div className="px-6 py-4 flex items-center gap-4">
      <button className="back-btn" onClick={goBack}>← Back</button>
      <h2 className="text-xl font-semibold">(Demo Technique Name) Demo</h2>
    </div>

    <div className="p-8 max-w-3xl mx-auto">    
      <div className="mb-6">
        <h1 className="text-2xl font-bold">(Demo Technique Name)</h1>
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

      {/* Input message (main) code goes here*/}

      {/* Examples (if some technique requires) goes here*/}

      {/* Buttons (Run/Clear) goes here*/}
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

          {/* Reasoning (if any) will be include here with final answer */}
          {result.reasoning && (
            <>
              <h4 className="mt-3 font-medium">Reasoning</h4>
              <pre className="mt-1 whitespace-pre-wrap text-sm bg-white border p-3 rounded">{result.reasoning}</pre>
            </>
          )}
          
          {/* Prompt should be included here */}
          {promptShown && (
            <details className="mt-4 text-xs text-gray-500">
              <summary className="cursor-pointer">Show prompt</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs p-2 bg-gray-50 border rounded">{promptShown}</pre>
            </details>
          )}
      
          {/* Raw result should be included here */}
          {result?.raw && (
            <details className="mt-4 text-xs text-gray-500">
              <summary className="cursor-pointer">Show raw model response</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs">{JSON.stringify(result?.raw ?? {}, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  </>
)
```
---

# Example: Adding `react` (ReAct) technique — Minimal Files

**Frontend**

* `app/react/page.tsx` — new page that calls `/prompt/run` with `techniques: ['react']`
* Reuse `MessageBox` and CSS style from zero-shot/cot pages

---

# Testing & QA checklist

* [ ] Unit test prompt builder output (string contains required headers)
* [ ] Mock LlmClient and test parsing of `raw` to ensure `reasoning` + `finalAnswer` extraction
* [ ] Manual E2E: run frontend page → server → model → ensure final answer and reasoning appear in UI
* [ ] Validate token usage & set safe defaults (maxOutputTokens, example count)

---

# Troubleshooting tips

* If model returns extra text, first inspect `outputs[0].raw` and `rawText`. Adjust prompt to be stricter and shorten `maxOutputTokens`.
* Use `temperature: 0.0` for deterministic classification tasks.
* If you need structured JSON output, enforce `Return ONLY valid JSON matching: {...}` and parse with `JSON.parse()` on the backend.

---

## Deployment

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:8000](http://localhost:8000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
