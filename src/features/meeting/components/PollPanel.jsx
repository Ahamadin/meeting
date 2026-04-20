// src/features/meeting/components/PollPanel.jsx
import { useState } from 'react';
import { Plus, Trash2, BarChart2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: '#ffffff',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  caretColor: '#fff',
  transition: 'border-color 0.15s',
};

export default function PollPanel() {
  const { activePoll, myPollVote, isHost, createPoll, togglePollVisibility, votePoll, displayName } = useMeeting();

  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options,  setOptions]  = useState(['', '']);
  const [formErr,  setFormErr]  = useState('');

  // Calculs
  const totalVotes = activePoll
    ? Object.values(activePoll.votes || {}).reduce((s, a) => s + a.length, 0) : 0;
  const getPct   = (id) => totalVotes === 0 ? 0 : Math.round(((activePoll.votes?.[id] || []).length / totalVotes) * 100);
  const getCount = (id) => (activePoll?.votes?.[id] || []).length;

  // Créer
  const handleCreate = async () => {
    setFormErr('');
    if (!question.trim()) { setFormErr('La question est obligatoire.'); return; }
    const valid = options.filter(o => o.trim());
    if (valid.length < 2) { setFormErr('Au moins 2 options sont requises.'); return; }
    await createPoll({ question: question.trim(), options: valid });
    setCreating(false); setQuestion(''); setOptions(['', '']);
  };

  // Plus de limite — on peut ajouter autant d'options que souhaité
  const addOption    = () => setOptions(p => [...p, '']);
  const removeOption = (i) => options.length > 2 && setOptions(p => p.filter((_, x) => x !== i));
  const setOpt       = (i, v) => setOptions(p => p.map((o, x) => x === i ? v : o));

  // ── Sondage actif ──────────────────────────────────────────
  if (activePoll) {
    const isCreator  = activePoll.createdBy === displayName;
    const canControl = isHost || isCreator;
    const hasVoted   = myPollVote !== null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '14px', overflowY: 'auto' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>Sondage en cours</p>
            <h3 style={{ color: '#fff', fontWeight: '600', fontSize: '14px', lineHeight: '1.4' }}>{activePoll.question}</h3>
          </div>

          {/* Bouton afficher/masquer (hôte/créateur) */}
          {canControl && (
            <button
              onClick={() => togglePollVisibility(!activePoll.visible)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '10px', border: 'none',
                cursor: 'pointer', fontSize: '11px', fontWeight: '700', flexShrink: 0,
                background: activePoll.visible ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.08)',
                color: activePoll.visible ? '#4ade80' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.15s',
              }}
            >
              {activePoll.visible
                ? <><Eye style={{ width: '13px', height: '13px' }} />Visible</>
                : <><EyeOff style={{ width: '13px', height: '13px' }} />Masqué</>}
            </button>
          )}
        </div>

        {/* Vue hôte/créateur : résultats toujours visibles */}
        {canControl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activePoll.options.map(opt => {
              const pct   = getPct(opt.id);
              const count = getCount(opt.id);
              const isMyVote = myPollVote === opt.id;
              return (
                <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isMyVote && <CheckCircle style={{ width: '13px', height: '13px', color: '#60a5fa' }} />}
                      <span style={{ color: '#fff', fontSize: '13px' }}>{opt.text}</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{count} vote{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ height: '24px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: isMyVote ? '#2563eb' : 'rgba(255,255,255,0.18)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: '10px', color: '#fff', fontSize: '11px', fontWeight: '700' }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textAlign: 'right' }}>
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''} au total
            </p>

            {/* Vote de l'hôte aussi */}
            {!hasVoted && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px' }}>Voter :</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activePoll.options.map(opt => (
                    <button key={opt.id} onClick={() => votePoll(opt.id)} style={{
                      padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '12px',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.25)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setCreating(true)}
              style={{
                marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              <Plus style={{ width: '14px', height: '14px' }} />
              Nouveau sondage
            </button>
          </div>
        )}

        {/* Vue participant : voter si visible, résultats après vote */}
        {!canControl && (
          <div>
            {activePoll.visible ? (
              hasVoted ? (
                // Résultats après vote
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: '4px' }}>
                    <CheckCircle style={{ width: '16px', height: '16px', color: '#4ade80' }} />
                    <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: '600' }}>Vote enregistré !</span>
                  </div>
                  {activePoll.options.map(opt => {
                    const pct = getPct(opt.id); const count = getCount(opt.id); const isMyVote = myPollVote === opt.id;
                    return (
                      <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isMyVote && <CheckCircle style={{ width: '12px', height: '12px', color: '#60a5fa' }} />}
                            <span style={{ color: '#fff', fontSize: '13px' }}>{opt.text}</span>
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{count}</span>
                        </div>
                        <div style={{ height: '22px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: isMyVote ? '#2563eb' : 'rgba(255,255,255,0.18)', borderRadius: '8px', transition: 'width 0.5s ease' }} />
                          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: '10px', color: '#fff', fontSize: '11px', fontWeight: '700' }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textAlign: 'right' }}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
                </div>
              ) : (
                // Choisir une option
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>Choisissez une option :</p>
                  {activePoll.options.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => votePoll(opt.id)}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'rgba(255,255,255,0.06)', color: '#fff',
                        fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                        textAlign: 'left', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.25)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.6)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              )
            ) : (
              // Pas encore visible
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <EyeOff style={{ width: '36px', height: '36px', color: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: '500' }}>En attente</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '6px' }}>L'hôte n'a pas encore partagé le sondage.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Formulaire de création ────────────────────────────────
  if (creating && isHost) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '14px', overflowY: 'auto' }}>
        <h3 style={{ color: '#fff', fontWeight: '600', fontSize: '14px', margin: 0 }}>Créer un sondage</h3>

        <div>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Question</label>
          <textarea
            rows={3}
            style={{ ...inputStyle, resize: 'none' }}
            placeholder="Ex: Quel jour préférez-vous ?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
          />
        </div>

        <div>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
            Options ({options.length})
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', width: '18px', textAlign: 'right', flexShrink: 0 }}>{i+1}.</span>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={`Option ${i+1}`}
                  value={opt}
                  onChange={e => setOpt(i, e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.18)'}
                />
                {options.length > 2 && (
                  <button onClick={() => removeOption(i)} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
                    <Trash2 style={{ width: '14px', height: '14px' }} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Bouton "Ajouter" toujours visible, sans aucune limite */}
          <button
            onClick={addOption}
            style={{
              marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px',
              color: 'rgba(255,255,255,0.45)', fontSize: '12px',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <Plus style={{ width: '13px', height: '13px' }} />Ajouter une option
          </button>
        </div>

        {formErr && <p style={{ color: '#f87171', fontSize: '12px' }}>{formErr}</p>}

        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '8px' }}>
          <button onClick={() => { setCreating(false); setFormErr(''); }} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handleCreate} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            Créer
          </button>
        </div>
      </div>
    );
  }

  // ── État vide ─────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px', textAlign: 'center', gap: '14px' }}>
      <BarChart2 style={{ width: '40px', height: '40px', color: 'rgba(255,255,255,0.15)' }} />
      <div>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: '500' }}>Aucun sondage actif</p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '6px' }}>
          {isHost ? 'Créez un sondage pour recueillir les avis.' : 'L\'hôte peut créer un sondage à tout moment.'}
        </p>
      </div>
      {isHost && (
        <button onClick={() => setCreating(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
          <Plus style={{ width: '16px', height: '16px' }} />Créer un sondage
        </button>
      )}
    </div>
  );
}