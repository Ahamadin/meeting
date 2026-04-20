// src/components/chat/ImageMessageBubble.jsx
export default function ImageMessageBubble({ message, isMine }) {
  const src = message.content.url.replace(
    'mxc://',
    `${import.meta.env.VITE_MATRIX_BASE_URL}/_matrix/media/v3/download/`
  );

  return (
    <img
      src={src}
      alt=""
      className={`rounded-xl max-w-[240px] shadow
        ${isMine ? 'self-end border-2 border-[#1dbd3a]' : 'self-start'}`}
    />
  );
}
