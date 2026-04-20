// src/routes/MatrixMeeting.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMatrixAuth } from '../features/auth/MatrixAuthContext';
import TopBar from '../features/meeting/components/TopBar';
import OptimizedVideoGrid from '../features/meeting/components/OptimizedVideoGrid';
import ControlsBar from '../features/meeting/components/ControlsBar';
import SidePanel from '../features/meeting/components/SidePanel';
import { connectToLivekit, toggleMic, toggleCam } from '../livekit/rtc-matrix';
import { unlockAudio } from '../utils/unlockAudio';

export default function MatrixMeeting() {
  const { id: roomName } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { matrixToken, user, isAuthenticated } = useMatrixAuth();
  
  const [err, setErr] = useState('');
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    // Rediriger vers la connexion si pas authentifié
    if (!isAuthenticated) {
      navigate(`/matrix-login?next=/meeting/${encodeURIComponent(roomName)}`, { replace: true });
      return;
    }

    (async () => {
      setErr('');
      setConnecting(true);

      try {
        // 1) Nom affiché (du sessionStorage ou extrait du userId Matrix)
        let displayName = sp.get('name') || sessionStorage.getItem('displayName');
        if (!displayName && user?.userId) {
          displayName = user.userId.split(':')[0].replace('@', '');
        }
        if (!displayName?.trim()) {
          navigate(`/join?room=${encodeURIComponent(roomName)}`, { replace: true });
          return;
        }
        sessionStorage.setItem('displayName', displayName.trim());

        // 2) Débloquer l'audio (politique autoplay du navigateur)
        await unlockAudio();

        // 3) Connexion LiveKit avec Matrix
        await connectToLivekit({
          roomName,
          displayName: displayName.trim(),
          matrixToken,
          micOn: sp.get('mic') === '1',
          camOn: sp.get('cam') === '1',
        });

        // 4) Activer micro/cam si demandé dans l'URL
        const wantMic = sp.get('mic') === '1';
        const wantCam = sp.get('cam') === '1';
        
        if (wantMic) {
          try {
            await toggleMic(true);
          } catch (e) {
            console.warn('Impossible d\'activer le micro:', e);
          }
        }
        
        if (wantCam) {
          try {
            await toggleCam(true);
          } catch (e) {
            console.warn('Impossible d\'activer la caméra:', e);
          }
        }

        setConnecting(false);
      } catch (e) {
        console.error('Erreur de connexion:', e);
        setErr(e?.message || 'Connexion LiveKit impossible');
        setConnecting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, matrixToken, isAuthenticated]);

  if (connecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-white">
        <div className="animate-pulse">
          <div className="h-16 w-16 rounded-xl bg-white text-primary font-black grid place-items-center mb-4 text-2xl">
            MP
          </div>
          <p className="text-xl font-semibold">Connexion à la réunion...</p>
          <p className="text-white/60 mt-2">Initialisation de LiveKit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar meetingId={roomName} />
      
      {err && (
        <div className="p-3 text-sm bg-red-500/15 border-b border-red-500/30 flex items-center justify-between">
          <span>{err}</span>
          <button
            onClick={() => navigate('/matrix-login')}
            className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-xs"
          >
            Reconnecter
          </button>
        </div>
      )}
      
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-0 overflow-hidden">
        <OptimizedVideoGrid />
        <SidePanel />
      </main>
      
      <ControlsBar />
    </div>
  );
}