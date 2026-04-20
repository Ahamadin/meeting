// src/features/meeting/components/ControlsBar.jsx
// FIXES :
// 1. Badge "Messages privés" lu depuis le store module-level de PrivateChatPanel
//    → badge correct même si le panneau n'est jamais ouvert
// 2. Race condition corrigée : roomName/displayName/isHost capturés avant leaveCall()

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Hand, Circle, Square, Users, MessageSquare,
  Share2, FileText, Paperclip, BarChart2, Smile, LineChart,
  HardDriveDownload, MoreHorizontal, Lock,
} from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';
import { useSidePanel } from './SidePanelContext';
import InviteModal from './InviteModal';
import { usePrivateChatUnread } from './PrivateChatPanel';

const REACTIONS = [
  { emoji: '👍', label: 'Super' }, { emoji: '👏', label: 'Bravo' },
  { emoji: '🎉', label: 'Félicitations' }, { emoji: '😂', label: 'Drôle' },
  { emoji: '😮', label: 'Surpris' }, { emoji: '😢', label: 'Triste' },
  { emoji: '🤔', label: 'Je réfléchis' }, { emoji: '👎', label: "Pas d'accord" },
];

function CtrlBtn({ onClick, active, red, icon: Icon, emoji, label, badge, title, disabled, waiting, compact }) {
  const size = compact ? '40px' : '48px';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <button
        onClick={onClick}
        disabled={disabled || waiting}
        title={title || label}
        style={{
          width: size, height: size,
          borderRadius: compact ? '10px' : '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          cursor: (disabled || waiting) ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s', border: 'none', outline: 'none',
          background: red ? '#ef4444' : active ? 'rgba(255,255,255,0.25)' : waiting ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.08)',
          color: (red || active) ? '#ffffff' : waiting ? '#f59e0b' : 'rgba(255,255,255,0.75)',
          opacity: disabled ? 0.5 : 1, flexShrink: 0
        }}
        onMouseEnter={e => { if (disabled || waiting) return; if (!red) e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
        onMouseLeave={e => { if (disabled || waiting) return; e.currentTarget.style.background = red ? '#ef4444' : active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'; }}
      >
        {emoji ? <span style={{ fontSize: compact ? '16px' : '20px', lineHeight: 1 }}>{emoji}</span> : Icon && <Icon style={{ width: compact ? '16px' : '20px', height: compact ? '16px' : '20px' }} />}
        {badge > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '700', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge > 9 ? '9+' : badge}</span>}
        {waiting && <span style={{ position: 'absolute', top: '-3px', right: '-3px', width: '9px', height: '9px', background: '#f59e0b', borderRadius: '50%', animation: 'waitDot 1s ease infinite' }} />}
      </button>
      {label && !compact && <span style={{ fontSize: '9px', color: waiting ? '#f59e0b' : 'rgba(255,255,255,0.4)', fontWeight: '500', whiteSpace: 'nowrap' }}>{waiting ? 'Attente…' : label}</span>}
    </div>
  );
}

function LeaveModal({ isHost, onTemporaryLeave, onPermanentLeave, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '16px' }}>
      <div style={{ background: '#0f1d3e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '24px', padding: '32px 28px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 25px 70px rgba(0,0,0,0.6)' }}>
        <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <PhoneOff style={{ width: '36px', height: '36px', color: '#ef4444' }} />
        </div>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Quitter la réunion ?</h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
          {isHost ? "Vous êtes l'hôte de cette réunion. Que souhaitez-vous faire ?" : "Voulez-vous vraiment quitter la réunion ?"}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isHost && (
            <button onClick={onTemporaryLeave} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #3b82f6', background: '#1e3a8a', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e40af'}
              onMouseLeave={e => e.currentTarget.style.background = '#1e3a8a'}>
              Quitter temporairement<br />
              <span style={{ fontSize: '13px', opacity: 0.8 }}>(Je reviendrai reprendre les droits d'hôte)</span>
            </button>
          )}
          <button onClick={onPermanentLeave} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #ef4444', background: '#991b1b', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
            onMouseLeave={e => e.currentTarget.style.background = '#991b1b'}>
            {isHost ? "Quitter définitivement la réunion" : "Quitter la réunion"}
          </button>
          <button onClick={onCancel} style={{ padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'rgba(255,255,255,0.75)', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

function useLocalRecorder() {
  const [isLocalRecording, setIsLocalRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const startLocalRecording = useCallback(async () => {
    if (isLocalRecording || isPreparing) return;
    setIsPreparing(true);
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } },
        audio: { systemAudio: 'include', echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micStream.getAudioTracks().forEach(t => displayStream.addTrack(t));
      } catch {}
      streamRef.current = displayStream;
      chunksRef.current = [];
      const mimeTypes = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
      const mime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = new MediaRecorder(displayStream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 8_000_000 });
      recorder.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const usedMime = recorder.mimeType || mime || 'video/mp4';
        const ext = usedMime.includes('webm') ? 'webm' : 'mp4';
        const blob = new Blob(chunksRef.current, { type: usedMime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `reunion-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.${ext}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 15_000);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null; chunksRef.current = []; recorderRef.current = null;
        setIsLocalRecording(false);
      };
      displayStream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== 'inactive') recorder.stop();
        setIsLocalRecording(false);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setIsLocalRecording(true);
    } catch (err) {
      if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') console.error('[LocalRec]', err);
    } finally { setIsPreparing(false); }
  }, [isLocalRecording, isPreparing]);

  const stopLocalRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }, []);

  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  return { isLocalRecording, isPreparing, startLocalRecording, stopLocalRecording };
}

function MoreMenu({ items, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [onClose]);
  return (
    <div ref={ref} style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px', background: '#0f1d3e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '8px', minWidth: '190px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {items.map((item, i) => (
        <button key={i} onClick={() => { item.onClick(); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: 'none', background: 'transparent', color: item.active ? '#60a5fa' : 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {item.icon && <item.icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />}
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge > 0 && <span style={{ minWidth: '18px', height: '18px', padding: '0 3px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '700', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.badge > 9 ? '9+' : item.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export default function ControlsBar({ onShowStats }) {
  const {
    isAudioEnabled, isVideoEnabled, isScreenSharing, isRecording,
    myHandRaised, participants, unreadChat, sharedFiles, activePoll,
    toggleAudio, toggleVideo, toggleScreenShare, toggleRecording,
    toggleHandRaise, leaveCall, sendReaction,
    roomName, displayName, isHost, room, localParticipant, roomMode,
  } = useMeeting();

  const { toggle, panel } = useSidePanel();

  // ✅ Badge messages privés depuis le store module-level — persiste même panneau fermé
  const unreadPrivate = usePrivateChatUnread();

  const [showReactions, setShowReactions] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [screenWaiting, setScreenWaiting] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const screenCleanupRef = useRef(null);
  const reactionsRef = useRef(null);

  const { isLocalRecording, isPreparing, startLocalRecording, stopLocalRecording } = useLocalRecorder();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!showReactions) return;
    const handler = (e) => { if (reactionsRef.current && !reactionsRef.current.contains(e.target)) setShowReactions(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [showReactions]);

  useEffect(() => () => {
    if (screenCleanupRef.current) { screenCleanupRef.current(); screenCleanupRef.current = null; }
  }, []);

  const isMobile = windowWidth < 480;
  const isTablet = windowWidth >= 480 && windowWidth < 768;
  const isSmall = windowWidth < 768;

  const handleScreenShare = useCallback(async () => {
    if (!room || !localParticipant) return;
    if (isScreenSharing) { await toggleScreenShare(); return; }
    const startShare = async () => {
      try {
        await localParticipant.setScreenShareEnabled(true, {
          audio: { systemAudio: 'include', echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          video: { frameRate: 30 },
        });
      } catch (err) {
        if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') console.error('[ScreenShare]', err);
      }
    };
    if (isHost || roomMode === 'public') { await startShare(); return; }

    const id = `screen_${localParticipant.identity}_${Date.now()}`;
    setScreenWaiting(true);
    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: 'screen_request', id, name: localParticipant.name || localParticipant.identity })),
        { reliable: true }
      );
    } catch { setScreenWaiting(false); return; }

    const onData = (payload) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (!msg.target || msg.target !== localParticipant.identity) return;
        clearTimeout(timeoutId);
        setScreenWaiting(false);
        cleanup();
        if (msg.type === 'screen_allowed') startShare();
      } catch {}
    };
    const cleanup = () => { room.off('dataReceived', onData); screenCleanupRef.current = null; };
    const timeoutId = setTimeout(() => { setScreenWaiting(false); cleanup(); }, 60_000);
    room.on('dataReceived', onData);
    screenCleanupRef.current = () => { clearTimeout(timeoutId); cleanup(); };
  }, [room, localParticipant, isHost, isScreenSharing, toggleScreenShare, roomMode]);

  const handleReaction = async (emoji) => {
    await sendReaction(emoji);
    setShowReactions(false);
  };

  // ✅ CORRECTION RACE CONDITION : capturer les valeurs AVANT leaveCall()
  const handleLeaveConfirm = async (isPermanent) => {
    setShowLeaveModal(false);
    if (screenCleanupRef.current) { screenCleanupRef.current(); screenCleanupRef.current = null; }
    setScreenWaiting(false);
    if (isLocalRecording) stopLocalRecording();

    // Capturer avant leaveCall() qui remet tout à '' / false
    const savedRoomName = roomName;
    const savedDisplayName = displayName;
    const savedIsHost = isHost;

    await leaveCall();

    setTimeout(() => {
      if (savedIsHost) {
        if (isPermanent) {
          window.location.href = '/';
        } else {
          window.location.href = `/host-return/${savedRoomName}?name=${encodeURIComponent(savedDisplayName || '')}`;
        }
      } else {
        window.location.href = `/prejoin/${savedRoomName}?role=participant&name=${encodeURIComponent(savedDisplayName || '')}`;
      }
    }, 400);
  };

  const count = participants.size;
  const compact = isMobile;

  const moreItems = [
    { icon: Lock, label: 'Messages privés', badge: unreadPrivate, active: panel === 'privateChat', onClick: () => toggle('privateChat') },
    { icon: FileText, label: 'Notes', onClick: () => toggle('notes') },
    { icon: BarChart2, label: 'Sondage', active: !!activePoll, onClick: () => toggle('poll') },
    { icon: Paperclip, label: 'Fichiers', badge: sharedFiles.length, onClick: () => toggle('files') },
    { icon: Share2, label: 'Inviter', onClick: () => setShowInvite(true) },
    { icon: isRecording ? Square : Circle, label: isRecording ? 'Stop enreg.' : 'Enregistrer', active: isRecording, onClick: toggleRecording },
    { icon: isLocalRecording ? Square : HardDriveDownload, label: isPreparing ? 'Préparation…' : isLocalRecording ? 'Stop local' : 'Rec. local', active: isLocalRecording, onClick: isLocalRecording ? stopLocalRecording : startLocalRecording },
    { icon: LineChart, label: 'Statistiques', onClick: onShowStats },
  ];

  return (
    <>
      {showLeaveModal && (
        <LeaveModal
          isHost={isHost}
          onTemporaryLeave={() => handleLeaveConfirm(false)}
          onPermanentLeave={() => handleLeaveConfirm(true)}
          onCancel={() => setShowLeaveModal(false)}
        />
      )}
      {showInvite && <InviteModal roomName={roomName} onClose={() => setShowInvite(false)} organizerName={displayName} />}

      <div style={{ flexShrink: 0, background: '#0a1428', borderTop: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
        {showReactions && (
          <div ref={reactionsRef} style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '12px', background: '#0f1d3e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: isMobile ? '280px' : '320px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 50 }}>
            {REACTIONS.map(r => (
              <button key={r.emoji} onClick={() => handleReaction(r.emoji)} title={r.label} style={{ width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                {r.emoji}
              </button>
            ))}
          </div>
        )}

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '8px 10px' : '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: isMobile ? '4px' : '8px' }}>
          {/* GAUCHE */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: isTablet ? '0 0 auto' : '1' }}>
              <img src="/senegal.jpg" alt="Logo" style={{ width: isTablet ? '28px' : '32px', height: isTablet ? '28px' : '32px', borderRadius: '8px', objectFit: 'contain', background: '#fff', flexShrink: 0 }} />
              {!isTablet && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>{roomName}</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Users style={{ width: '11px', height: '11px' }} /> {count}
                  </span>
                  {isRecording && <span style={{ fontSize: '10px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '2px' }}><Circle style={{ width: '7px', height: '7px', fill: '#f87171' }} /> REC</span>}
                  {isLocalRecording && <span style={{ fontSize: '10px', color: '#fb923c', display: 'flex', alignItems: 'center', gap: '2px', animation: 'localRecBlink 1.2s ease infinite' }}><HardDriveDownload style={{ width: '9px', height: '9px' }} /> LOCAL</span>}
                </div>
              )}
            </div>
          )}

          {/* CENTRE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px', flexShrink: 0 }}>
            <CtrlBtn icon={isAudioEnabled ? Mic : MicOff} label={isAudioEnabled ? 'Micro' : 'Muet'} active={isAudioEnabled} red={!isAudioEnabled} onClick={toggleAudio} compact={compact} />
            <CtrlBtn icon={isVideoEnabled ? Video : VideoOff} label={isVideoEnabled ? 'Caméra' : 'Off'} active={isVideoEnabled} red={!isVideoEnabled} onClick={toggleVideo} compact={compact} />
            {!isMobile && (
              <CtrlBtn icon={isScreenSharing ? MonitorOff : Monitor} label={isScreenSharing ? 'Arrêter' : 'Écran'} active={isScreenSharing} waiting={screenWaiting} onClick={handleScreenShare} compact={compact} />
            )}
            <CtrlBtn icon={Smile} label="Réagir" active={showReactions} onClick={() => setShowReactions(v => !v)} compact={compact} />
            {!isMobile && <CtrlBtn icon={Hand} label={myHandRaised ? 'Baisser' : 'Main'} active={myHandRaised} onClick={toggleHandRaise} compact={compact} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <button onClick={() => setShowLeaveModal(true)} style={{ width: compact ? '44px' : '52px', height: compact ? '40px' : '48px', borderRadius: compact ? '10px' : '14px', background: '#dc2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', boxShadow: '0 2px 12px rgba(220,38,38,0.4)', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
                onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}
                title="Quitter la réunion">
                <PhoneOff style={{ width: compact ? '18px' : '22px', height: compact ? '18px' : '22px', color: '#fff' }} />
              </button>
              {!compact && <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>Quitter</span>}
            </div>
          </div>

          {/* DROITE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px', flexShrink: 0 }}>
            <CtrlBtn icon={MessageSquare} label="Chat" badge={unreadChat} onClick={() => toggle('chat')} compact={compact} />
            <CtrlBtn icon={Users} label="Membres" onClick={() => toggle('participants')} compact={compact} />
            <CtrlBtn icon={Lock} label="Privé" badge={unreadPrivate} active={panel === 'privateChat'} onClick={() => toggle('privateChat')} compact={compact} title="Messages privés" />

            {isTablet && (
              <>
                <CtrlBtn icon={FileText} label="Notes" onClick={() => toggle('notes')} compact={compact} />
                <CtrlBtn icon={Share2} label="Inviter" onClick={() => setShowInvite(true)} compact={compact} />
              </>
            )}

            {!isSmall && (
              <>
                <CtrlBtn icon={FileText} label="Notes" onClick={() => toggle('notes')} />
                <CtrlBtn icon={BarChart2} label="Sondage" active={!!activePoll} onClick={() => toggle('poll')} />
                <CtrlBtn icon={Paperclip} label="Fichiers" badge={sharedFiles.length} onClick={() => toggle('files')} />
                <CtrlBtn icon={Share2} label="Inviter" onClick={() => setShowInvite(true)} />
                <CtrlBtn icon={isRecording ? Square : Circle} label={isRecording ? 'Stop' : 'Enreg.'} active={isRecording} red={isRecording} onClick={toggleRecording} />
                <CtrlBtn icon={isLocalRecording ? Square : HardDriveDownload} label={isPreparing ? 'Prépa…' : isLocalRecording ? 'Stop' : 'Rec.'} active={isLocalRecording} red={isLocalRecording} disabled={isPreparing} onClick={isLocalRecording ? stopLocalRecording : startLocalRecording} />
                <CtrlBtn icon={LineChart} label="Stats" onClick={onShowStats} />
              </>
            )}

            {isSmall && (
              <div style={{ position: 'relative' }}>
                <CtrlBtn icon={MoreHorizontal} label="Plus" onClick={() => setShowMoreMenu(v => !v)} active={showMoreMenu} compact={compact} />
                {showMoreMenu && <MoreMenu items={[
                  ...(isMobile ? [
                    { icon: isScreenSharing ? MonitorOff : Monitor, label: isScreenSharing ? 'Arrêter écran' : 'Partager écran', active: isScreenSharing, onClick: handleScreenShare },
                    { icon: Hand, label: myHandRaised ? 'Baisser la main' : 'Lever la main', active: myHandRaised, onClick: toggleHandRaise },
                  ] : []),
                  ...(isTablet ? [
                    { icon: BarChart2, label: 'Sondage', active: !!activePoll, onClick: () => toggle('poll') },
                    { icon: Paperclip, label: 'Fichiers', badge: sharedFiles.length, onClick: () => toggle('files') },
                  ] : []),
                  ...moreItems,
                ]} onClose={() => setShowMoreMenu(false)} />}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes waitDot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.3; transform:scale(0.6); } }
        @keyframes localRecBlink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
    </>
  );
}