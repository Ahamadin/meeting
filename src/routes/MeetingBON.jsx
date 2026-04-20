// src/routes/Meeting.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useMeeting } from '../features/meeting/context/MeetingContext';
import { liveKitCallManager } from '../services/call/LiveKitCallManager';
import TopBar from '../features/meeting/components/TopBar';
import VideoGrid from '../features/meeting/components/VideoGrid';
import ControlsBar from '../features/meeting/components/ControlsBar';
import SidePanel from '../features/meeting/components/SidePanel';

export default function Meeting() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, token: matrixToken } = useAuth();
  const {
    room,
    connectionState,
    error,
    isConnected
  } = useMeeting();
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCheckedRoom, setHasCheckedRoom] = useState(false);

  // ✅ Vérification de la room au montage
  useEffect(() => {
    if (hasCheckedRoom) return;

    console.log('[Meeting] Vérification room au montage');
    
    const existingRoom = liveKitCallManager.getRoom();
    if (existingRoom) {
      console.log('[Meeting] ✅ Room existe');
      setHasCheckedRoom(true);
      setIsInitializing(false);
    } else {
      console.log('[Meeting] ⚠️ Pas de room, attente...');
      setTimeout(() => {
        const retryRoom = liveKitCallManager.getRoom();
        if (retryRoom) {
          console.log('[Meeting] ✅ Room trouvée après attente');
          setHasCheckedRoom(true);
          setIsInitializing(false);
        } else {
          console.warn('[Meeting] ❌ Toujours pas de room, retour chat');
          navigate(`/chat/${roomId}`);
        }
      }, 1000);
    }
  }, [hasCheckedRoom, roomId, navigate]);

  // ✅ Vérifier authentification
  useEffect(() => {
    if (!isAuthenticated || !matrixToken) {
      console.warn('[Meeting] Non authentifié, redirection...');
      navigate(`/login?next=${encodeURIComponent(`/meeting/${roomId}`)}`);
    }
  }, [isAuthenticated, matrixToken, roomId, navigate]);

  // ✅ Masquer le loader dès connexion
  useEffect(() => {
    if (isConnected || connectionState === 'connected' || connectionState === 'active') {
      console.log('[Meeting] ✅ Connecté');
      setIsInitializing(false);
    }
  }, [isConnected, connectionState]);

  // ✅ Redirection sur déconnexion (désactivée car gérée dans MeetingContext)
  // La redirection est maintenant gérée dans leaveCall() du MeetingContext

  // État de chargement initial
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-[#1dbd3a] border-white/20 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-xl font-semibold mb-2">Connexion à la conférence</p>
          <p className="text-sm opacity-70">Veuillez patienter...</p>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center text-white p-6">
        <div className="card p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Erreur de connexion</h2>
          <p className="mb-6 text-white/80">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition"
            >
              Réessayer
            </button>
            <button
              onClick={() => navigate(`/chat/${roomId}`)}
              className="px-6 py-3 bg-[#1dbd3a] text-black rounded-full font-semibold hover:brightness-110 transition"
            >
              Retour au chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Interface de conférence
  return (
    <div className="flex flex-col h-screen bg-primary text-white overflow-hidden">
      <TopBar meetingId={roomId} />
      
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden">
        <div className="relative bg-black/40">
          <VideoGrid />
        </div>
        
        <div className="hidden lg:block">
          <SidePanel />
        </div>
      </main>
      
      <ControlsBar />
    </div>
  );
}