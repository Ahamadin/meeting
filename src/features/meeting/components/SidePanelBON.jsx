// src/features/meeting/components/SidePanel.jsx
import { useState, useMemo } from 'react';
import { Users, MessageSquare, Settings } from 'lucide-react';
import { Track } from 'livekit-client';
import { useMeeting } from '../context/MeetingContext';

/**
 * Utilitaire unique pour afficher un nom humain
 */
function getDisplayName(mxid, displayNameMap) {
  if (displayNameMap?.has(mxid)) {
    return displayNameMap.get(mxid);
  }

  if (mxid?.startsWith('@')) {
    return mxid.split(':')[0].replace('@', '');
  }

  return 'Utilisateur';
}

/**
 * ✅ Fonction helper pour vérifier l'état audio (LiveKit v2)
 */
function checkAudioStatus(participant) {
  try {
    if (!participant) return false;

    // ✅ LiveKit v2 : utiliser getTrackPublications()
    const publications = participant.getTrackPublications();
    
    return Array.from(publications.values()).some(
      pub => pub.kind === Track.Kind.Audio && 
             pub.track && 
             !pub.isMuted && 
             pub.isSubscribed
    );
  } catch (err) {
    console.warn('[SidePanel] Erreur vérification audio:', err);
    return false;
  }
}

/**
 * ✅ Fonction helper pour vérifier l'état vidéo (LiveKit v2)
 */
function checkVideoStatus(participant) {
  try {
    if (!participant) return false;

    // ✅ LiveKit v2 : utiliser getTrackPublications()
    const publications = participant.getTrackPublications();
    
    return Array.from(publications.values()).some(
      pub => pub.kind === Track.Kind.Video && 
             pub.source !== Track.Source.ScreenShare &&
             pub.track && 
             !pub.isMuted && 
             pub.isSubscribed
    );
  } catch (err) {
    console.warn('[SidePanel] Erreur vérification vidéo:', err);
    return false;
  }
}

export default function SidePanel() {
  const [activeTab, setActiveTab] = useState('participants');
  const { participants } = useMeeting();

  const tabs = [
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col bg-black/60 border-l border-white/10">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 transition-colors ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white border-b-2 border-[#1dbd3a]'
                  : 'text-white/60 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium hidden xl:inline">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'participants' && (
          <ParticipantsList participants={participants} />
        )}
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}

function ParticipantsList({ participants }) {
  const { displayNameMap } = useMeeting();

  const participantArray = useMemo(() => {
    if (!participants || !(participants instanceof Map)) return [];
    return Array.from(participants.values()).filter(Boolean);
  }, [participants]);

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wide">
        Participants ({participantArray.length})
      </h3>

      <div className="space-y-2">
        {participantArray.map(participant => {
          if (!participant) return null;

          const name = getDisplayName(
            participant.identity,
            displayNameMap
          );

          const isLocal = participant.isLocal || false;

          // ✅ UTILISER LES FONCTIONS HELPERS (LiveKit v2)
          const hasAudio = checkAudioStatus(participant);
          const hasVideo = checkVideoStatus(participant);

          return (
            <div
              key={participant.identity}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#1dbd3a] flex items-center justify-center text-white font-bold">
                {name.slice(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {name}
                  </span>
                  {isLocal && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#1dbd3a] text-black font-bold">
                      Vous
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs ${
                      hasAudio ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    🎤 {hasAudio ? 'Micro' : 'Muet'}
                  </span>
                  <span
                    className={`text-xs ${
                      hasVideo ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    📹 {hasVideo ? 'Caméra' : 'Éteinte'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChatPanel() {
  return (
    <div className="p-4 text-white/60 text-center">
      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>Fonctionnalité de chat à venir</p>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="p-4 text-white/60 text-center">
      <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>Paramètres à venir</p>
    </div>
  );
}