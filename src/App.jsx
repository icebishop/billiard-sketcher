import React, { useState, useRef } from 'react';
import TableCanvas from './components/TableCanvas';
import Toolbar from './components/Toolbar';
import { Target, Palette, Layers, Info } from 'lucide-react';

export default function App() {
  const [activeTool, setActiveTool]     = useState('move');
  const [clothColor, setClothColor]     = useState('#0d5c3a');
  const [showDiamonds, setShowDiamonds] = useState(true);

  /* Line state bridge: TableCanvas → App → Toolbar */
  const [lineState, setLineState] = useState({
    isDrawingLine:    false,
    selectedLineId:   null,
    finishLine:       null,
    dropSelectedLine: null,
    updateSelectedLine: null,
    selectedLine:     null,
  });

  const exportHandlerRef = useRef(null);
  const handleRegisterExportHandler = (getter) => { exportHandlerRef.current = getter; };
  const handleDownloadPNG = () => { const fn = exportHandlerRef.current?.(); fn?.(); };
  const handleResetTable  = () => {
    if (window.confirm('¿Reiniciar mesa y limpiar todos los dibujos?')) window.location.reload();
  };

  const clothOptions = [
    { name: 'Verde',  hex: '#0d5c3a' },
    { name: 'Azul',   hex: '#1e3a8a' },
    { name: 'Gris',   hex: '#334155' },
    { name: 'Negro',  hex: '#111827' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* ══════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════ */}
      <header
        style={{
          height: 'var(--header-h)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(7,9,15,0.97)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexShrink: 0,
        }}
      >
        {/* Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36, height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
              flexShrink: 0,
            }}
          >
            <Target size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-head)',
                fontSize: 17,
                fontWeight: 700,
                lineHeight: 1.2,
                background: 'linear-gradient(90deg, #f8fafc 30%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              BilliNote
            </h1>
            <p style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1 }}>
              Maestro del Billar — Diseñador 3 Bandas
            </p>
          </div>
        </div>

        {/* Badge */}
        <span
          style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 99,
            background: 'rgba(14,165,233,0.1)',
            border: '1px solid rgba(14,165,233,0.3)',
            color: 'var(--sky-light)',
            fontWeight: 600,
          }}
        >
          Mesa Carambola
        </span>
      </header>

      {/* ══════════════════════════════════════════════
          HORIZONTAL TOOLBAR  (sticky below header)
      ══════════════════════════════════════════════ */}
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onDownloadPNG={handleDownloadPNG}
        onResetTable={handleResetTable}
        isDrawingLine={lineState.isDrawingLine}
        onFinishLine={lineState.finishLine}
        selectedLineId={lineState.selectedLineId}
        onDropSelectedLine={lineState.dropSelectedLine}
        selectedLine={lineState.selectedLine}
        onUpdateLine={lineState.updateSelectedLine ?? (() => {})}
      />

      {/* ══════════════════════════════════════════════
          MAIN WORKSPACE
      ══════════════════════════════════════════════ */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* ── Canvas Area ── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflow: 'auto',
            minWidth: 0,
          }}
        >
          <TableCanvas
            activeTool={activeTool}
            clothColor={clothColor}
            showDiamonds={showDiamonds}
            onRegisterExportHandler={handleRegisterExportHandler}
            onLineStateChange={setLineState}
          />
        </div>

        {/* ── Right Sidebar ── */}
        <aside
          style={{
            width: 268,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '12px 10px 16px 0',
            overflowY: 'auto',
            borderLeft: '1px solid var(--border)',
            background: 'rgba(8,13,24,0.6)',
          }}
        >
          {/* ── 1. Cloth Color & Options ── */}
          <div
            className="glass-panel"
            style={{ margin: '0 10px', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <h3
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
              }}
            >
              <Palette size={14} color="#10b981" />
              Opciones de Mesa
            </h3>

            {/* Cloth color */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>COLOR DEL PAÑO</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {clothOptions.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setClothColor(c.hex)}
                    title={c.name}
                    style={{
                      height: 32,
                      borderRadius: 8,
                      border: clothColor === c.hex
                        ? '2px solid var(--sky-light)'
                        : '2px solid transparent',
                      background: c.hex,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      transform: clothColor === c.hex ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: clothColor === c.hex ? `0 0 0 3px var(--bg-active)` : 'none',
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: 10, color: 'var(--text-muted)',
                  textAlign: 'center', lineHeight: 1,
                }}
              >
                {clothOptions.find(c => c.hex === clothColor)?.name ?? 'Personalizado'}
              </span>
            </div>

            {/* Diamonds toggle */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 8, borderTop: '1px solid var(--border)',
              }}
            >
              <label
                htmlFor="diamond-toggle"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}
              >
                <Layers size={13} color="var(--sky-light)" />
                Diamantes
              </label>
              <input
                id="diamond-toggle"
                type="checkbox"
                checked={showDiamonds}
                onChange={(e) => setShowDiamonds(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: 'var(--sky)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* ── 3. Quick Guide ── */}
          <div
            className="glass-panel"
            style={{
              margin: '0 10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: 'rgba(10,16,30,0.5)',
            }}
          >
            <h4
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11.5, fontWeight: 600, color: 'var(--text)',
              }}
            >
              <Info size={13} color="var(--sky-light)" />
              Guía Rápida
            </h4>
            <ol style={{ paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                ['Mover', 'arrastra bolas o selecciona líneas'],
                ['Línea / Flecha', 'clic = vértice, doble clic = finalizar'],
                ['Vértices azules', 'arrastra para mover puntos individuales'],
                ['Supr', 'elimina la línea seleccionada'],
                ['Exportar PNG', 'guarda tu diagrama de jugada'],
              ].map(([bold, rest], i) => (
                <li key={i} style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{bold}</strong> — {rest}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </main>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '9px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 10.5,
          color: 'var(--text-subtle)',
          background: 'rgba(7,9,15,0.9)',
          flexShrink: 0,
        }}
      >
        <span>BilliNote — Maestro del Billar · Diseñador de Jugadas de Tres Bandas</span>
        <span
          style={{
            fontSize: 10,
            color: 'rgba(14,165,233,0.5)',
            fontFamily: "'SF Mono', monospace",
          }}
        >
          CARAMBOLA 3C
        </span>
      </footer>
    </div>
  );
}
