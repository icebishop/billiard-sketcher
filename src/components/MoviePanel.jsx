import React, { useEffect, useRef, useState } from 'react';
import { Film, Play, Square, Save, Trash2, Clock, Loader2, Camera, Type, Image, Sparkles } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   MoviePanel — sidebar section showing captured frames, exposure
   times, watermark & header text settings, play animation & save.
═══════════════════════════════════════════════════════════════ */
export default function MoviePanel({
  frames,
  onRemoveFrame,
  onUpdateFrameTime,
  onSaveMovie,
  isSaving = false,
  onAddFrame,
  movieTitleText = 'Billiard Sketcher — Animación 3 Bandas',
  onMovieTitleTextChange = () => {},
  movieShowHeader = true,
  onMovieShowHeaderChange = () => {},
  movieShowWatermark = true,
  onMovieShowWatermarkChange = () => {},
  movieWatermarkText = 'Billiard Sketcher • 3-Bandas HD',
  onMovieWatermarkTextChange = () => {},
}) {
  const [playing, setPlaying]         = useState(false);
  const [currentIdx, setCurrentIdx]   = useState(null);
  const [showSettings, setShowSettings] = useState(true);
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
      {/* Header */}
      <h3
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Film size={14} color="var(--amber)" />
          Película HD
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>
          {frames.length} {frames.length === 1 ? 'toma' : 'tomas'} · {totalSeconds.toFixed(1)}s
        </span>
      </h3>

      {/* ── Add frame action button inside panel ── */}
      <button
        onClick={onAddFrame}
        className="btn-primary"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '7px 10px', fontSize: 12, fontWeight: 700,
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#ffffff', border: 'none', borderRadius: 6, cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
        }}
        title="Capturar la vista actual de la mesa como fotograma HD"
      >
        <Camera size={14} />
        Capturar Toma HD
      </button>

      {/* ── Movie Text & Watermark Settings ── */}
      <div
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--sky-light)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Type size={12} />
            Texto y Marca de Agua
          </span>
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            {showSettings ? 'Ocultar' : 'Ajustar'}
          </button>
        </div>

        {showSettings && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
            {/* Title Text Input */}
            <div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>
                Título en Banner
              </span>
              <input
                type="text"
                value={movieTitleText}
                onChange={(e) => onMovieTitleTextChange(e.target.value)}
                placeholder="Ej: Billiard Sketcher — Animación 3 Bandas"
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border)',
                  borderRadius: 5,
                  padding: '4px 8px',
                  color: 'var(--text)',
                  fontSize: 11,
                }}
              />
            </div>

            {/* Checkbox: Show Banner */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={movieShowHeader}
                onChange={(e) => onMovieShowHeaderChange(e.target.checked)}
                style={{ accentColor: 'var(--amber)', cursor: 'pointer' }}
              />
              Incluir Banner Superior
            </label>

            {/* Checkbox: Show Watermark */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={movieShowWatermark}
                  onChange={(e) => onMovieShowWatermarkChange(e.target.checked)}
                  style={{ accentColor: 'var(--amber)', cursor: 'pointer' }}
                />
                Marca de Agua
              </label>

              {movieShowWatermark && (
                <div style={{ marginTop: 3, paddingLeft: 18 }}>
                  <input
                    type="text"
                    value={movieWatermarkText}
                    onChange={(e) => onMovieWatermarkTextChange(e.target.value)}
                    placeholder="Ej: Billiard Sketcher • 3-Bandas HD"
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid var(--border)',
                      borderRadius: 5,
                      padding: '4px 8px',
                      color: 'var(--text)',
                      fontSize: 11,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
        <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.45, textAlign: 'center', padding: '6px 0' }}>
          Configura el texto/marca de agua arriba y haz clic en <strong style={{ color: 'var(--amber)' }}>Capturar Toma HD</strong> para añadir fotogramas.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto', paddingRight: 2 }}>
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
          disabled={frames.length === 0 || isSaving}
          className="btn-primary"
          style={{
            flex: 1, justifyContent: 'center', padding: '7px 10px', fontSize: 12,
            opacity: (frames.length === 0 || isSaving) ? 0.45 : 1,
            cursor: (frames.length === 0 || isSaving) ? 'not-allowed' : 'pointer',
          }}
          title="Guardar la película como archivo de vídeo"
        >
          {isSaving ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
          {isSaving ? 'Guardando…' : 'Guardar Película'}
        </button>
      </div>
    </div>
  );
}
