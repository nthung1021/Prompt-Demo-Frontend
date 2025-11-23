'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const go = (path: string) => router.push(path);

  const techniques = [
    { key: 'zero-shot', label: 'Zero-shot Prompting', path: '/zero-shot' },
    { key: 'few-shot', label: 'Few-shot Prompting', path: '/few-shot' },
    { key: 'chain-of-thought', label: "Chain-of-Thought Prompting", path: '/chain-of-thought'}
    // Add more techniques here
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-6">Prompt Engineering Demo</h1>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
        {techniques.map(t => (
          <div
            key={t.key}
            className="p-6 border rounded-xl shadow hover:bg-gray-50 cursor-pointer"
            onClick={() => go(t.path)}
          >
            <h2 className="text-xl font-semibold">{t.label}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}
