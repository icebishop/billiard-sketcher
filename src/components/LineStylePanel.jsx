import React from 'react';
import { PenLine, ChevronDown } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Cian',    hex: '#06b6d4' },
  { name: 'Ámbar',   hex: '#f59e0b' },
  { name: 'Blanco',  hex: '#f8fafc' },
  { name: 'Rojo',    hex: '#ef4444' },
  { name: 'Verde',   hex: '#22c55e' },
  { name: 'Violeta', hex: '#a855f7' },
  { name: 'Rosa',    hex: '#ec4899' },
  { name: 'Naranja', hex: '#f97316' },
];

const LINE_STYLES = [
  {
    id: 'solid',
    label: 'Sólida',
    // SVG preview
    dash: null,
  },
  {
    id: 'dashed',
    label: 'Guiones',
    dash: '8 4',
  },
  {
    id: 'dotted',
    label: 'Puntos',
    dash: '2 6',
  },
];

function DashPreview({ dashArray, color = '#06b6d4', strokeWidth = 2 }) {
  return (
    <svg width="44" height="14" viewBox="0 0 44 14" style={{ display: 'block' }}>
      <line
        x1="2"
        y1="7"
        x2="42"
        y2="7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dashArray || undefined}
      />
    </svg>
  );
}

export default function LineStylePanel({ selectedLine, onUpdateLine }) {
  const disabled = !selectedLine;
  const currentColor = selectedLine?.color || '#06b6d4';
  const currentStyle = selectedLine?.style || 'solid';
  const currentWidth = selectedLine?.width || 2;
  const isArrow      = selectedLine?.isArrow ?? false;

  return (
    <div
      className="glass-panel p-4 flex flex-col gap-4 transition-all duration-200"
      style={{ opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-200">
          <PenLine className="w-4 h-4 text-cyan-400" />
          Estilo de Línea
        </h3>
        {disabled && (
          <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            selecciona una línea
          </span>
        )}
      </div>

      {/* ── Color ── */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">
          Color
        </label>

        {/* Preset swatches */}
        <div className="grid grid-cols-4 gap-1.5">
          {PRESET_COLORS.map((c) => {
            const isActive = currentColor.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex}
                title={c.name}
                onClick={() => onUpdateLine({ color: c.hex })}
                className="relative h-7 rounded-md transition-all duration-150 focus:outline-none"
                style={{ backgroundColor: c.hex }}
              >
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-md"
                    style={{
                      boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${c.hex}`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Custom picker row */}
        <div className="flex items-center gap-2 mt-0.5">
          <label className="text-xs text-slate-400 shrink-0">Personalizado</label>
          <div className="flex items-center gap-1.5 bg-slate-800/70 border border-slate-700 rounded-lg px-2 py-1 flex-1">
            <input
              id="line-custom-color"
              type="color"
              value={currentColor}
              onChange={(e) => onUpdateLine({ color: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
              style={{ WebkitAppearance: 'none' }}
            />
            <span className="text-xs font-mono text-slate-400 select-all">{currentColor}</span>
          </div>
        </div>
      </div>

      {/* ── Line Type ── */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">
          Tipo de línea
        </label>
        <div className="grid grid-cols-3 gap-2">
          {LINE_STYLES.map((t) => {
            const isActive = currentStyle === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onUpdateLine({ style: t.id })}
                className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border-2 transition-all duration-150 ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-950/60 shadow-sm shadow-cyan-900/50'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                }`}
              >
                <DashPreview
                  dashArray={t.dash}
                  color={isActive ? '#38bdf8' : '#64748b'}
                  strokeWidth={2}
                />
                <span className={`text-[10px] font-semibold ${isActive ? 'text-cyan-300' : 'text-slate-500'}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Thickness ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Grosor
          </label>
          <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-900/50 px-2 py-0.5 rounded-full">
            {currentWidth}px
          </span>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-1.5 mb-1">
          {[1, 2, 3, 4, 6, 8].map((w) => (
            <button
              key={w}
              onClick={() => onUpdateLine({ width: w })}
              title={`${w}px`}
              className={`flex-1 rounded transition-all duration-150 border ${
                currentWidth === w
                  ? 'border-cyan-400 bg-cyan-500/20'
                  : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
              }`}
              style={{ height: Math.max(10, w + 6) }}
            />
          ))}
        </div>

        {/* Slider */}
        <input
          type="range"
          min={1}
          max={8}
          step={1}
          value={currentWidth}
          onChange={(e) => onUpdateLine({ width: Number(e.target.value) })}
          className="w-full accent-cyan-500"
        />
      </div>

      {/* ── Arrow Toggle ── */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <span className="text-xs text-slate-300 font-medium">Punta de flecha</span>
        <button
          onClick={() => onUpdateLine({ isArrow: !isArrow })}
          className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
            isArrow
              ? 'border-amber-500 bg-amber-950/50 text-amber-300'
              : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-500'
          }`}
        >
          <span className="text-sm">{isArrow ? '→' : '—'}</span>
          {isArrow ? 'Activada' : 'Desactivada'}
        </button>
      </div>
    </div>
  );
}
