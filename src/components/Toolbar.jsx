import React from 'react';
import {
  Move, PenTool, ArrowUpRight, Type, Eraser,
  Download, RotateCcw, CheckCircle, Trash2,
} from 'lucide-react';

/* ── Preset color palette ── */
const COLORS = [
  { hex: '#06b6d4', name: 'Cian'    },
  { hex: '#f59e0b', name: 'Ámbar'   },
  { hex: '#f8fafc', name: 'Blanco'  },
  { hex: '#ef4444', name: 'Rojo'    },
  { hex: '#22c55e', name: 'Verde'   },
  { hex: '#a855f7', name: 'Violeta' },
  { hex: '#f97316', name: 'Naranja' },
  { hex: '#ec4899', name: 'Rosa'    },
];

/* ── SVG dash preview inline ── */
function DashSVG({ dashArray, color = 'currentColor' }) {
  return (
    <svg width="30" height="10" viewBox="0 0 30 10" fill="none">
      <line
        x1="2" y1="5" x2="28" y2="5"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray={dashArray ?? undefined}
      />
    </svg>
  );
}

/* ── Vertical divider ── */
const Sep = () => <div className="tb-sep" />;

/* ═══════════════════════════════════════════════════════════════
   Toolbar Component
═══════════════════════════════════════════════════════════════ */
export default function Toolbar({
  activeTool,
  setActiveTool,
  onDownloadPNG,
  onResetTable,
  isDrawingLine,
  onFinishLine,
  selectedLineId,
  onDropSelectedLine,
  selectedLine,
  onUpdateLine,
}) {
  const tools = [
    { id: 'move',   label: 'Mover',  icon: Move,         shortcut: 'V' },
    { id: 'line',   label: 'Línea',  icon: PenTool,      shortcut: 'L' },
    { id: 'arrow',  label: 'Flecha', icon: ArrowUpRight, shortcut: 'A' },
    { id: 'text',   label: 'Texto',  icon: Type,         shortcut: 'T' },
    { id: 'eraser', label: 'Borrar', icon: Eraser,       shortcut: 'E' },
  ];

  const lineStyles = [
    { id: 'solid',  label: 'Sólida',   dash: null  },
    { id: 'dashed', label: 'Guiones',  dash: '8 4' },
    { id: 'dotted', label: 'Puntos',   dash: '2 5' },
  ];

  /* Show line style controls when drawing OR a line is selected */
  const showStyle = activeTool === 'line' || activeTool === 'arrow' || !!selectedLineId;

  const currentColor = selectedLine?.color ?? '#06b6d4';
  const currentStyle = selectedLine?.style ?? 'solid';
  const currentWidth = selectedLine?.width ?? 2;
  const isArrow      = selectedLine?.isArrow ?? (activeTool === 'arrow');

  const update = (patch) => onUpdateLine?.(patch);

  return (
    <div className="toolbar-bar" role="toolbar" aria-label="Herramientas de dibujo">

      {/* ── Section 1: Drawing Tools ── */}
      <div className="tb-group">
        {tools.map(({ id, label, icon: Icon, shortcut }) => (
          <button
            key={id}
            id={`tool-${id}`}
            onClick={() => setActiveTool(id)}
            title={`${label}  [${shortcut}]`}
            className={`tb-tool${activeTool === id ? ' active' : ''}`}
          >
            <Icon size={15} strokeWidth={2.1} />
            <span className="tb-tool-label">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Section 2: Line Appearance (contextual) ── */}
      {showStyle && (
        <div className="fade-in" style={{ display: 'contents' }}>
          <Sep />

          {/* Line style */}
          <div className="tb-group" role="group" aria-label="Tipo de línea">
            {lineStyles.map(({ id, label, dash }) => (
              <button
                key={id}
                onClick={() => update({ style: id })}
                title={label}
                className={`tb-style${currentStyle === id ? ' active' : ''}`}
              >
                <DashSVG
                  dashArray={dash}
                  color={currentStyle === id ? '#38bdf8' : '#64748b'}
                />
              </button>
            ))}
          </div>

          <Sep />

          {/* Colors */}
          <div className="tb-group" role="group" aria-label="Color de línea">
            {COLORS.map(({ hex, name }) => (
              <button
                key={hex}
                onClick={() => update({ color: hex })}
                title={name}
                className={`tb-color${currentColor === hex ? ' active' : ''}`}
                style={{ background: hex }}
              />
            ))}
            {/* Custom color */}
            <div
              title="Color personalizado"
              className="tb-color-picker"
              style={{ background: currentColor, border: '2px dashed rgba(255,255,255,0.3)', position: 'relative', display: 'inline-flex' }}
            >
              <input
                type="color"
                value={currentColor}
                onChange={(e) => update({ color: e.target.value })}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  opacity: 0, cursor: 'pointer',
                  border: 'none', padding: 0,
                }}
              />
            </div>
          </div>

          <Sep />

          {/* Thickness */}
          <div className="tb-group" style={{ gap: 6 }}>
            <span className="tb-label">Grosor</span>
            <input
              id="line-thickness"
              type="range"
              min={1} max={8} step={1}
              value={currentWidth}
              onChange={(e) => update({ width: Number(e.target.value) })}
              style={{ width: 72, accentColor: '#0ea5e9' }}
              title={`${currentWidth}px`}
            />
            <span className="tb-value">{currentWidth}</span>
          </div>

          <Sep />

          {/* Arrow toggle */}
          <div className="tb-group">
            <button
              onClick={() => update({ isArrow: !isArrow })}
              title="Activar / desactivar punta de flecha"
              className={`tb-tool${isArrow ? ' active' : ''}`}
              style={{ minWidth: 48 }}
            >
              <ArrowUpRight size={15} strokeWidth={2.1} />
              <span className="tb-tool-label">Punta</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Section 3: Line Actions (conditional) ── */}
      {(isDrawingLine || (selectedLineId && !isDrawingLine)) && (
        <>
          <Sep />
          <div className="tb-group">
            {isDrawingLine && (
              <button
                id="btn-finish-line"
                onClick={onFinishLine}
                className="tb-finish"
                title="Finalizar trazado poligonal"
              >
                <CheckCircle size={14} strokeWidth={2.2} />
                Finalizar
              </button>
            )}
            {selectedLineId && !isDrawingLine && (
              <button
                id="btn-delete-line"
                onClick={onDropSelectedLine}
                className="tb-delete"
                title="Eliminar línea seleccionada  [Supr]"
              >
                <Trash2 size={14} strokeWidth={2.2} />
                Eliminar
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Spacer ── */}
      <div style={{ flex: 1, minWidth: 12 }} />

      {/* ── Section 4: Global Actions ── */}
      <div className="tb-group">
        <button
          id="btn-reset-table"
          onClick={onResetTable}
          className="tb-ghost"
          title="Reiniciar mesa y limpiar todos los dibujos"
        >
          <RotateCcw size={14} strokeWidth={2.1} />
          <span style={{ fontSize: 12 }}>Limpiar</span>
        </button>

        <button
          id="btn-export-png"
          onClick={onDownloadPNG}
          className="tb-primary"
          title="Exportar diagrama como PNG de alta resolución"
        >
          <Download size={14} strokeWidth={2.2} />
          Exportar PNG
        </button>
      </div>

    </div>
  );
}
