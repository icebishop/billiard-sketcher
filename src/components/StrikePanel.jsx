import React, { useRef, useState, useCallback } from 'react';
import { X, GripHorizontal } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   StrikePanel — "Toma y Efecto" floating widget

   A compact card that floats over the table (bottom-right by default)
   showing two overlapping, semi-transparent balls:
     • Yellow "2" (object ball) — drag horizontally to set hit fullness (toma).
     • White "1" (cue ball) — fixed reference with red spin marker.
   Supports smooth pointer-capture drag & drop anywhere over the table.
═══════════════════════════════════════════════════════════════ */
export default function StrikePanel({
  spin,       // { x, y } range -1..1
  setSpin,
  strike,     // -1 (A fully left) .. 0 (full overlap) .. +1 (A fully right)
  setStrike,
  clothColor = '#0d5c3a',
  onClose,
}) {
  const ballRef = useRef(null);
  const [mode, setMode] = useState(null); // 'strike' | 'spin' | 'move' | null

  /* ── Widget position (draggable float) ── */
  const [pos, setPos]     = useState(null); // null → default bottom-right
  const moveOffset        = useRef({ x: 0, y: 0, parentLeft: 0, parentTop: 0, parentWidth: 0, parentHeight: 0 });

  const BALL = 64;            // ball diameter (px)
  const CARD_W = 260;
  const CARD_H = 128;

  /* ── Spin: click on the WHITE ball face ── */
  const updateSpin = useCallback((e) => {
    const el = ballRef.current;
    if (!el) return;
    const rect   = el.getBoundingClientRect();
    const radius = rect.width / 2;
    let x = (e.clientX - (rect.left + radius)) / radius;
    let y = (e.clientY - (rect.top  + radius)) / radius;
    const dist = Math.hypot(x, y);
    if (dist > 0.8) { x = (x / dist) * 0.8; y = (y / dist) * 0.8; }
    setSpin({ x: +x.toFixed(2), y: +(-y).toFixed(2) });
  }, [setSpin]);

  /* ── Strike (toma): drag horizontally left↔right ── */
  const updateStrike = useCallback((clientX, card) => {
    const rect = card.getBoundingClientRect();
    const t = (clientX - rect.left) / rect.width;
    const v = Math.max(-1, Math.min(1, t * 2 - 1));
    setStrike(+v.toFixed(2));
  }, [setStrike]);

  /* ── Smooth Pointer-Capture Drag Handle methods ── */
  const handleDragStart = (e) => {
    if (e.target.closest('button')) return;
    const widgetEl = e.currentTarget.closest('.strike-widget');
    if (!widgetEl) return;
    const parent = widgetEl.parentElement;
    if (!parent) return;

    const prect = parent.getBoundingClientRect();
    const wrect = widgetEl.getBoundingClientRect();

    moveOffset.current = {
      x: e.clientX - wrect.left,
      y: e.clientY - wrect.top,
      parentLeft: prect.left,
      parentTop: prect.top,
      parentWidth: prect.width,
      parentHeight: prect.height,
    };

    setMode('move');
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleDragMove = (e) => {
    if (mode === 'move') {
      const { x: offsetX, y: offsetY, parentLeft, parentTop, parentWidth, parentHeight } = moveOffset.current;
      const nx = e.clientX - parentLeft - offsetX;
      const ny = e.clientY - parentTop - offsetY;
      setPos({
        x: Math.max(0, Math.min(parentWidth - CARD_W, nx)),
        y: Math.max(0, Math.min(parentHeight - CARD_H, ny)),
      });
    } else if (mode === 'spin') {
      updateSpin(e);
    } else if (mode === 'strike') {
      const card = e.currentTarget;
      updateStrike(e.clientX, card);
    }
  };

  const handleDragEnd = (e) => {
    if (mode === 'move') {
      try {
        if (e.target.hasPointerCapture(e.pointerId)) {
          e.target.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    }
    setMode(null);
  };

  /* Spin marker position inside the WHITE ball (percent). */
  const markerX = 50 + spin.x * 50 * 0.8;
  const markerY = 50 - spin.y * 50 * 0.8;

  const maxShift = BALL;
  const shiftX   = strike * maxShift;

  const fullness = Math.max(0, 1 - Math.abs(strike));
  const fractionLabel = (() => {
    if (fullness >= 0.94) return '1/1';
    if (fullness >= 0.80) return '7/8';
    if (fullness >= 0.68) return '3/4';
    if (fullness >= 0.56) return '5/8';
    if (fullness >= 0.44) return '1/2';
    if (fullness >= 0.31) return '3/8';
    if (fullness >= 0.19) return '1/4';
    if (fullness >= 0.07) return '1/8';
    return '0';
  })();

  const positionStyle = pos
    ? { top: pos.y, left: pos.x }
    : { bottom: 18, right: 18 };

  return (
    <div
      className="fade-in strike-widget"
      style={{
        position: 'absolute',
        ...positionStyle,
        zIndex: 30,
        width: CARD_W,
        height: CARD_H,
        borderRadius: 12,
        background: clothColor,
        border: '2px solid rgba(0,0,0,0.35)',
        boxShadow: '0 12px 34px rgba(0,0,0,0.55), inset 0 0 40px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      onPointerLeave={handleDragEnd}
    >
      {/* Drag handle strip (top) + close button */}
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 22, padding: '0 6px 0 8px',
          background: 'rgba(0,0,0,0.25)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          cursor: mode === 'move' ? 'grabbing' : 'grab',
        }}
        title="Arrastra para mover este panel por la mesa"
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
          <GripHorizontal size={13} color="rgba(255,255,255,0.6)" />
          TOMA / EFECTO
          <span
            style={{
              fontSize: 11, fontWeight: 800,
              padding: '1px 6px', borderRadius: 6,
              background: 'rgba(0,0,0,0.4)', color: '#fde68a',
              fontFamily: "'SF Mono', monospace", letterSpacing: 0,
            }}
            title="Toma (grosor de bola)"
          >
            {fractionLabel}
          </span>
        </span>
        <button
          onClick={onClose}
          title="Cerrar"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 16, height: 16, borderRadius: 4,
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 0,
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Balls stage — drag left/right anywhere here to set toma */}
      <div
        onPointerDown={(e) => { setMode('strike'); updateStrike(e.clientX, e.currentTarget); }}
        style={{
          position: 'relative',
          height: CARD_H - 22,
          cursor: 'ew-resize',
        }}
      >
        {/* Center line */}
        <div style={{ position: 'absolute', left: '50%', top: 12, bottom: 12, width: 1, background: 'rgba(255,255,255,0.14)' }} />

        {/* Yellow "2" (object ball) — moves left↔right across the white ball */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${shiftX}px), -50%)`,
            width: BALL, height: BALL, borderRadius: '50%',
            opacity: 0.6,
            background: 'radial-gradient(circle at 35% 35%, #fde68a, #f5c518 58%, #c98a04 100%)',
            border: '1px solid rgba(202,138,4,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#78350f',
            boxShadow: mode === 'strike' ? '0 0 0 2px rgba(56,189,248,0.55)' : 'none',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          2
        </div>

        {/* White "1" (cue ball) — fixed in center, holds the spin marker */}
        <div
          ref={ballRef}
          onPointerDown={(e) => { e.stopPropagation(); setMode('spin'); updateSpin(e); }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: BALL, height: BALL, borderRadius: '50%',
            opacity: 0.6,
            background: 'radial-gradient(circle at 35% 35%, #ffffff, #dfe6ee 58%, #9aa7b6 100%)',
            border: '1px solid rgba(203,213,225,0.75)',
            cursor: 'crosshair',
            boxShadow: mode === 'spin' ? '0 0 0 2px rgba(56,189,248,0.6)' : 'none',
            zIndex: 2,
          }}
        >
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#475569', pointerEvents: 'none' }}>
            1
          </span>
          {/* Spin / tip contact marker (on the white ball) */}
          <div
            style={{
              position: 'absolute',
              left: `${markerX}%`, top: `${markerY}%`,
              width: 12, height: 12, borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#dc2626', border: '2px solid #fff',
              boxShadow: '0 0 6px rgba(220,38,38,0.9)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
