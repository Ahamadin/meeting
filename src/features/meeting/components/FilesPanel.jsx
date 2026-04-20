// src/features/meeting/components/FilesPanel.jsx
// Les fichiers sont stockés localement dans un Map global (pas via DataChannel)
// car le DataChannel a une limite de taille (~64KB par message)
import { useRef, useState } from 'react';
import { Upload, Download, File, FileText, Image, Film, Archive, X } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';

function FileIcon({ type }) {
  const s = { width: '16px', height: '16px' };
  if (type?.startsWith('image/'))  return <Image style={s} />;
  if (type?.startsWith('video/'))  return <Film style={s} />;
  if (type?.startsWith('text/'))   return <FileText style={s} />;
  if (type?.includes('zip') || type?.includes('rar')) return <Archive style={s} />;
  return <File style={s} />;
}

function formatSize(b) {
  if (b < 1024) return b + ' o';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' Ko';
  return (b / (1024 * 1024)).toFixed(1) + ' Mo';
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function FilesPanel() {
  const { sharedFiles, shareFile } = useMeeting();
  const inputRef    = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);   // 0-100
  const [err,       setErr]       = useState('');
  const MAX = 500 * 1024 * 1024; // 500 Mo

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX) {
      setErr(`Fichier trop volumineux (max 500 Mo). Taille : ${formatSize(file.size)}`);
      return;
    }
    setErr('');
    setUploading(true);
    setProgress(0);

    try {
      // Lecture du fichier avec suivi de progression via FileReader
      await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setProgress(Math.round((ev.loaded / ev.total) * 90)); // 0-90% = lecture
          }
        };
        reader.onload = () => {
          setProgress(95); // 95% = en cours de partage
          resolve();
        };
        reader.onerror = () => reject(new Error('Lecture échouée'));
        reader.readAsArrayBuffer(file); // déclenche onprogress
      });

      await shareFile(file);
      setProgress(100);
      setTimeout(() => setProgress(0), 800);
    } catch (error) {
      console.error('[Files]', error);
      setErr('Erreur lors du partage. Réessayez.');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const download = (f) => {
    const a = document.createElement('a');
    a.href     = f.blobUrl || f.dataUrl;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Zone upload */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <input ref={inputRef} type="file" accept="*/*" style={{ display: 'none' }} onChange={handleFile} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: '12px',
            border: '2px dashed rgba(255,255,255,0.2)',
            background: 'transparent', cursor: uploading ? 'not-allowed' : 'pointer',
            color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '500',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.15s', opacity: uploading ? 0.6 : 1,
            boxSizing: 'border-box',
          }}
          onMouseEnter={e => !uploading && (e.currentTarget.style.borderColor = 'rgba(37,99,235,0.6)')}
          onMouseLeave={e => !uploading && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
        >
          {uploading
            ? <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Partage en cours…</>
            : <><Upload style={{ width: '16px', height: '16px' }} />Partager un fichier (max 500 Mo)</>}
        </button>

        {/* Barre de progression */}
        {uploading && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>Chargement…</span>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '99px',
                background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
                width: `${progress}%`,
                transition: 'width 0.2s ease',
              }} />
            </div>
          </div>
        )}

        {err && (
          <div style={{
            marginTop: '8px', padding: '8px 12px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
            display: 'flex', alignItems: 'flex-start', gap: '8px',
          }}>
            <X style={{ width: '14px', height: '14px', color: '#f87171', flexShrink: 0, marginTop: '1px' }} />
            <span style={{ color: '#f87171', fontSize: '12px' }}>{err}</span>
          </div>
        )}
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>
          Fichiers disponibles uniquement pendant la réunion
        </p>
      </div>

      {/* Liste fichiers */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {sharedFiles.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', textAlign: 'center' }}>
            <File style={{ width: '40px', height: '40px', color: 'rgba(255,255,255,0.12)' }} />
            <div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: '500' }}>Aucun fichier partagé</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '4px' }}>Les fichiers apparaîtront ici</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sharedFiles.map(f => (
              <div
                key={f.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'default',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(37,99,235,0.2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  color: '#60a5fa',
                }}>
                  <FileIcon type={f.type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                    {formatSize(f.size)} · {f.uploadedBy} · {formatTime(f.uploadedAt)}
                  </p>
                </div>
                <button
                  onClick={() => download(f)}
                  style={{
                    padding: '8px', borderRadius: '8px', border: 'none',
                    background: 'rgba(37,99,235,0.15)', cursor: 'pointer',
                    color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s', flexShrink: 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.35)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,99,235,0.15)'}
                  title="Télécharger"
                >
                  <Download style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}