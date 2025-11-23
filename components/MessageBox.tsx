type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
};

export default function MessageBox({ value, onChange, onSubmit, placeholder }: Props) {
  return (
    <div className="message-box">
      <textarea
        className="message-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Message ...'}
        rows={3}
      />
      <button
        onClick={onSubmit}
        className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-600 text-white hover:opacity-90"
        aria-label="Send"
      >
        ➤
      </button>
    </div>
  );
}
