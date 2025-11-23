type Props = {
  selected: string | null;
  onSelect: (tech: string) => void;
};

const TECHS = [
  { key: 'zero_shot', label: 'Zero-shot' },
  { key: 'few_shot', label: 'Few-shot' },
  { key: 'cot', label: 'Chain-of-Thought' }
];

export default function TechniqueSelector({ selected, onSelect }: Props) {
  return (
    <div className="flex gap-3 items-center">
      {TECHS.map(t => {
        const active = selected === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            className={`technique-btn ${active ? 'active' : ''}`}
            aria-pressed={active}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
