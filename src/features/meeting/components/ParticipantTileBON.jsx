// src/features/meeting/components/ParticipantTile.jsx
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Track } from 'livekit-client';
import { useMeeting } from '../context/MeetingContext';

export default function ParticipantTile({ participant, isPinned = false }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const { displayNameMap, activeSpeaker, isAudioEnabled, isVideoEnabled } = useMeeting();

  const isLocal = participant?.isLocal || false;
  const isSpeaking = activeSpeaker === participant?.identity;

  const [hasVideo, setHasVideo] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const [audioMuted, setAudioMuted] = useState(true);

  // ===============================
  // 🧠 DISPLAY NAME
  // ===============================
  const displayName =
    displayNameMap?.get(participant?.identity) ||
    participant?.name ||
    participant?.identity?.split(':')[0]?.replace('@', '') ||
    'Utilisateur';

  const initials = displayName.slice(0, 2).toUpperCase();

  // ===============================
  // 📹 VIDEO TRACK (LIVEKIT V2)
  // ===============================
  useEffect(() => {
    if (!participant || !videoRef.current) return;

    console.log('[ParticipantTile] 📹 Setup vidéo pour:', participant.identity);

    let currentPublication = null;

    const updateVideo = () => {
      try {
        // ✅ LiveKit v2 : utiliser getTrackPublications()
        const publications = participant.getTrackPublications();
        
        // Filtrer pour obtenir les publications vidéo de type caméra
        const videoPublications = Array.from(publications.values()).filter(pub => 
          pub.kind === Track.Kind.Video && 
          pub.source !== Track.Source.ScreenShare
        );

        console.log('[ParticipantTile] 📊 Video publications:', videoPublications.length);

        if (videoPublications.length > 0) {
          const pub = videoPublications[0];
          
          console.log('[ParticipantTile] 📹 Video publication:', {
            trackSid: pub.trackSid,
            isMuted: pub.isMuted,
            isSubscribed: pub.isSubscribed,
            hasTrack: !!pub.track
          });

          if (pub.track && pub !== currentPublication) {
            // Détacher l'ancien track
            if (currentPublication?.track) {
              try {
                currentPublication.track.detach(videoRef.current);
              } catch (e) {
                console.warn('[ParticipantTile] Erreur detach vidéo:', e);
              }
            }

            // Attacher le nouveau track
            try {
              pub.track.attach(videoRef.current);
              currentPublication = pub;
              console.log('[ParticipantTile] ✅ Vidéo attachée:', participant.identity);
            } catch (e) {
              console.error('[ParticipantTile] Erreur attach vidéo:', e);
            }
          }

          setHasVideo(true);
          setVideoMuted(pub.isMuted || !pub.isSubscribed);
        } else {
          // Pas de publication vidéo
          if (currentPublication?.track) {
            try {
              currentPublication.track.detach(videoRef.current);
            } catch (e) {}
          }
          currentPublication = null;
          setHasVideo(false);
          setVideoMuted(true);
        }
      } catch (err) {
        console.warn('[ParticipantTile] Erreur updateVideo:', err);
        setHasVideo(false);
        setVideoMuted(true);
      }
    };

    updateVideo();

    // ✅ Écouter les événements
    const events = [
      'trackSubscribed',
      'trackUnsubscribed',
      'trackMuted',
      'trackUnmuted',
      'trackPublished',
      'trackUnpublished'
    ];

    events.forEach(event => {
      participant.on(event, updateVideo);
    });

    return () => {
      // Nettoyage
      if (currentPublication?.track && videoRef.current) {
        try {
          currentPublication.track.detach(videoRef.current);
        } catch (e) {}
      }

      events.forEach(event => {
        participant.off(event, updateVideo);
      });
    };
  }, [participant]);

  // ===============================
  // 🎤 AUDIO (remote only - LIVEKIT V2)
  // ===============================
  useEffect(() => {
    if (!participant || isLocal || !audioRef.current) {
      console.log('[ParticipantTile] Skip audio:', {
        hasParticipant: !!participant,
        isLocal,
        hasAudioRef: !!audioRef.current,
        identity: participant?.identity
      });
      return;
    }

    console.log('[ParticipantTile] 🎧 Setup audio pour:', participant.identity);

    let currentPublication = null;

    const updateAudio = () => {
      try {
        // ✅ LiveKit v2 : utiliser getTrackPublications()
        const publications = participant.getTrackPublications();
        
        // Filtrer pour obtenir les publications audio
        const audioPublications = Array.from(publications.values()).filter(pub => 
          pub.kind === Track.Kind.Audio
        );

        console.log('[ParticipantTile] 📊 Audio publications:', audioPublications.length);

        if (audioPublications.length > 0) {
          const pub = audioPublications[0];
          
          console.log('[ParticipantTile] 🎤 Audio publication:', {
            trackSid: pub.trackSid,
            isMuted: pub.isMuted,
            isSubscribed: pub.isSubscribed,
            hasTrack: !!pub.track
          });

          if (pub.track && pub !== currentPublication) {
            // Détacher l'ancien track
            if (currentPublication?.track) {
              try {
                currentPublication.track.detach(audioRef.current);
              } catch (e) {
                console.warn('[ParticipantTile] Erreur detach audio:', e);
              }
            }

            // Attacher le nouveau track
            try {
              pub.track.attach(audioRef.current);
              currentPublication = pub;
              console.log('[ParticipantTile] ✅ Audio attaché:', participant.identity);

              // ✅ CRITIQUE : Forcer la lecture de l'audio
              if (audioRef.current) {
                audioRef.current.muted = false;
                audioRef.current.volume = 1.0;
                
                const playPromise = audioRef.current.play();
                
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      console.log('[ParticipantTile] ▶️ Audio playback started');
                    })
                    .catch(err => {
                      console.error('[ParticipantTile] ❌ Erreur playback:', err);
                      
                      if (err.name === 'NotAllowedError') {
                        console.log('[ParticipantTile] 🔇 Autoplay bloqué - en attente interaction');
                      }
                    });
                }
              }
            } catch (e) {
              console.error('[ParticipantTile] Erreur attach audio:', e);
            }
          }

          setAudioMuted(pub.isMuted || !pub.isSubscribed);
        } else {
          // Pas de publication audio
          if (currentPublication?.track) {
            try {
              currentPublication.track.detach(audioRef.current);
            } catch (e) {}
          }
          currentPublication = null;
          setAudioMuted(true);
        }
      } catch (err) {
        console.warn('[ParticipantTile] Erreur updateAudio:', err);
        setAudioMuted(true);
      }
    };

    // ✅ Appel immédiat
    updateAudio();
    
    // ✅ Appel retardé pour les tracks qui arrivent en retard
    const delayedUpdate = setTimeout(() => {
      console.log('[ParticipantTile] 🔄 Mise à jour audio retardée');
      updateAudio();
    }, 1000);

    // ✅ Écouter les événements
    const events = [
      'trackSubscribed',
      'trackUnsubscribed',
      'trackMuted',
      'trackUnmuted',
      'trackPublished',
      'trackUnpublished'
    ];

    events.forEach(event => {
      participant.on(event, updateAudio);
    });

    return () => {
      clearTimeout(delayedUpdate);

      // Nettoyage
      if (currentPublication?.track && audioRef.current) {
        try {
          currentPublication.track.detach(audioRef.current);
        } catch (e) {}
      }

      events.forEach(event => {
        participant.off(event, updateAudio);
      });
    };
  }, [participant, isLocal]);

  // ✅ Pour le participant local, utiliser l'état du MeetingContext
  const displayAudioMuted = isLocal ? !isAudioEnabled : audioMuted;
  const displayVideoMuted = isLocal ? !isVideoEnabled : videoMuted;

  // ===============================
  // 🎨 AVATAR COLOR
  // ===============================
  const colorFromName = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 65%, 50%)`;
  };

  if (!participant) {
    return null;
  }

  return (
    <div
      className={`relative w-full h-full rounded-xl overflow-hidden border transition-all
        ${isPinned || isSpeaking ? 'border-[#1dbd3a] ring-2 ring-[#1dbd3a]/50' : 'border-white/10'}
        bg-black`}
    >
      {/* VIDEO OR AVATAR */}
      <div className="absolute inset-0 flex items-center justify-center">
        {hasVideo && !displayVideoMuted ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white"
              style={{ backgroundColor: colorFromName(displayName) }}
            >
              {initials}
            </div>
            <span className="text-sm text-white/70">
              Caméra désactivée
            </span>
          </div>
        )}
      </div>

      {/* ✅ AUDIO ELEMENT - CRITIQUE pour le son distant */}
      {!isLocal && (
        <audio 
          ref={audioRef} 
          autoPlay 
          playsInline
          muted={false}
          style={{ display: 'none' }}
        />
      )}

      {/* BADGES */}
      <div className="absolute top-3 left-3 flex gap-2">
        {isLocal && (
          <span className="px-2 py-1 text-xs rounded bg-[#1dbd3a] text-black font-bold">
            Vous
          </span>
        )}
        {isSpeaking && (
          <span className="px-2 py-1 text-xs rounded bg-[#1dbd3a]/90 text-black font-bold">
            Parle
          </span>
        )}
      </div>

      <div className="absolute top-3 right-3 flex gap-2">
        {displayVideoMuted && (
          <div className="p-1.5 rounded-full bg-red-500/90">
            <VideoOff className="w-4 h-4 text-white" />
          </div>
        )}
        {displayAudioMuted && (
          <div className="p-1.5 rounded-full bg-red-500/90">
            <MicOff className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium truncate text-sm">
            {displayName}
          </span>
          <div className="flex gap-2">
            {displayAudioMuted ? <MicOff size={14} /> : <Mic size={14} />}
            {displayVideoMuted ? <VideoOff size={14} /> : <Video size={14} />}
          </div>
        </div>
      </div>
    </div>
  );
}