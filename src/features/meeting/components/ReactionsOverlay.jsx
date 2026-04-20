// src/features/meeting/components/ReactionsOverlay.jsx
import { useEffect, useState } from 'react';
import { useMeeting } from '../context/MeetingContext';

let _rid = 0;

export default function ReactionsOverlay() {
  const { reactionEvents } = useMeeting();
  const [floating, setFloating] = useState([]);

  useEffect(() => {
    if (!reactionEvents?.length) return;
    const last = reactionEvents[reactionEvents.length - 1];
    if (!last) return;

    const id   = ++_rid;
    const left = 5 + Math.random() * 80;

    setFloating(prev => [...prev, { ...last, id, left }]);
    const t = setTimeout(() => {
      setFloating(prev => prev.filter(r => r.id !== id));
    }, 3500);
    return () => clearTimeout(t);
  }, [reactionEvents]);

  if (!floating.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-30">
      {floating.map(r => (
        <div
          key={r.id}
          style={{
            position: 'absolute',
            bottom: '80px',
            left: r.left + '%',
            animation: 'floatReaction 3.5s ease-out forwards',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>
              {r.emoji}
            </span>
            <span style={{
              color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: '600',
              background: 'rgba(0,0,0,0.5)', padding: '2px 8px',
              borderRadius: '9999px', backdropFilter: 'blur(4px)',
            }}>
              {r.name}
            </span>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes floatReaction {
          0%   { transform: translateY(0) scale(0.4);    opacity: 0; }
          15%  { transform: translateY(-20px) scale(1.3); opacity: 1; }
          70%  { transform: translateY(-160px) scale(1);  opacity: 0.9; }
          100% { transform: translateY(-260px) scale(0.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
