import { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';

export default function IncomingCallModal({
  visible,
  call,
  onAccept,
  onReject,
  isAccepting = false,
}) {
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!visible) return;

    setCountdown(60);

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          onReject();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, call?.callId, onReject]);

  if (!visible || !call) return null;

  const callerName =
    call.from?.replace('@', '').split(':')[0] || 'Utilisateur';

  const initial = callerName[0]?.toUpperCase() || '?';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md mx-4 bg-white rounded-3xl shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">

        {/* Avatar */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary text-white flex items-center justify-center text-4xl font-bold shadow-soft">
          {initial}
        </div>

        {/* Nom */}
        <h2 className="text-2xl font-bold text-primary mb-1">
          {callerName}
        </h2>

        {/* Type d’appel */}
        <div className="flex items-center justify-center gap-2 text-gray-600 mb-6">
          {call.isVideo ? (
            <Video size={18} />
          ) : (
            <Phone size={18} />
          )}
          <span className="font-medium">
            {call.isVideo ? 'Appel vidéo entrant' : 'Appel audio entrant'}
          </span>
        </div>

        {/* Statut */}
        {isAccepting ? (
          <p className="text-sm text-primary font-semibold mb-6">
            Connexion en cours…
          </p>
        ) : (
          <p className="text-sm text-gray-500 mb-6">
            Expire dans{' '}
            <span className="font-semibold text-primary">
              {countdown}s
            </span>
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-6">
          {/* Refuser */}
          <button
            onClick={onReject}
            disabled={isAccepting}
            className={`w-16 h-16 rounded-full border-2 border-red-500 text-red-500 flex items-center justify-center transition
              hover:bg-red-50 active:scale-95 ${
                isAccepting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            title="Refuser"
          >
            <PhoneOff size={26} />
          </button>

          {/* Accepter */}
          <button
            onClick={onAccept}
            disabled={isAccepting}
            className={`w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-soft transition
              hover:opacity-90 active:scale-95 ${
                isAccepting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            title="Accepter"
          >
            {isAccepting ? (
              <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : call.isVideo ? (
              <Video size={26} />
            ) : (
              <Phone size={26} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
