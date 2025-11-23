'use client'

import React, { useState } from 'react';
import TechniqueSelector from '@/components/TechniqueSelector';
import MessageBox from '@/components/MessageBox';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const startDemo = () => {
    if (!selected) {
      alert('Please choose one technique.');
      return;
    }
    if (!inputText.trim()) {
      alert('Please enter input text or choose a preset.');
      return;
    }
    // store in session and navigate to chat page
    sessionStorage.setItem('demo_input', inputText);
    sessionStorage.setItem('demo_tech', selected);
    router.push('/chat');
  };

  return (
    <div className="app-header">
      <h1 className="title-large">Prompt Techniques Demo</h1>

      <div className="w-full px-6 mt-40 flex justify-center">
        <MessageBox
          value={inputText}
          onChange={setInputText}
          onSubmit={startDemo}
          placeholder="Type your text to demo prompt techniques..."
        />
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <TechniqueSelector selected={selected} onSelect={setSelected} />
        <div className="mt-4">
          <button onClick={startDemo} className="bg-blue-600 text-white px-6 py-2 rounded-md">Start Demo</button>
        </div>
        <div className="meta">Choose exactly one technique. You can edit the prompt on the next screen.</div>
      </div>
    </div>
  );
}
