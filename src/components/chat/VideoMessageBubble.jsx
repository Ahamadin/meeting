// src/components/chat/VideoMessageBubble.jsx
export default function VideoMessageBubble({ message, isMine }) {
  const src = message.content.url.replace(
    'mxc://',
    `${import.meta.env.VITE_MATRIX_BASE_URL}/_matrix/media/v3/download/`
  );

  return (
    <video
      controls
      className={`rounded-xl max-w-[260px]
        ${isMine ? 'self-end border-2 border-[#1dbd3a]' : 'self-start'}`}
      src={src}
    />
  );
}
