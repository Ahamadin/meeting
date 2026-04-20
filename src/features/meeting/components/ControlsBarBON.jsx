// src/features/meeting/components/ControlsBar.jsx
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Users } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';
import { useState } from 'react';

export default function ControlsBar() {
  const {
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    leaveCall,
    participants,
    room,
  } = useMeeting();

  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const handleScreenShare = async () => {
    if (!room || !room.localParticipant) {
      console.error('[ControlsBar] Room ou localParticipant indisponible');
      return;
    }

    try {
      if (isScreenSharing) {
        console.log('[ControlsBar] 🛑 Arrêt partage d\'écran');
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        console.log('[ControlsBar] 🖥️ Démarrage partage d\'écran');
        await room.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error('[ControlsBar] ❌ Erreur partage d\'écran:', err);
      
      if (err.name === 'NotAllowedError') {
        alert('Permission refusée pour le partage d\'écran');
      } else if (err.message?.includes('not supported')) {
        alert('Le partage d\'écran n\'est pas supporté sur ce navigateur');
      } else {
        alert('Impossible de partager l\'écran');
      }
      
      setIsScreenSharing(false);
    }
  };

  // ✅ BOUTON DE TEST AUDIO (pour debug)
  const handleTestAudio = () => {
    console.log('🔊 ========== TEST AUDIO ==========');
    console.log('Room:', room);
    console.log('Local Participant:', room?.localParticipant?.identity);
    console.log('Remote Participants:', room?.remoteParticipants?.size);
    console.log('Participants Map (context):', participants?.size);
    
    // ✅ Test local participant avec structure complète
    if (room?.localParticipant) {
      const p = room.localParticipant;
      console.log('─────────────────────────────────');
      console.log('👤 LOCAL Participant:', p.identity);
      console.log('  - Objet complet:', p);
      console.log('  - audioTracks (old API):', p.audioTracks?.size);
      console.log('  - videoTracks (old API):', p.videoTracks?.size);
      console.log('  - audioTrackPublications:', p.audioTrackPublications?.size);
      console.log('  - videoTrackPublications:', p.videoTrackPublications?.size);
      console.log('  - trackPublications:', p.trackPublications?.size);
      console.log('  - tracks:', p.tracks?.size);
      
      // Tester toutes les propriétés qui contiennent "track"
      Object.keys(p).forEach(key => {
        if (key.toLowerCase().includes('track')) {
          console.log(`  - ${key}:`, p[key]);
        }
      });
      
      // Essayer audioTrackPublications
      if (p.audioTrackPublications) {
        p.audioTrackPublications.forEach((pub, trackId) => {
          console.log('  🎤 Audio publication (new API):');
          console.log('    - trackId:', trackId);
          console.log('    - kind:', pub.kind);
          console.log('    - isMuted:', pub.isMuted);
          console.log('    - isSubscribed:', pub.isSubscribed);
          console.log('    - track:', pub.track);
          console.log('    - audioTrack:', pub.audioTrack);
        });
      }
      
      // Essayer trackPublications
      if (p.trackPublications) {
        p.trackPublications.forEach((pub, trackId) => {
          console.log('  📢 Track publication (trackPublications):');
          console.log('    - trackId:', trackId);
          console.log('    - kind:', pub.kind);
          console.log('    - source:', pub.source);
          console.log('    - isMuted:', pub.isMuted);
          console.log('    - track:', pub.track);
        });
      }
    }
    
    // ✅ Test remote participants avec structure complète
    if (room?.remoteParticipants) {
      room.remoteParticipants.forEach((p, identity) => {
        console.log('─────────────────────────────────');
        console.log('👤 REMOTE Participant:', identity);
        console.log('  - Objet complet:', p);
        console.log('  - audioTracks (old API):', p.audioTracks?.size);
        console.log('  - videoTracks (old API):', p.videoTracks?.size);
        console.log('  - audioTrackPublications:', p.audioTrackPublications?.size);
        console.log('  - videoTrackPublications:', p.videoTrackPublications?.size);
        console.log('  - trackPublications:', p.trackPublications?.size);
        console.log('  - tracks:', p.tracks?.size);
        
        // Tester toutes les propriétés qui contiennent "track"
        Object.keys(p).forEach(key => {
          if (key.toLowerCase().includes('track')) {
            console.log(`  - ${key}:`, p[key]);
          }
        });
        
        // Essayer audioTrackPublications
        if (p.audioTrackPublications) {
          p.audioTrackPublications.forEach((pub, trackId) => {
            console.log('  🎤 Audio publication (new API):');
            console.log('    - trackId:', trackId);
            console.log('    - kind:', pub.kind);
            console.log('    - isMuted:', pub.isMuted);
            console.log('    - isSubscribed:', pub.isSubscribed);
            console.log('    - track:', pub.track);
            console.log('    - audioTrack:', pub.audioTrack);
          });
        }
        
        // Essayer trackPublications
        if (p.trackPublications) {
          p.trackPublications.forEach((pub, trackId) => {
            console.log('  📢 Track publication (trackPublications):');
            console.log('    - trackId:', trackId);
            console.log('    - kind:', pub.kind);
            console.log('    - source:', pub.source);
            console.log('    - isMuted:', pub.isMuted);
            console.log('    - isSubscribed:', pub.isSubscribed);
            console.log('    - track:', pub.track);
          });
        }
      });
    }
    
    // Tester les éléments audio dans le DOM
    console.log('─────────────────────────────────');
    const audioElements = document.querySelectorAll('audio');
    console.log('🔊 Éléments <audio> dans le DOM:', audioElements.length);
    audioElements.forEach((audio, index) => {
      console.log(`  Audio ${index}:`, {
        paused: audio.paused,
        muted: audio.muted,
        volume: audio.volume,
        readyState: audio.readyState,
        src: audio.src || 'MediaStream',
        srcObject: audio.srcObject,
      });
    });
    console.log('==================================');
  };

  const participantCount = participants?.size || 0;

  return (
    <div className="bg-black/90 border-t border-white/10 p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Info participants */}
        <div className="flex items-center gap-2 text-white/70">
          <Users className="w-5 h-5" />
          <span className="text-sm font-medium">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </span>
        </div>

        {/* Contrôles centraux */}
        <div className="flex items-center gap-3">
          {/* Micro */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-all ${
              isAudioEnabled
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isAudioEnabled ? 'Désactiver le micro' : 'Activer le micro'}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </button>

          {/* Caméra */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${
              isVideoEnabled
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isVideoEnabled ? 'Désactiver la caméra' : 'Activer la caméra'}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </button>

          {/* Partage d'écran */}
          <button
            onClick={handleScreenShare}
            className={`p-4 rounded-full transition-all ${
              isScreenSharing
                ? 'bg-[#1dbd3a] hover:brightness-110 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
          >
            <Monitor className="w-6 h-6" />
          </button>

          {/* ✅ BOUTON DE TEST AUDIO (temporaire pour debug) */}
          <button
            onClick={handleTestAudio}
            className="p-4 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all"
            title="Test audio (debug)"
          >
            🔊
          </button>

          {/* Raccrocher */}
          <button
            onClick={leaveCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg"
            title="Quitter l'appel"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        {/* Espace pour équilibrer */}
        <div className="w-32"></div>
      </div>
    </div>
  );
}