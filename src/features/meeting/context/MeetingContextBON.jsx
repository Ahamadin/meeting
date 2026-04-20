// src/features/meeting/context/MeetingContext.jsx
import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { LIVEKIT_WS_URL } from '../../../config';
import { createMeeting, joinMeeting, startRecording, stopRecording } from '../../../api/meetings';

const MeetingCtx = createContext(null);

// Stockage local des fichiers (blobUrl) - pas de limite DataChannel
const LOCAL_FILES = new Map();

export function MeetingProvider({ children }) {
  const [room,             setRoom]             = useState(null);
  const [participants,     setParticipants]     = useState(new Map());
  const [localParticipant, setLocalParticipant] = useState(null);
  const [connectionState,  setConnectionState]  = useState('idle');
  const [error,            setError]            = useState(null);
  const [isAudioEnabled,   setIsAudioEnabled]   = useState(true);
  const [isVideoEnabled,   setIsVideoEnabled]   = useState(true);
  const [activeSpeaker,    setActiveSpeaker]    = useState(null);
  const [isScreenSharing,  setIsScreenSharing]  = useState(false);
  const [isRecording,      setIsRecording]      = useState(false);
  const [egressId,         setEgressId]         = useState(null);
  const [handRaisedUsers,  setHandRaisedUsers]  = useState(new Set());
  const [myHandRaised,     setMyHandRaised]     = useState(false);
  const [sharedNote,       setSharedNote]       = useState('');
  const [chatMessages,     setChatMessages]     = useState([]);
  const [waitingRoom,      setWaitingRoom]      = useState([]);
  const [isHost,           setIsHost]           = useState(false);
  const [roomName,         setRoomName]         = useState('');
  const [displayName,      setDisplayName]      = useState('');
  const [unreadChat,       setUnreadChat]       = useState(0);
  const [isChatOpen,       setIsChatOpen]       = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const [reactionEvents,   setReactionEvents]   = useState([]);
  const [activePoll,       setActivePoll]       = useState(null);
  const [myPollVote,       setMyPollVote]       = useState(null);
  const [sharedFiles,      setSharedFiles]      = useState([]);

  const roomRef       = useRef(null);
  const cleanupRef    = useRef(null);
  const isChatOpenRef = useRef(false);
  const displayNameRef = useRef('');

  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

  const buildMap = useCallback((lkRoom) => {
    const map = new Map();
    if (lkRoom.localParticipant) map.set(lkRoom.localParticipant.identity, lkRoom.localParticipant);
    lkRoom.remoteParticipants?.forEach((p, id) => { if (p) map.set(id, p); });
    return map;
  }, []);

  const handleData = useCallback((payload, participant) => {
    try {
      const msg  = JSON.parse(new TextDecoder().decode(payload));
      const from = participant?.identity || 'Système';
      const name = participant?.name || from;

      switch (msg.type) {
        case 'chat':
          setChatMessages(prev => [...prev, { id: msg.id || Date.now(), from: name, text: msg.text, ts: Date.now() }]);
          setUnreadChat(prev => isChatOpenRef.current ? 0 : prev + 1);
          break;
        case 'note':
          setSharedNote(msg.content);
          break;
        case 'hand_raise':
          setHandRaisedUsers(prev => { const n = new Set(prev); msg.raised ? n.add(from) : n.delete(from); return n; });
          break;
        case 'knock':
          setWaitingRoom(prev => prev.find(p => p.identity === from) ? prev : [...prev, { identity: from, name: msg.name || name, ts: Date.now() }]);
          break;
        case 'admit':
          setWaitingRoom(prev => prev.filter(p => p.identity !== msg.target));
          break;
        case 'reaction':
          setReactionEvents(prev => [...prev.slice(-19), { emoji: msg.emoji, name, ts: Date.now() }]);
          break;
        case 'poll_create':
          setActivePoll({ ...msg.poll, votes: {}, visible: false, createdBy: from });
          setMyPollVote(null);
          break;
        case 'poll_show':
          setActivePoll(prev => prev ? { ...prev, visible: msg.visible } : prev);
          break;
        case 'poll_vote':
          setActivePoll(prev => {
            if (!prev || prev.id !== msg.pollId) return prev;
            const votes = { ...prev.votes };
            Object.keys(votes).forEach(oid => { votes[oid] = (votes[oid] || []).filter(v => v !== from); });
            votes[msg.optionId] = [...(votes[msg.optionId] || []), from];
            return { ...prev, votes };
          });
          break;
        // Seules les méta arrivent par DataChannel (pas les données binaires)
        case 'file_meta':
          setSharedFiles(prev => {
            if (prev.find(f => f.id === msg.file.id)) return prev;
            return [...prev, { ...msg.file, uploadedBy: name, blobUrl: null }];
          });
          break;
        case 'mod_mute_audio':
          if (msg.target === roomRef.current?.localParticipant?.identity) {
            roomRef.current?.localParticipant?.setMicrophoneEnabled(false);
            setIsAudioEnabled(false);
          }
          break;
        case 'mod_mute_video':
          if (msg.target === roomRef.current?.localParticipant?.identity) {
            roomRef.current?.localParticipant?.setCameraEnabled(false);
            setIsVideoEnabled(false);
          }
          break;
        default: break;
      }
    } catch (e) { console.warn('[Meet] data parse:', e); }
  }, []);

  const setupListeners = useCallback((lkRoom) => {
    if (cleanupRef.current) cleanupRef.current();
    const onJoin  = () => setParticipants(buildMap(lkRoom));
    const onLeave = (p) => { setParticipants(buildMap(lkRoom)); setHandRaisedUsers(prev => { const n = new Set(prev); n.delete(p?.identity); return n; }); };
    const onSpeak = (speakers) => setActiveSpeaker(speakers?.[0]?.identity || null);
    const onTrack = () => setParticipants(buildMap(lkRoom));
    lkRoom.on(RoomEvent.ParticipantConnected,    onJoin);
    lkRoom.on(RoomEvent.ParticipantDisconnected, onLeave);
    lkRoom.on(RoomEvent.ActiveSpeakersChanged,   onSpeak);
    lkRoom.on(RoomEvent.TrackSubscribed,         onTrack);
    lkRoom.on(RoomEvent.TrackUnsubscribed,       onTrack);
    lkRoom.on(RoomEvent.DataReceived,            handleData);
    cleanupRef.current = () => {
      lkRoom.off(RoomEvent.ParticipantConnected,    onJoin);
      lkRoom.off(RoomEvent.ParticipantDisconnected, onLeave);
      lkRoom.off(RoomEvent.ActiveSpeakersChanged,   onSpeak);
      lkRoom.off(RoomEvent.TrackSubscribed,         onTrack);
      lkRoom.off(RoomEvent.TrackUnsubscribed,       onTrack);
      lkRoom.off(RoomEvent.DataReceived,            handleData);
    };
  }, [buildMap, handleData]);

  const publish = useCallback(async (obj) => {
    const lk = roomRef.current;
    if (!lk?.localParticipant) return;
    await lk.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(obj)), { reliable: true });
  }, []);

  const connectToRoom = useCallback(async (token, name, dName, host) => {
    try {
      setConnectionState('connecting'); setError(null);
      setRoomName(name); setDisplayName(dName); setIsHost(host);
      setMeetingStartTime(new Date());
      const lkRoom = new Room({ adaptiveStream: true, dynacast: true, autoSubscribe: true, videoCaptureDefaults: { resolution: { width: 1280, height: 720 } } });
      roomRef.current = lkRoom;
      lkRoom.on(RoomEvent.Disconnected, () => { setConnectionState('disconnected'); setRoom(null); setParticipants(new Map()); setLocalParticipant(null); });
      lkRoom.on(RoomEvent.Reconnecting, () => setConnectionState('reconnecting'));
      lkRoom.on(RoomEvent.Reconnected,  () => setConnectionState('connected'));
      const wsUrl = LIVEKIT_WS_URL.replace(/^http/, 'ws');
      await lkRoom.connect(wsUrl, token);
      setRoom(lkRoom); setLocalParticipant(lkRoom.localParticipant);
      setParticipants(buildMap(lkRoom)); setConnectionState('connected');
      setupListeners(lkRoom);
      await lkRoom.localParticipant.setMicrophoneEnabled(true);
      await lkRoom.localParticipant.setCameraEnabled(true);
    } catch (err) { console.error('[Meet]', err); setError(err.message || 'Erreur'); setConnectionState('error'); }
  }, [buildMap, setupListeners]);

  const startMeeting = useCallback(async ({ displayName: dName, roomName: rName }) => {
    const data = await createMeeting({ displayName: dName, roomName: rName });
    await connectToRoom(data.token, data.roomName, dName, true); return data;
  }, [connectToRoom]);

  const joinRoom = useCallback(async ({ displayName: dName, roomName: rName }) => {
    const data = await joinMeeting({ displayName: dName, roomName: rName });
    await connectToRoom(data.token, data.roomName, dName, false); return data;
  }, [connectToRoom]);

  const toggleAudio = useCallback(async () => {
    const lk = roomRef.current; if (!lk?.localParticipant) return;
    const e = !isAudioEnabled; await lk.localParticipant.setMicrophoneEnabled(e); setIsAudioEnabled(e);
  }, [isAudioEnabled]);

  const toggleVideo = useCallback(async () => {
    const lk = roomRef.current; if (!lk?.localParticipant) return;
    const e = !isVideoEnabled; await lk.localParticipant.setCameraEnabled(e); setIsVideoEnabled(e);
  }, [isVideoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    const lk = roomRef.current; if (!lk?.localParticipant) return;
    try { const e = !isScreenSharing; await lk.localParticipant.setScreenShareEnabled(e); setIsScreenSharing(e); }
    catch (err) { console.error('[Meet] screen:', err); }
  }, [isScreenSharing]);

  const toggleRecording = useCallback(async () => {
    if (!roomName || !displayName) return;
    try {
      if (isRecording) { await stopRecording({ displayName, roomName, egressId }); setIsRecording(false); setEgressId(null); }
      else { const data = await startRecording({ displayName, roomName }); setIsRecording(true); setEgressId(data.egressId); }
    } catch (err) { console.error('[Meet] rec:', err); }
  }, [isRecording, roomName, displayName, egressId]);

  const toggleHandRaise = useCallback(async () => {
    const raised = !myHandRaised; setMyHandRaised(raised);
    await publish({ type: 'hand_raise', raised, name: displayName });
  }, [myHandRaised, displayName, publish]);

  const sendChatMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    const msg = { type: 'chat', text: text.trim(), id: Date.now() };
    setChatMessages(prev => [...prev, { id: msg.id, from: 'Vous', text: msg.text, ts: Date.now(), isMe: true }]);
    await publish(msg);
  }, [publish]);

  const updateSharedNote = useCallback(async (content) => {
    setSharedNote(content); await publish({ type: 'note', content });
  }, [publish]);

  const admitParticipant = useCallback(async (identity) => {
    setWaitingRoom(prev => prev.filter(p => p.identity !== identity));
    await publish({ type: 'admit', target: identity });
  }, [publish]);

  const sendReaction = useCallback(async (emoji) => {
    setReactionEvents(prev => [...prev.slice(-19), { emoji, name: 'Vous', ts: Date.now() }]);
    await publish({ type: 'reaction', emoji });
  }, [publish]);

  const createPoll = useCallback(async ({ question, options }) => {
    const poll = { id: Date.now().toString(), question, options: options.map((text, i) => ({ id: String(i), text })) };
    setActivePoll({ ...poll, votes: {}, visible: false, createdBy: displayName });
    setMyPollVote(null);
    await publish({ type: 'poll_create', poll });
  }, [publish, displayName]);

  const togglePollVisibility = useCallback(async (visible) => {
    setActivePoll(prev => prev ? { ...prev, visible } : prev);
    await publish({ type: 'poll_show', visible });
  }, [publish]);

  const votePoll = useCallback(async (optionId) => {
    if (myPollVote !== null) return;
    const dName = displayNameRef.current;
    setMyPollVote(optionId);
    setActivePoll(prev => {
      if (!prev) return prev;
      const votes = { ...prev.votes };
      Object.keys(votes).forEach(oid => { votes[oid] = (votes[oid] || []).filter(v => v !== dName); });
      votes[optionId] = [...(votes[optionId] || []), dName];
      return { ...prev, votes };
    });
    await publish({ type: 'poll_vote', pollId: activePoll?.id, optionId });
  }, [myPollVote, activePoll, publish]);

  // Fichiers : stocker localement avec blobUrl, envoyer seulement les méta
  const shareFile = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      try {
        const blobUrl = URL.createObjectURL(file);
        const meta = { id: Date.now().toString(), name: file.name, size: file.size, type: file.type, uploadedAt: Date.now(), uploadedBy: displayName, blobUrl };
        LOCAL_FILES.set(meta.id, meta);
        setSharedFiles(prev => [...prev, meta]);
        // Envoyer seulement les méta aux autres (pas les données)
        publish({ type: 'file_meta', file: { id: meta.id, name: meta.name, size: meta.size, type: meta.type, uploadedAt: meta.uploadedAt } });
        resolve(meta);
      } catch (err) { reject(err); }
    });
  }, [publish, displayName]);

  const modMuteAudio = useCallback(async (t) => { await publish({ type: 'mod_mute_audio', target: t }); }, [publish]);
  const modMuteVideo = useCallback(async (t) => { await publish({ type: 'mod_mute_video', target: t }); }, [publish]);

  const leaveCall = useCallback(async (navigate) => {
    const lk = roomRef.current;
    try {
      if (isRecording) await stopRecording({ displayName, roomName, egressId }).catch(() => {});
      if (lk) { await lk.localParticipant?.setMicrophoneEnabled(false).catch(() => {}); await lk.localParticipant?.setCameraEnabled(false).catch(() => {}); await lk.disconnect(); }
    } catch (e) { console.warn('[Meet] leave:', e); }
    finally {
      LOCAL_FILES.forEach(f => f.blobUrl && URL.revokeObjectURL(f.blobUrl)); LOCAL_FILES.clear();
      roomRef.current = null; setRoom(null); setParticipants(new Map()); setLocalParticipant(null);
      setConnectionState('idle'); setIsRecording(false); setEgressId(null);
      setHandRaisedUsers(new Set()); setMyHandRaised(false); setChatMessages([]);
      setSharedNote(''); setWaitingRoom([]); setActivePoll(null); setMyPollVote(null);
      setSharedFiles([]); setReactionEvents([]);
      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
      if (navigate) navigate('/');
    }
  }, [isRecording, displayName, roomName, egressId]);

  const value = {
    room, participants, localParticipant, connectionState, error,
    isConnected: connectionState === 'connected',
    isAudioEnabled, isVideoEnabled, isScreenSharing, isRecording,
    activeSpeaker, handRaisedUsers, myHandRaised,
    sharedNote, chatMessages, waitingRoom, isHost,
    roomName, displayName, unreadChat, isChatOpen, meetingStartTime,
    reactionEvents, activePoll, myPollVote, sharedFiles,
    setIsChatOpen, setUnreadChat,
    startMeeting, joinRoom, toggleAudio, toggleVideo,
    toggleScreenShare, toggleRecording, toggleHandRaise,
    sendChatMessage, updateSharedNote, admitParticipant, leaveCall,
    sendReaction, createPoll, togglePollVisibility, votePoll,
    shareFile, modMuteAudio, modMuteVideo,
  };

  return <MeetingCtx.Provider value={value}>{children}</MeetingCtx.Provider>;
}

export function useMeeting() {
  const ctx = useContext(MeetingCtx);
  if (!ctx) throw new Error('useMeeting must be inside MeetingProvider');
  return ctx;
}
