// src/components/chat/FileMessageBubble.jsx
import { Download, FileText } from 'lucide-react';

export default function FileMessageBubble({ message, isMine }) {
  if (!message?.content?.url) return null;

  const url = message.content.url.replace(
    'mxc://',
    `${import.meta.env.VITE_MATRIX_BASE_URL}/_matrix/media/v3/download/`
  );

  const filename = message.content.body || 'Fichier';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        flex items-center gap-3 p-3 rounded-xl max-w-[75%] cursor-pointer
        transition hover:brightness-95
        ${isMine
          ? 'bg-[#1dbd3a] text-black self-end'
          : 'bg-white text-black self-start'
        }
      `}
    >
      {/* Icône fichier */}
      <FileText className="w-8 h-8 opacity-80 shrink-0" />

      {/* Infos */}
      <div className="flex-1 overflow-hidden">
        <p className="font-medium truncate">{filename}</p>
        <span className="text-xs opacity-70">Télécharger</span>
      </div>

      {/* Icône download */}
      <Download className="w-6 h-6 opacity-80 shrink-0" />
    </a>
  );
}
