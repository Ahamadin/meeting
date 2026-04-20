// src/features/meeting/components/VideoGrid.jsx
import { useMemo } from 'react';
import { Track } from 'livekit-client';
import { useMeeting } from '../context/MeetingContext';
import ParticipantTile from './ParticipantTile';
import ScreenShareTile from './ScreenShareTile';

export default function VideoGrid() {
  const { room, participants, localParticipant } = useMeeting();

  // ===============================
  // 🧠 PARTICIPANTS ARRAY (SANS LE LOCAL)
  // ===============================
  const participantArray = useMemo(() => {
    if (!participants || !(participants instanceof Map)) return [];
    
    const allParticipants = Array.from(participants.values()).filter(Boolean);
    
    // ✅ Exclure le participant local (il sera ajouté manuellement)
    return allParticipants.filter(p => !p.isLocal);
  }, [participants]);

  // ✅ Toujours afficher le participant local + les participants distants
  const allTiles = useMemo(() => {
    const tiles = [];
    
    // Ajouter le participant local en premier
    if (localParticipant) {
      tiles.push(localParticipant);
    }
    
    // Ajouter les participants distants
    tiles.push(...participantArray);
    
    return tiles;
  }, [localParticipant, participantArray]);

  // ===============================
  // 🖥️ SCREEN SHARE DETECTION (LiveKit v2)
  // ===============================
  const screenShareParticipant = useMemo(() => {
    if (!room) return null;

    const allParticipants = [];
    
    if (localParticipant) {
      allParticipants.push(localParticipant);
    }
    
    allParticipants.push(...participantArray);

    // ✅ LiveKit v2 : Chercher un participant avec un track de partage d'écran
    for (const p of allParticipants) {
      try {
        const publications = p.getTrackPublications();
        const hasScreenShare = Array.from(publications.values()).some(
          pub => pub.kind === Track.Kind.Video && 
                 pub.source === Track.Source.ScreenShare &&
                 pub.track
        );
        
        if (hasScreenShare) {
          return p;
        }
      } catch (err) {
        console.warn('[VideoGrid] Erreur vérification screen share:', err);
      }
    }

    return null;
  }, [room, participantArray, localParticipant]);

  // ===============================
  // ⏳ LOADING STATE
  // ===============================
  if (!room) {
    return (
      <div className="h-full w-full flex items-center justify-center text-white/60">
        Connexion à l'appel...
      </div>
    );
  }

  // ===============================
  // 🖥️ SCREEN SHARE LAYOUT
  // ===============================
  if (screenShareParticipant) {
    return (
      <div className="h-full w-full flex flex-col gap-4 p-4 bg-black/40">
        {/* Grande zone pour le partage d'écran */}
        <div className="flex-1 min-h-0">
          <ScreenShareTile participant={screenShareParticipant} />
        </div>

        {/* Bande de participants en bas */}
        <div className="h-32 flex gap-3 overflow-x-auto">
          {allTiles.map(p => (
            <div key={p.identity} className="w-48 flex-shrink-0">
              <ParticipantTile participant={p} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ===============================
  // 🎥 NORMAL GRID
  // ===============================
  if (allTiles.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-white/60">
        En attente des participants...
      </div>
    );
  }

  if (allTiles.length === 1) {
    return (
      <div className="p-4 h-full">
        <ParticipantTile participant={allTiles[0]} />
      </div>
    );
  }

  if (allTiles.length === 2) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 h-full">
        {allTiles.map(p => (
          <ParticipantTile key={p.identity} participant={p} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4 h-full overflow-auto">
      {allTiles.map(p => (
        <ParticipantTile key={p.identity} participant={p} />
      ))}
    </div>
  );
}