import React from 'react';
import { CircleDot, Trash2, Plus, RotateCcw, Check, MousePointer } from 'lucide-react';

const POINT_COLORS = [
  { hex: '#ef4444', name: 'Rojo'     },
  { hex: '#06b6d4', name: 'Cian'     },
  { hex: '#f59e0b', name: 'Ámbar'    },
  { hex: '#22c55e', name: 'Verde'    },
  { hex: '#f8fafc', name: 'Blanco'   },
  { hex: '#f97316', name: 'Naranja'  },
  { hex: '#a855f7', name: 'Violeta'  },
  { hex: '#0f172a', name: 'Oscuro'   },
];

const RADIUS_PRESETS = [4, 8, 12, 16, 24];

export default function PointPanel({
  pointRadius,
  setPointRadius,
  pointColor,
  setPointColor,
  points,
  setPoints,
  selectedPointId,
  setSelectedPointId,
  activeTool,
  setActiveTool,
}) {
  const selectedPoint = points.find(p => p.id === selectedPointId);
  const activeRadius  = selectedPoint ? selectedPoint.radius : pointRadius;
  const activeColor   = selectedPoint ? selectedPoint.color  : pointColor;

  const handleRadiusChange = (newRadius) => {
    const val = Math.max(2, Math.min(50, Number(newRadius) || 8));
    setPointRadius(val);
    if (selectedPointId) {
      setPoints(prev => prev.map(p => (p.id === selectedPointId ? { ...p, radius: val } : p)));
    }
  };

  const handleColorChange = (newColor) => {
    setPointColor(newColor);
    if (selectedPointId) {
      setPoints(prev => prev.map(p => (p.id === selectedPointId ? { ...p, color: newColor } : p)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedPointId) {
      setPoints(prev => prev.filter(p => p.id !== selectedPointId));
      setSelectedPointId(null);
    }
  };

  const handleClearAll = () => {
    if (points.length === 0) return;
    if (window.confirm('¿Desea borrar todos los puntos de la mesa?')) {
      setPoints([]);
      setSelectedPointId(null);
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        margin: '0 10px',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* ── Panel Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          <CircleDot size={15} color="var(--sky-light)" />
          Puntos en Mesa
        </h3>
        <span
          className="tb-value"
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 99,
            background: 'rgba(56,189,248,0.12)',
            border: '1px solid rgba(56,189,248,0.3)',
          }}
        >
          {points.length} {points.length === 1 ? 'punto' : 'puntos'}
        </span>
      </div>

      {/* ── Selection Status Indicator ── */}
      {selectedPoint ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(14,165,233,0.15)',
            border: '1px solid rgba(14,165,233,0.4)',
            fontSize: 11,
            color: 'var(--sky-light)',
          }}
        >
          <span>Punto seleccionado</span>
          <button
            onClick={() => setSelectedPointId(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 10.5,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Deseleccionar
          </button>
        </div>
      ) : activeTool !== 'point' ? (
        <button
          onClick={() => setActiveTool('point')}
          className="btn-secondary"
          style={{
            width: '100%',
            justifyContent: 'center',
            fontSize: 11.5,
            padding: '6px 10px',
            borderColor: 'rgba(56,189,248,0.3)',
          }}
        >
          <Plus size={13} color="var(--sky-light)" />
          Añadir puntos [P]
        </button>
      ) : (
        <div
          style={{
            fontSize: 10.5,
            color: '#34d399',
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <MousePointer size={13} />
          Modo punto activo: haz clic sobre la mesa o bandas.
        </div>
      )}

      {/* ── 1. Radius Configuration (Radio) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>
            RADIO DEL PUNTO (RADIO)
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--sky-light)',
              fontFamily: "'SF Mono', monospace",
            }}
          >
            {activeRadius} px
          </span>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min={2}
          max={40}
          step={1}
          value={activeRadius}
          onChange={(e) => handleRadiusChange(e.target.value)}
          style={{
            width: '100%',
            accentColor: 'var(--sky-light)',
            cursor: 'pointer',
          }}
          title={`Radio: ${activeRadius}px`}
        />

        {/* Quick Radius Presets */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'space-between' }}>
          {RADIUS_PRESETS.map((r) => (
            <button
              key={r}
              onClick={() => handleRadiusChange(r)}
              style={{
                flex: 1,
                padding: '3px 0',
                fontSize: 10,
                borderRadius: 'var(--radius-sm)',
                border: activeRadius === r ? '1px solid var(--sky-light)' : '1px solid var(--border)',
                background: activeRadius === r ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.03)',
                color: activeRadius === r ? 'var(--sky-light)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: activeRadius === r ? 700 : 500,
                transition: 'all 0.12s',
              }}
            >
              {r}px
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Color Selection ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>COLOR DEL PUNTO</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {POINT_COLORS.map(({ hex, name }) => (
            <button
              key={hex}
              onClick={() => handleColorChange(hex)}
              title={name}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: hex,
                border: activeColor === hex ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transform: activeColor === hex ? 'scale(1.18)' : 'scale(1)',
                boxShadow: activeColor === hex ? '0 0 0 2px var(--sky-light)' : 'none',
                transition: 'all 0.12s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {activeColor === hex && <Check size={11} color={hex === '#f8fafc' ? '#000' : '#fff'} strokeWidth={3} />}
            </button>
          ))}

          {/* Custom color input */}
          <div
            title="Color personalizado"
            style={{
              position: 'relative',
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2px dashed rgba(255,255,255,0.4)',
              background: activeColor,
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            <input
              type="color"
              value={activeColor}
              onChange={(e) => handleColorChange(e.target.value)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 3. Actions (Delete Selected / Clear All) ── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          paddingTop: 8,
          borderTop: '1px solid var(--border)',
        }}
      >
        {selectedPoint && (
          <button
            onClick={handleDeleteSelected}
            className="tb-delete"
            style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
            title="Eliminar punto seleccionado"
          >
            <Trash2 size={13} />
            Eliminar
          </button>
        )}

        {points.length > 0 && (
          <button
            onClick={handleClearAll}
            className="tb-ghost"
            style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
            title="Borrar todos los puntos de la mesa"
          >
            <RotateCcw size={13} />
            Limpiar puntos
          </button>
        )}
      </div>
    </div>
  );
}
