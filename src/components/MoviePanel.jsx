import React, { useEffect, useRef, useState } from 'react';
import { Film, Play, Square, Save, Trash2, Clock } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   MoviePanel — sidebar section showing captured frames, exposure
   times, a Play button to animate them, and a Save button.
═══════════════════════════════════════════════════════════════ */
export default function MoviePanel({
  frames,
  onRemoveFrame,
  onUpdateFrameTime,
  onSaveMovie,
}) {
  const [playing, setPlaying]         = useState(false);
  const [currentIdx, setCurrentIdx]   = useState(null);
  const timerRef = useRef(null);

  const totalSeconds = frames.reduce((sum, f) => sum + (Number(f.seconds) || 0), 0);

  // ── Playback engine ──
  useEffect(() => {
    if (!playing) return;
    if (frames.length === 0) { setPlaying(false); return; }

    let idx = 0;
    setCurrentIdx(0);

    const advance = () => {
      const frame = frames[idx];
      const durationMs = Math.max(0.05, Number(frame?.seconds) || 1) * 1000;
      timerRef.current = setTimeout(() => {
        idx += 1;
        if (idx >= frames.length) {
          setPlaying(false);
          setCurrentIdx(null);
          return;
        }
        setCurrentIdx(idx);
        advance();
      }, durationMs);
    };
    advance();

    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const togglePlay = () => {
    if (playing) {
      clearTimeout(timerRef.current);
      setPlaying(false);
      setCurrentIdx(null);
    } else {
      setPlaying(true);
    }
  };

  return (
    <div
      className="glass-panel"
      style={{ margin: '0 10px', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      <h3
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Film size={14} color="var(--amber)" />
          Película
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>
          {frames.length} {frames.length === 1 ? 'toma' : 'tomas'} · {totalSeconds.toFixed(1)}s
        </span>
      </h3>

      {/* ── Playback preview ── */}
      {currentIdx !== null && frames[currentIdx] && (
        <div
          style={{
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--border-active)',
            boxShadow: '0 0 0 3px var(--bg-active)',
          }}
        >
          <img
            src={frames[currentIdx].dataUrl}
            alt={`Fotograma ${currentIdx + 1}`}
            style={{ display: 'block', width: '100%' }}
          />
        </div>
      )}

      {/* ── Thumbnails list ── */}
      {frames.length === 0 ? (
        <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.45, textAlign: 'center', padding: '8px 0' }}>
          Activa la herramienta <strong style={{ color: 'var(--text)' }}>Película</strong> y añade fotogramas
          desde la barra para construir tu animación.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto', paddingRight: 2 }}>
          {frames.map((frame, i) => (
            <div
              key={frame.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: 6, borderRadius: 8,
                background: currentIdx === i ? 'var(--bg-active)' : 'rgba(255,255,255,0.03)',
                border: currentIdx === i ? '1px solid var(--border-active)' : '1px solid var(--border)',
                transition: 'all 0.15s',
              }}
            >
              {/* Index badge */}
              <span
                style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--sky-light)',
                  minWidth: 16, textAlign: 'center', fontFamily: "'SF Mono', monospace",
                }}
              >
                {i + 1}
              </span>

              {/* Thumbnail */}
              <img
                src={frame.dataUrl}
                alt={`Fotograma ${i + 1}`}
                style={{
                  width: 72, height: 36, objectFit: 'cover',
                  borderRadius: 5, border: '1px solid var(--border)', flexShrink: 0,
                }}
              />

              {/* Seconds input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, minWidth: 0 }}>
                <Clock size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={frame.seconds}
                  onChange={(e) => onUpdateFrameTime(frame.id, e.target.value)}
                  title="Tiempo de exposición en segundos"
                  style={{
                    width: 46,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border)',
                    borderRadius: 5,
                    color: 'var(--text)',
                    fontSize: 11,
                    padding: '3px 5px',
                    fontFamily: "'SF Mono', monospace",
                  }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>s</span>
              </div>

              {/* Remove */}
              <button
                onClick={() => onRemoveFrame(frame.id)}
                title="Eliminar fotograma"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: 5,
                  background: 'transparent', border: 'none',
                  color: '#f87171', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
        <button
          onClick={togglePlay}
          disabled={frames.length === 0}
          className="btn-secondary"
          style={{
            flex: 1, justifyContent: 'center', padding: '7px 10px', fontSize: 12,
            opacity: frames.length === 0 ? 0.45 : 1,
            cursor: frames.length === 0 ? 'not-allowed' : 'pointer',
          }}
          title="Reproducir animación"
        >
          {playing ? <Square size={13} /> : <Play size={13} />}
          {playing ? 'Detener' : 'Reproducir'}
        </button>

        <button
          onClick={onSaveMovie}
          disabled={frames.length === 0}
          className="btn-primary"
          style={{
            flex: 1, justifyContent: 'center', padding: '7px 10px', fontSize: 12,
            opacity: frames.length === 0 ? 0.45 : 1,
            cursor: frames.length === 0 ? 'not-allowed' : 'pointer',
          }}
          title="Guardar la película como archivo de vídeo"
        >
          <Save size={13} />
          Guardar
        </button>
      </div>
    </div>
  );
}
