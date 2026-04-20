// src/features/meeting/context/MeetingContext.jsx
import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, ExternalE2EEKeyProvider } from 'livekit-client';
import { LIVEKIT_WS_URL } from '../../../config';
import { createMeeting, joinMeeting, startRecording, stopRecording } from '../../../api/meetings';

function isE2EESupported() {
  return (
    typeof RTCRtpScriptTransform !== 'undefined' ||
    (typeof RTCRtpSender !== 'undefined' && typeof RTCRtpSender.prototype?.createEncodedStreams === 'function')
  );
}

async function probeDevice(constraints, maxWaitMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      s.getTracks().forEach(t => t.stop());
      return true;
    } catch (e) {
      if (e.name === 'NotReadableError' || e.name === 'AbortError' || e.name === 'TrackStartError') {
        await new Promise(r => setTimeout(r, 400));
      } else return false;
    }
  }
  return false;
}

const MeetingCtx = createContext(null);
const LOCAL_FILES = new Map();

function hostIdentityKey(roomCode) {
  return `host_identity_${roomCode}`;
}

export function MeetingProvider({ children }) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState(new Map());
  const [localParticipant, setLocalParticipant] = useState(null);
  const [connectionState, setConnectionState] = useState('idle');
  const [error, setError] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [egressId, setEgressId] = useState(null);
  const [handRaisedUsers, setHandRaisedUsers] = useState(new Set());
  const [myHandRaised, setMyHandRaised] = useState(false);
  const [sharedNote, setSharedNote] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [unreadChat, setUnreadChat] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const [reactionEvents, setReactionEvents] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [myPollVote, setMyPollVote] = useState(null);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [participantSessions, setParticipantSessions] = useState({});
  const [e2eeEnabled, setE2eeEnabled] = useState(false);
  const [e2eeSupported, setE2eeSupported] = useState(false);
  const [e2eeMode, setE2eeMode] = useState('manual');

  const [roomMode, setRoomMode] = useState('private');
  const roomModeRef = useRef('private');
  useEffect(() => { roomModeRef.current = roomMode; }, [roomMode]);

  const originalHostIdentityRef = useRef(null);

  const [waitingRoomList, setWaitingRoomList] = useState([]);
  const waitingRoomListRef = useRef([]);
  useEffect(() => { waitingRoomListRef.current = waitingRoomList; }, [waitingRoomList]);

  const roomRef = useRef(null);
  const cleanupRef = useRef(null);
  const isChatOpenRef = useRef(false);
  const displayNameRef = useRef('');
  const e2eeEnabledRef = useRef(false);
  const publishRef = useRef(null);
  const isHostRef = useRef(false);
  const keyProviderRef = useRef(null);
  const roomNameRef = useRef('');
  const browserCleanupRef = useRef(null);

  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);
  useEffect(() => { e2eeEnabledRef.current = e2eeEnabled; }, [e2eeEnabled]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { roomNameRef.current = roomName; }, [roomName]);
  useEffect(() => { setE2eeSupported(isE2EESupported()); }, []);
  useEffect(() => () => { if (browserCleanupRef.current) { browserCleanupRef.current(); browserCleanupRef.current = null; } }, []);

  const buildMap = useCallback((lkRoom) => {
    const map = new Map();
    if (lkRoom.localParticipant) map.set(lkRoom.localParticipant.identity, lkRoom.localParticipant);
    lkRoom.remoteParticipants?.forEach((p, id) => { if (p) map.set(id, p); });
    return map;
  }, []);

  const publish = useCallback(async (obj) => {
    const lk = roomRef.current;
    if (!lk?.localParticipant) return;
    await lk.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(obj)), { reliable: true });
  }, []);

  useEffect(() => { publishRef.current = publish; }, [publish]);

  const activateE2EELocal = useCallback(async (lkRoom) => {
    if (!lkRoom || !isE2EESupported() || e2eeEnabledRef.current) return false;
    try {
      const kp = keyProviderRef.current;
      if (!kp) return false;
      await kp.setKey(lkRoom.name || roomNameRef.current || 'default');
      await lkRoom.setE2EEEnabled(true);
      setE2eeEnabled(true);
      e2eeEnabledRef.current = true;
      setE2eeMode('global');
      return true;
    } catch (err) {
      console.error('[E2EE]', err.message);
      return false;
    }
  }, []);

  const admitFromWaitingRoom = useCallback(async (identity) => {
    if (!isHostRef.current) return;
    try {
      const key = `wr_admitted_${roomNameRef.current}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const p = waitingRoomListRef.current?.find(x => x.identity === identity);
      const nl = (p?.name || '').trim().toLowerCase();
      if (nl && !existing.includes(nl)) {
        localStorage.setItem(key, JSON.stringify([...existing, nl]));
      }
    } catch {}
    setWaitingRoomList(prev => prev.filter(p => p.identity !== identity));
    await publish({ type: 'wr_admitted', target: identity });
  }, [publish]);

  const rejectFromWaitingRoom = useCallback(async (identity) => {
    if (!isHostRef.current) return;
    setWaitingRoomList(prev => prev.filter(p => p.identity !== identity));
    await publish({ type: 'wr_rejected', target: identity });
  }, [publish]);

  const handleData = useCallback((payload, participant) => {
    try {
      const msg = JSON.parse(new TextDecoder().decode(payload));
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
        case 'file_meta':
          setSharedFiles(prev => prev.find(f => f.id === msg.file.id) ? prev : [...prev, { ...msg.file, uploadedBy: name, blobUrl: null }]);
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
        case 'mod_enable_audio':
          if (msg.target === roomRef.current?.localParticipant?.identity) {
            roomRef.current?.localParticipant?.setMicrophoneEnabled(true);
            setIsAudioEnabled(true);
          }
          break;
        case 'mod_enable_video':
          if (msg.target === roomRef.current?.localParticipant?.identity) {
            roomRef.current?.localParticipant?.setCameraEnabled(true);
            setIsVideoEnabled(true);
          }
          break;
        case 'kick':
          if (msg.target === roomRef.current?.localParticipant?.identity) {
            roomRef.current?.disconnect();
            window.location.href = '/';
          }
          break;
        case 'wr_knock':
          if (isHostRef.current) {
            setWaitingRoomList(prev => {
              if (prev.find(p => p.identity === from)) return prev;
              return [...prev, { identity: from, name: msg.name || name, ts: Date.now() }];
            });
          }
          break;
        case 'wr_admitted':
          break;
        case 'wr_rejected':
          if (msg.target === roomRef.current?.localParticipant?.identity) {
            roomRef.current?.disconnect();
            window.location.href = '/?rejected=1';
          }
          break;
        case 'room_mode_sync':
          setRoomMode(msg.mode);
          roomModeRef.current = msg.mode;
          if (roomNameRef.current) {
            localStorage.setItem(`room_mode_${roomNameRef.current}`, msg.mode);
          }
          break;
        case 'host_restored':
          if (msg.originalHost !== roomRef.current?.localParticipant?.identity && isHostRef.current) {
            setIsHost(false);
            isHostRef.current = false;
            console.log('[Meet] Hôte original restauré, je cède le rôle temporaire.');
          }
          break;
        case 'e2ee_sync':
          if (!e2eeEnabledRef.current) {
            const lk = roomRef.current;
            if (lk) activateE2EELocal(lk);
          }
          break;
        default:
          break;
      }
    } catch (e) {
      console.warn('[Meet] data parse:', e);
    }
  }, [activateE2EELocal]);

  const handlePotentialHostTransfer = useCallback((lkRoom, disconnectedIdentity) => {
    if (isHostRef.current) return;
    const storedHostIdentity = localStorage.getItem(hostIdentityKey(lkRoom.name || roomNameRef.current));
    if (disconnectedIdentity !== storedHostIdentity) return;

    const myIdentity = lkRoom.localParticipant?.identity;
    const remaining = Array.from(lkRoom.remoteParticipants?.values() || [])
      .filter(p => p && p.identity !== disconnectedIdentity)
      .map(p => p.identity);

    const candidates = [myIdentity, ...remaining].filter(Boolean).sort();
    if (candidates[0] === myIdentity) {
      console.log('[Meet] Hôte parti → je deviens hôte temporaire (', myIdentity, ')');
      setIsHost(true);
      isHostRef.current = true;
      setTimeout(() => {
        publishRef.current?.({ type: 'room_mode_sync', mode: roomModeRef.current });
      }, 600);
    }
  }, []);

  const setupListeners = useCallback((lkRoom) => {
    if (cleanupRef.current) cleanupRef.current();

    const onJoin = (participant) => {
      setParticipants(buildMap(lkRoom));
      const id = participant?.identity;
      if (id) {
        setParticipantSessions(prev => {
          const existing = prev[id] || [];
          if (existing.length > 0 && !existing[existing.length - 1].leaveTime) return prev;
          return { ...prev, [id]: [...existing, { joinTime: Date.now(), leaveTime: null }] };
        });

        const storedHostIdentity = localStorage.getItem(hostIdentityKey(lkRoom.name || roomNameRef.current));
        if (id === storedHostIdentity) {
          const myIdentity = lkRoom.localParticipant?.identity;
          if (id !== myIdentity && isHostRef.current) {
            setTimeout(() => {
              setIsHost(false);
              isHostRef.current = false;
              publishRef.current?.({ type: 'host_restored', originalHost: id });
              console.log('[Meet] Hôte original revenu (', id, '), je cède le rôle temporaire.');
            }, 800);
          }
        }

        if (isHostRef.current) {
          setTimeout(() => {
            publishRef.current?.({ type: 'room_mode_sync', mode: roomModeRef.current });
          }, 700);
        }
      }
    };

    const onLeave = (participant) => {
      setParticipants(buildMap(lkRoom));
      const id = participant?.identity;
      setHandRaisedUsers(prev => { const n = new Set(prev); n.delete(id); return n; });
      setWaitingRoomList(prev => prev.filter(p => p.identity !== id));

      if (id) {
        setParticipantSessions(prev => {
          const existing = [...(prev[id] || [])];
          if (existing.length > 0 && !existing[existing.length - 1].leaveTime) {
            existing[existing.length - 1] = { ...existing[existing.length - 1], leaveTime: Date.now() };
          }
          return { ...prev, [id]: existing };
        });
      }
      handlePotentialHostTransfer(lkRoom, id);
    };

    const onSpeak = (speakers) => setActiveSpeaker(speakers?.[0]?.identity || null);
    const onTrack = () => setParticipants(buildMap(lkRoom));

    lkRoom.on(RoomEvent.ParticipantConnected, onJoin);
    lkRoom.on(RoomEvent.ParticipantDisconnected, onLeave);
    lkRoom.on(RoomEvent.ActiveSpeakersChanged, onSpeak);
    lkRoom.on(RoomEvent.TrackSubscribed, onTrack);
    lkRoom.on(RoomEvent.TrackUnsubscribed, onTrack);
    lkRoom.on(RoomEvent.DataReceived, handleData);

    cleanupRef.current = () => {
      lkRoom.off(RoomEvent.ParticipantConnected, onJoin);
      lkRoom.off(RoomEvent.ParticipantDisconnected, onLeave);
      lkRoom.off(RoomEvent.ActiveSpeakersChanged, onSpeak);
      lkRoom.off(RoomEvent.TrackSubscribed, onTrack);
      lkRoom.off(RoomEvent.TrackUnsubscribed, onTrack);
      lkRoom.off(RoomEvent.DataReceived, handleData);
    };
  }, [buildMap, handleData, handlePotentialHostTransfer]);

  const kickParticipant = useCallback(async (identity) => {
    if (!isHostRef.current) return;
    await publish({ type: 'kick', target: identity });
  }, [publish]);

  const connectToRoom = useCallback(async (token, name, dName, hostFromApi, mode = 'private') => {
    try {
      setConnectionState('connecting');
      setError(null);
      setRoomName(name);
      roomNameRef.current = name;
      setDisplayName(dName);
      setMeetingStartTime(new Date());
      setParticipantSessions({});
      setWaitingRoomList([]);
      setRoomMode(mode);
      roomModeRef.current = mode;

      const host = hostFromApi;
      setIsHost(host);
      isHostRef.current = host;

      const kp = new ExternalE2EEKeyProvider();
      keyProviderRef.current = kp;
      let encryptionOptions = null, e2eeReady = false;

      if (isE2EESupported()) {
        try {
          const worker = new Worker(new URL('livekit-client/e2ee-worker', import.meta.url));
          encryptionOptions = { keyProvider: kp, worker };
          e2eeReady = true;
        } catch (workerErr) {
          console.warn('[E2EE] Worker indisponible:', workerErr.message);
          keyProviderRef.current = null;
        }
      }

      const lkRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        autoSubscribe: true,
        videoCaptureDefaults: { resolution: { width: 720, height: 1280 } },
        rtcConfig: { iceTransportPolicy: 'all', iceCandidatePoolSize: 4 },
        reconnectPolicy: { nextRetryDelayInMs: (ctx) => ctx.elapsedMs > 600_000 ? null : Math.min(30000, 1000 * Math.pow(2, ctx.retryCount)) },
        ...(encryptionOptions ? { encryption: encryptionOptions } : {}),
      });

      roomRef.current = lkRoom;

      lkRoom.on(RoomEvent.Disconnected, () => setConnectionState('disconnected'));
      lkRoom.on(RoomEvent.Reconnecting, () => {
        setConnectionState('reconnecting');
        console.log('[Meet] Reconnexion…');
      });

      lkRoom.on(RoomEvent.Reconnected, async () => {
        setConnectionState('connected');
        console.log('[Meet] Reconnecté !');
        const myIdentity = lkRoom.localParticipant?.identity;
        const storedHost = localStorage.getItem(hostIdentityKey(name));
        if (myIdentity && myIdentity === storedHost) {
          if (!isHostRef.current) {
            setIsHost(true);
            isHostRef.current = true;
            console.log('[Meet] Reconnexion : je reprends mes droits hôte (', myIdentity, ')');
          }
          setTimeout(() => {
            publishRef.current?.({ type: 'host_restored', originalHost: myIdentity });
            publishRef.current?.({ type: 'room_mode_sync', mode: roomModeRef.current });
          }, 600);
        }
      });

      const wsUrl = LIVEKIT_WS_URL.replace(/^http/, 'ws');
      await lkRoom.connect(wsUrl, token);

      if (e2eeReady) {
        try {
          await kp.setKey(name);
          await lkRoom.setE2EEEnabled(true);
        } catch (err) {
          console.warn('[E2EE]', err.message);
          e2eeReady = false;
        }
      }

      setRoom(lkRoom);
      setLocalParticipant(lkRoom.localParticipant);

      const myIdentity = lkRoom.localParticipant?.identity;
      const storedHostIdentity = localStorage.getItem(hostIdentityKey(name));

      if (host) {
        originalHostIdentityRef.current = myIdentity;
        localStorage.setItem(hostIdentityKey(name), myIdentity);
        console.log('[Meet] Hôte original enregistré :', myIdentity);
      } else if (myIdentity && myIdentity === storedHostIdentity) {
        originalHostIdentityRef.current = myIdentity;
        setIsHost(true);
        isHostRef.current = true;
        console.log('[Meet] Hôte original détecté au retour :', myIdentity);
        setTimeout(() => {
          publishRef.current?.({ type: 'host_restored', originalHost: myIdentity });
          publishRef.current?.({ type: 'room_mode_sync', mode: roomModeRef.current });
        }, 800);
      } else if (storedHostIdentity) {
        originalHostIdentityRef.current = storedHostIdentity;
      }

      const now = Date.now();
      const initSessions = {};
      initSessions[lkRoom.localParticipant.identity] = [{ joinTime: now, leaveTime: null }];
      lkRoom.remoteParticipants?.forEach((p, id) => {
        if (p) initSessions[id] = [{ joinTime: now, leaveTime: null }];
      });
      setParticipantSessions(initSessions);
      setParticipants(buildMap(lkRoom));
      setConnectionState('connected');
      setupListeners(lkRoom);

      const [micFree, camFree] = await Promise.all([
        probeDevice({ audio: true }, 5000),
        probeDevice({ video: true }, 5000)
      ]);

      await Promise.allSettled([
        micFree ? lkRoom.localParticipant.setMicrophoneEnabled(true).catch(e => console.warn('[Meet] Micro:', e.message)) : Promise.resolve(),
        camFree ? lkRoom.localParticipant.setCameraEnabled(true).catch(e => console.warn('[Meet] Caméra:', e.message)) : Promise.resolve(),
      ]);

      if (e2eeReady) {
        setE2eeEnabled(true);
        e2eeEnabledRef.current = true;
        setE2eeMode('global');
      }

      if (isHostRef.current) {
        setTimeout(() => publishRef.current?.({ type: 'room_mode_sync', mode }), 1000);
      }

      if (browserCleanupRef.current) {
        browserCleanupRef.current();
        browserCleanupRef.current = null;
      }

      const handleBeforeUnload = () => { try { roomRef.current?.disconnect(); } catch {} };
      window.addEventListener('beforeunload', handleBeforeUnload);
      browserCleanupRef.current = () => window.removeEventListener('beforeunload', handleBeforeUnload);

    } catch (err) {
      console.error('[Meet]', err);
      setError(err.message || 'Erreur');
      setConnectionState('error');
    }
  }, [buildMap, setupListeners]);

  const startMeeting = useCallback(async ({ displayName: dName, roomName: rName, mode = 'private' }) => {
    const data = await createMeeting({ displayName: dName, roomName: rName, mode });
    localStorage.setItem(`room_mode_${data.roomName}`, data.mode || mode);
    await connectToRoom(data.token, data.roomName, dName, data.role === 'host', data.mode || mode);
    return data;
  }, [connectToRoom]);

  const joinRoom = useCallback(async ({ displayName: dName, roomName: rName, mode = 'private' }) => {
    const data = await joinMeeting({ displayName: dName, roomName: rName });
    localStorage.setItem(`room_mode_${data.roomName}`, data.mode || mode);
    await connectToRoom(data.token, data.roomName, dName, data.role === 'host', data.mode || mode);
    return data;
  }, [connectToRoom]);

  const changeRoomMode = useCallback(async (newMode) => {
    if (!isHostRef.current) return;
    setRoomMode(newMode);
    roomModeRef.current = newMode;
    if (roomNameRef.current) localStorage.setItem(`room_mode_${roomNameRef.current}`, newMode);
    await publish({ type: 'room_mode_sync', mode: newMode });
  }, [publish]);

  const toggleAudio = useCallback(async () => {
    const lk = roomRef.current;
    if (!lk?.localParticipant) return;
    const e = !isAudioEnabled;
    await lk.localParticipant.setMicrophoneEnabled(e);
    setIsAudioEnabled(e);
  }, [isAudioEnabled]);

  const toggleVideo = useCallback(async () => {
    const lk = roomRef.current;
    if (!lk?.localParticipant) return;
    const e = !isVideoEnabled;
    await lk.localParticipant.setCameraEnabled(e);
    setIsVideoEnabled(e);
  }, [isVideoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    const lk = roomRef.current;
    if (!lk?.localParticipant) return;
    try {
      const e = !isScreenSharing;
      await lk.localParticipant.setScreenShareEnabled(e);
      setIsScreenSharing(e);
    } catch (err) {
      console.error('[Meet] screen:', err);
    }
  }, [isScreenSharing]);

  const toggleRecording = useCallback(async () => {
    if (!roomName || !displayName) return;
    try {
      if (isRecording) {
        await stopRecording({ displayName, roomName, egressId });
        setIsRecording(false);
        setEgressId(null);
      } else {
        const data = await startRecording({ displayName, roomName });
        setIsRecording(true);
        setEgressId(data.egressId);
      }
    } catch (err) {
      console.error('[Meet] rec:', err);
    }
  }, [isRecording, roomName, displayName, egressId]);

  const toggleHandRaise = useCallback(async () => {
    const raised = !myHandRaised;
    setMyHandRaised(raised);
    await publish({ type: 'hand_raise', raised, name: displayName });
  }, [myHandRaised, displayName, publish]);

  const sendChatMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    const msg = { type: 'chat', text: text.trim(), id: Date.now() };
    setChatMessages(prev => [...prev, { id: msg.id, from: 'Vous', text: msg.text, ts: Date.now(), isMe: true }]);
    await publish(msg);
  }, [publish]);

  const updateSharedNote = useCallback(async (content) => {
    setSharedNote(content);
    await publish({ type: 'note', content });
  }, [publish]);

  const admitParticipant = useCallback(async (identity) => admitFromWaitingRoom(identity), [admitFromWaitingRoom]);

  const sendReaction = useCallback(async (emoji) => {
    setReactionEvents(prev => [...prev.slice(-19), { emoji, name: 'Vous', ts: Date.now() }]);
    await publish({ type: 'reaction', emoji });
  }, [publish]);

  const modMuteAudio = useCallback(async (t) => {
    if (isHostRef.current) await publish({ type: 'mod_mute_audio', target: t });
  }, [publish]);

  const modMuteVideo = useCallback(async (t) => {
    if (isHostRef.current) await publish({ type: 'mod_mute_video', target: t });
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

  const shareFile = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      try {
        const blobUrl = URL.createObjectURL(file);
        const meta = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: Date.now(),
          uploadedBy: displayName,
          blobUrl
        };
        LOCAL_FILES.set(meta.id, meta);
        setSharedFiles(prev => [...prev, meta]);
        publish({ type: 'file_meta', file: { id: meta.id, name: meta.name, size: meta.size, type: meta.type, uploadedAt: meta.uploadedAt } });
        resolve(meta);
      } catch (err) {
        reject(err);
      }
    });
  }, [publish, displayName]);

  // leaveCall CORRIGÉ - AUCUNE redirection automatique
  const leaveCall = useCallback(async () => {
    if (browserCleanupRef.current) {
      browserCleanupRef.current();
      browserCleanupRef.current = null;
    }
    const lk = roomRef.current;
    try {
      if (isRecording) await stopRecording({ displayName, roomName, egressId }).catch(() => {});
      if (lk) {
        if (e2eeEnabledRef.current) { try { await lk.setE2EEEnabled(false); } catch {} }
        await lk.localParticipant?.setMicrophoneEnabled(false).catch(() => {});
        await lk.localParticipant?.setCameraEnabled(false).catch(() => {});
        await lk.disconnect();
      }
    } catch (e) {
      console.warn('[Meet] leave:', e);
    } finally {
      keyProviderRef.current = null;
      e2eeEnabledRef.current = false;
      LOCAL_FILES.forEach(f => f.blobUrl && URL.revokeObjectURL(f.blobUrl));
      LOCAL_FILES.clear();
      roomRef.current = null;

      setRoom(null);
      setParticipants(new Map());
      setLocalParticipant(null);
      setConnectionState('idle');
      setIsRecording(false);
      setEgressId(null);
      setHandRaisedUsers(new Set());
      setMyHandRaised(false);
      setChatMessages([]);
      setSharedNote('');
      setActivePoll(null);
      setMyPollVote(null);
      setSharedFiles([]);
      setReactionEvents([]);
      setE2eeEnabled(false);
      setE2eeMode('manual');
      setParticipantSessions({});
      setIsHost(false);
      isHostRef.current = false;
      setWaitingRoomList([]);

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    }
  }, [isRecording, displayName, roomName, egressId]);

  const value = {
    room, participants, localParticipant, connectionState, error,
    isConnected: connectionState === 'connected',
    isAudioEnabled, isVideoEnabled, isScreenSharing, isRecording,
    activeSpeaker, handRaisedUsers, myHandRaised,
    sharedNote, chatMessages, isHost, roomName, displayName,
    unreadChat, isChatOpen, meetingStartTime,
    reactionEvents, activePoll, myPollVote, sharedFiles,
    e2eeEnabled, e2eeSupported, e2eeMode, participantSessions,
    waitingRoomList, waitingRoom: waitingRoomList,
    roomMode, changeRoomMode,
    admitFromWaitingRoom, rejectFromWaitingRoom,
    setIsChatOpen, setUnreadChat,
    startMeeting, joinRoom, toggleAudio, toggleVideo,
    toggleScreenShare, toggleRecording, toggleHandRaise,
    sendChatMessage, updateSharedNote, admitParticipant, leaveCall,
    sendReaction, createPoll, togglePollVisibility, votePoll,
    shareFile, modMuteAudio, modMuteVideo, kickParticipant, publish,
  };

  return <MeetingCtx.Provider value={value}>{children}</MeetingCtx.Provider>;
}

export function useMeeting() {
  const ctx = useContext(MeetingCtx);
  if (!ctx) throw new Error('useMeeting must be inside MeetingProvider');
  return ctx;
}