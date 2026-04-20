// src/components/chat/MessageSourceModal.jsx
export default function MessageSourceModal({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-black text-white max-w-3xl w-full p-6 rounded-xl">
        <h2 className="font-bold mb-3">Code source du message</h2>
        <pre className="text-xs overflow-auto max-h-[70vh]">
          {JSON.stringify(message, null, 2)}
        </pre>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-[#1dbd3a] rounded"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
