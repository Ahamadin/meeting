// src/components/chat/AudioMessageBubble.jsx
export default function AudioMessageBubble({ message, isMine }) {
  const src = message.content.url.replace(
    'mxc://',
    `${import.meta.env.VITE_MATRIX_BASE_URL}/_matrix/media/v3/download/`
  );

  return (
    <audio
      controls
      className={`w-64 ${isMine ? 'self-end' : 'self-start'}`}
      src={src}
    />
  );
}
