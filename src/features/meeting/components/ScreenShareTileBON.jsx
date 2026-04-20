// src/features/meeting/components/ScreenShareTile.jsx
import { useEffect, useRef } from 'react';
import { Monitor } from 'lucide-react';
import { Track } from 'livekit-client';

export default function ScreenShareTile({ participant }) {
  const videoRef = useRef(null);
  
  // Extraire le nom propre
  const extractDisplayName = (identity) => {
    if (!identity) return 'Participant';
    if (identity.startsWith('@') && identity.includes(':')) {
      return identity.split(':')[0].substring(1);
    }
    return identity;
  };
  
  const displayName = participant.name || extractDisplayName(participant.identity) || 'Participant';

  useEffect(() => {
    if (!participant || !videoRef.current) return;

    console.log('[ScreenShareTile] 🖥️ Setup partage d\'écran pour:', participant.identity);

    let currentPublication = null;

    const updateScreenShare = () => {
      try {
        // ✅ LiveKit v2 : utiliser getTrackPublications()
        const publications = participant.getTrackPublications();
        
        // Filtrer pour obtenir le track de partage d'écran
        const screenSharePubs = Array.from(publications.values()).filter(pub => 
          pub.kind === Track.Kind.Video && 
          pub.source === Track.Source.ScreenShare
        );

        console.log('[ScreenShareTile] 📊 Screen share publications:', screenSharePubs.length);

        if (screenSharePubs.length > 0) {
          const pub = screenSharePubs[0];
          
          if (pub.track && pub !== currentPublication) {
            // Détacher l'ancien track
            if (currentPublication?.track) {
              try {
                currentPublication.track.detach(videoRef.current);
              } catch (e) {
                console.warn('[ScreenShareTile] Erreur detach:', e);
              }
            }

            // Attacher le nouveau track
            try {
              pub.track.attach(videoRef.current);
              currentPublication = pub;
              console.log('[ScreenShareTile] ✅ Partage d\'écran attaché');
            } catch (e) {
              console.error('[ScreenShareTile] Erreur attach:', e);
            }
          }
        }
      } catch (err) {
        console.warn('[ScreenShareTile] Erreur updateScreenShare:', err);
      }
    };

    updateScreenShare();

    // ✅ Écouter les événements
    const events = [
      'trackSubscribed',
      'trackUnsubscribed',
      'trackPublished',
      'trackUnpublished'
    ];

    events.forEach(event => {
      participant.on(event, updateScreenShare);
    });

    return () => {
      // Nettoyage
      if (currentPublication?.track && videoRef.current) {
        try {
          currentPublication.track.detach(videoRef.current);
        } catch (e) {}
      }

      events.forEach(event => {
        participant.off(event, updateScreenShare);
      });
    };
  }, [participant]);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden bg-black border border-white/20">
      {/* Vidéo du partage d'écran */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
      
      {/* Badge "Partage d'écran" */}
      <div className="absolute top-4 left-4 px-4 py-2 rounded-full bg-[#1dbd3a]/90 backdrop-blur-sm flex items-center gap-2 text-white font-medium">
        <Monitor className="w-5 h-5" />
        <span>Partage d'écran - {displayName}</span>
      </div>
    </div>
  );
}