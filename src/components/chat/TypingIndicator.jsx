// src/components/chat/TypingIndicator.jsx
export default function TypingIndicator({ text }) {
  if (!text) return null;

  return (
    <div className="text-sm italic opacity-70 px-4 py-1">
      {text}
    </div>
  );
}
