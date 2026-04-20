// src/components/IncomingCallHandler.jsx
import { useEffect, useState, useRef } from 'react';
import IncomingCallModal from './IncomingCallModal';
import { liveKitCallManager } from '../services/call/LiveKitCallManager';
import { isCallEnded, markCallEnded } from '../utils/callState';
import { addMissedCall } from '../services/call/missedCalls.service';

export default function IncomingCallHandler({ navigate }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false); // NOUVEAU : Protection double clic
  const callTimeoutRef = useRef(null);

  useEffect(() => {
    const handleIncoming = (e) => {
      const { roomId, callId, isVideo, from } = e.detail;
      
      // Vérifier si l'appel a déjà été traité
      if (!callId || isCallEnded(callId)) {
        console.log('[IncomingCallHandler] Appel déjà traité, ignoré');
        return;
      }

      console.log('[IncomingCallHandler] Appel entrant reçu:', { roomId, callId, from });

      setIncomingCall({ roomId, callId, isVideo, from });

      // Timeout de 60 secondes pour appel manqué
      callTimeoutRef.current = setTimeout(() => {
        console.log('[IncomingCallHandler] Timeout appel - Marqué comme manqué');
        
        addMissedCall({
          roomId,
          callId,
          caller: from,
          isVideo,
          timestamp: Date.now(),
        });
        
        markCallEnded(callId);
        setIncomingCall(null);
        setIsAccepting(false);
      }, 60000);
    };

    const handleHangup = (e) => {
      const { callId } = e.detail || {};
      
      if (!callId) {
        console.warn('[IncomingCallHandler] Hangup sans callId');
        return;
      }

      console.log('[IncomingCallHandler]  Hangup reçu:', callId);

      markCallEnded(callId);
      
      // Fermer la modal si c'est le même appel
      setIncomingCall(prev => {
        if (prev?.callId === callId) {
          console.log('[IncomingCallHandler] Fermeture modal pour callId:', callId);
          return null;
        }
        return prev;
      });
      
      setIsAccepting(false);
    };

    window.addEventListener('incoming-call', handleIncoming);
    window.addEventListener('call-hangup', handleHangup);

    return () => {
      window.removeEventListener('incoming-call', handleIncoming);
      window.removeEventListener('call-hangup', handleHangup);
      
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
    };
  }, []); // Dépendances vides pour n'enregistrer qu'une fois

  const handleAccept = async () => {
    // PROTECTION : Empêcher les doubles clics
    if (!incomingCall || isAccepting) {
      console.warn('[IncomingCallHandler]  Déjà en cours d\'acceptation ou pas d\'appel');
      return;
    }
    
    setIsAccepting(true);
    
    // Annuler le timeout d'appel manqué
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    
    console.log('[IncomingCallHandler] Acceptation appel:', incomingCall.callId);
    
    try {
      await liveKitCallManager.acceptIncomingCall(incomingCall);
      
      console.log('[IncomingCallHandler] Navigation vers meeting');
      
      // Fermer la modal
      setIncomingCall(null);
      
      // CORRECTION : Utiliser () au lieu de ``
      navigate(`/meeting/${encodeURIComponent(incomingCall.roomId)}`);
      
    } catch (err) {
      console.error('[IncomingCallHandler] Erreur acceptation:', err);
      setIncomingCall(null);
      setIsAccepting(false);
    }
  };

  const handleReject = () => {
    if (!incomingCall) {
      console.warn('[IncomingCallHandler]  Pas d\'appel à rejeter');
      return;
    }
    
    console.log('[IncomingCallHandler]  Rejet appel:', incomingCall.callId);
    
    // Annuler le timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    
    // Ajouter aux appels manqués
    addMissedCall({
      roomId: incomingCall.roomId,
      callId: incomingCall.callId,
      caller: incomingCall.from,
      isVideo: incomingCall.isVideo,
      timestamp: Date.now(),
    });
    
    // Marquer comme terminé
    markCallEnded(incomingCall.callId);
    
    // Fermer la modal
    setIncomingCall(null);
    setIsAccepting(false);
  };

  // Ne rien afficher si pas d'appel entrant
  if (!incomingCall) return null;

  return (
    <IncomingCallModal
      visible
      call={incomingCall}
      onAccept={handleAccept}
      onReject={handleReject}
      isAccepting={isAccepting} // Passer l'état pour désactiver le bouton
    />
  );
}