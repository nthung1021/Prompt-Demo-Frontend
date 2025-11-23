'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const go = (tech: string, path: string) => {
    sessionStorage.setItem("demo_tech", tech);
    router.push(path);
  };

  const techniques = [
    { key: 'zero_shot', label: 'Zero-shot Prompting', path: '/zero-shot' },
    { key: 'few_shot', label: 'Few-shot Prompting', path: '/few-shot' },
    { key: 'chain_of_thought', label: 'Chain-of-Thought Prompting', path: '/cot'},
    { key: 'program_aided_language_models', label: 'Program-Aided Language Models', path: '/pal'},
    { key: 'self_consistency', label: 'Self-Consistency Prompting', path: '/self-consistency'},
    { key: 'directional_stimulus', label: 'Directional Stimulus Prompting', path: 'directional-stimulus'},
    { key: 'reflextion', label: 'Reflextion Prompting', path: 'reflextion'},
    { key: 'rag', label: 'Retrieval-Augmented Generation', path: '/rag'},
    { key: 'react', label: 'ReAct', path: '/react'},

    // Add more techniques here
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-6">Prompt Engineering Demo</h1>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {techniques.map(t => (
          <div
            key={t.key}
            className="p-6 border rounded-xl shadow hover:bg-gray-50 cursor-pointer"
            onClick={() => go(t.key, t.path)}
          >
            <h2 className="text-xl font-semibold">{t.label}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}
