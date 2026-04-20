import {
  Phone,
  PhoneIncoming,
  PhoneOff,
  Video,
} from 'lucide-react';

export default function MessageBubble({ message, isMe }) {
  const time = message.origin_server_ts
    ? new Date(message.origin_server_ts).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const renderContent = () => {
    if (message.type?.startsWith('m.call')) {
      const isVideo = message.content?.video;

      if (message.type === 'm.call.invite') {
        return (
          <div className="flex items-center gap-2 font-medium">
            {isVideo ? (
              <Video size={16} />
            ) : (
              <PhoneIncoming size={16} />
            )}
            <span>Appel entrant</span>
          </div>
        );
      }

      if (message.type === 'm.call.answer') {
        return (
          <div className="flex items-center gap-2 font-medium">
            <Phone size={16} />
            <span>Appel répondu</span>
          </div>
        );
      }

      if (message.type === 'm.call.hangup') {
        return (
          <div className="flex items-center gap-2 font-medium text-red-600">
            <PhoneOff size={16} />
            <span>Appel terminé</span>
          </div>
        );
      }
    }

    if (message.type === 'm.room.message') {
      if (message.content?.msgtype === 'm.text') {
        return message.content.body;
      }
      return 'Message non pris en charge';
    }

    return 'Événement';
  };

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[75%] px-4 py-3 rounded-2xl shadow-soft
          ${
            isMe
              ? 'bg-primary text-white rounded-br-md'
              : 'bg-white text-primary border border-gray-200 rounded-bl-md'
          }
        `}
      >
        <div className="whitespace-pre-wrap leading-relaxed">
          {renderContent()}
        </div>

        <div
          className={`text-[11px] mt-1 text-right ${
            isMe ? 'text-white/60' : 'text-gray-400'
          }`}
        >
          {time}
        </div>
      </div>
    </div>
  );
}
