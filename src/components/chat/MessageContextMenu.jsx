// src/components/chat/MessageContextMenu.jsx
import {
  Pencil,
  Trash2,
  Clipboard,
  Reply,
  Code,
} from 'lucide-react';

export default function MessageContextMenu({ x, y, onAction }) {
  return (
    <div
      className="fixed bg-white text-black rounded-xl shadow-lg z-50 min-w-[180px]"
      style={{ top: y, left: x }}
    >
      <Item icon={Clipboard} label="Copier" onClick={() => onAction('copy')} />
      <Item icon={Reply} label="Répondre" onClick={() => onAction('reply')} />
      <Item icon={Pencil} label="Modifier" onClick={() => onAction('edit')} />
      <Item
        icon={Trash2}
        label="Supprimer"
        danger
        onClick={() => onAction('delete')}
      />
      <Item icon={Code} label="Voir source" onClick={() => onAction('source')} />
    </div>
  );
}

function Item({ icon: Icon, label, danger = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 w-full text-left text-sm
        hover:bg-black/5 transition
        ${danger ? 'text-red-500 hover:bg-red-50' : ''}
      `}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
