import React, { useRef, useState } from 'react';
import { Target, RotateCcw } from 'lucide-react';

export default function SpinPicker({ spin, setSpin, activeCueBall, setActiveCueBall }) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;

    let x = (e.clientX - centerX) / radius;
    let y = (e.clientY - centerY) / radius;

    // Clamp inside circle
    const distance = Math.sqrt(x * x + y * y);
    if (distance > 0.85) {
      x = (x / distance) * 0.85;
      y = (y / distance) * 0.85;
    }

    setSpin({
      x: parseFloat(x.toFixed(2)),
      y: parseFloat((-y).toFixed(2)), // Invert Y so top is positive
    });
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const resetSpin = () => {
    setSpin({ x: 0, y: 0 });
  };

  // Convert spin coordinates (-1 to 1) to percentage for marker CSS
  const markerX = 50 + spin.x * 50 * 0.85;
  const markerY = 50 - spin.y * 50 * 0.85;

  return (
    <div className="glass-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-200">
          <Target className="w-4 h-4 text-cyan-400" />
          Punto de Contacto (Efecto)
        </h3>
        <button
          onClick={resetSpin}
          className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
          title="Centrar Taco"
        >
          <RotateCcw className="w-3 h-3" />
          Centrar
        </button>
      </div>

      {/* Active Cue Ball Selector */}
      <div className="flex items-center justify-center gap-2 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveCueBall('white')}
          className={`flex-1 py-1 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeCueBall === 'white'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-white border border-slate-400 inline-block shadow-sm"></span>
          Bola Blanca
        </button>
        <button
          onClick={() => setActiveCueBall('yellow')}
          className={`flex-1 py-1 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeCueBall === 'yellow'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-amber-400'
          }`}
        >
          <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600 inline-block shadow-sm"></span>
          Bola Amarilla
        </button>
      </div>

      {/* 2D Cue Ball Face */}
      <div className="flex justify-center my-1">
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={isDragging ? handlePointerMove : undefined}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative w-36 h-36 rounded-full cursor-crosshair select-none shadow-inner border-2 border-slate-300/40 flex items-center justify-center overflow-hidden"
          style={{
            background: activeCueBall === 'white'
              ? 'radial-gradient(circle at 35% 35%, #ffffff, #e2e8f0 60%, #94a3b8 100%)'
              : 'radial-gradient(circle at 35% 35%, #fef08a, #facc15 60%, #d97706 100%)',
            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {/* Cue Ball Grid Lines */}
          <div className="absolute inset-0 border border-slate-400/20 rounded-full"></div>
          <div className="absolute w-full h-[1px] bg-slate-500/30 top-1/2 -translate-y-1/2"></div>
          <div className="absolute h-full w-[1px] bg-slate-500/30 left-1/2 -translate-x-1/2"></div>

          {/* Clock markers */}
          <div className="absolute top-2 text-[9px] font-bold text-slate-600/70">Arriba</div>
          <div className="absolute bottom-2 text-[9px] font-bold text-slate-600/70">Abajo</div>
          <div className="absolute left-2 text-[9px] font-bold text-slate-600/70">Izq</div>
          <div className="absolute right-2 text-[9px] font-bold text-slate-600/70">Der</div>

          {/* Tip Impact Red Dot */}
          <div
            className="absolute w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-75"
            style={{
              left: `${markerX}%`,
              top: `${markerY}%`,
              boxShadow: '0 0 8px rgba(220, 38, 38, 0.8)',
            }}
          ></div>
        </div>
      </div>

      {/* Numerical Spin Readout */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs bg-slate-900/40 p-2 rounded-md border border-slate-800/80">
        <div>
          <span className="text-slate-400 block text-[10px]">EFECTO HORIZONTAL</span>
          <span className="font-semibold text-cyan-300">
            {spin.x === 0 ? 'Centro (0)' : spin.x > 0 ? `Derecha (+${Math.round(spin.x * 4)})` : `Izquierda (${Math.round(spin.x * 4)})`}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">EFECTO VERTICAL</span>
          <span className="font-semibold text-cyan-300">
            {spin.y === 0 ? 'Centro (0)' : spin.y > 0 ? `Arriba (+${Math.round(spin.y * 4)})` : `Abajo (${Math.round(spin.y * 4)})`}
          </span>
        </div>
      </div>
    </div>
  );
}
