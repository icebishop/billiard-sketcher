import React, { useState, useRef } from 'react';
import TableCanvas from './components/TableCanvas';
import Toolbar from './components/Toolbar';
import MoviePanel from './components/MoviePanel';
import StrikePanel from './components/StrikePanel';
import PointPanel from './components/PointPanel';
import TextPanel from './components/TextPanel';
import HDScreenshotModal from './components/HDScreenshotModal';
import { exportMovieWebM } from './utils/movieExport';
import { Palette, Layers, Info, Compass } from 'lucide-react';

export default function App() {
  const [activeTool, setActiveTool]           = useState('move');
  const [clothColor, setClothColor]           = useState('#0d5c3a');
  const [showDiamonds, setShowDiamonds]       = useState(true);
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);

  /* Points state */
  const [points, setPoints]                 = useState([]);
  const [pointRadius, setPointRadius]       = useState(8);
  const [pointColor, setPointColor]         = useState('#ef4444');
  const [selectedPointId, setSelectedPointId] = useState(null);

  /* Texts state */
  const [texts, setTexts]                   = useState([]);
  const [textColor, setTextColor]           = useState('#f59e0b');
  const [selectedTextId, setSelectedTextId] = useState(null);

  /* HD Screenshot Modal State */
  const [isHDModalOpen, setIsHDModalOpen] = useState(false);

  /* Tool switch handler — deselect active selections to avoid crosstalk */
  const handleSelectTool = (tool) => {
    setActiveTool(tool);
    setSelectedPointId(null);
    setSelectedTextId(null);
  };

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

  /* ── JSON Import / Export handlers ── */
  const jsonHandlerRef = useRef(null);
  const handleRegisterJsonHandler = (getter) => { jsonHandlerRef.current = getter; };

  const handleSaveJSON = () => {
    const fn = jsonHandlerRef.current?.();
    const data = fn?.getDiagramData();
    if (!data) return;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `billiard-diagram-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          const fn = jsonHandlerRef.current?.();
          fn?.loadDiagramData(data);
        } catch (err) {
          alert('Error al leer el archivo JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleResetTable  = () => {
    if (window.confirm('¿Reiniciar mesa y limpiar todos los dibujos?')) window.location.reload();
  };

  /* ── Movie / animation state ── */
  const captureHandlerRef = useRef(null);
  const handleRegisterCaptureHandler = (getter) => { captureHandlerRef.current = getter; };

  const [movieMode, setMovieMode]       = useState(false);
  const [frameSeconds, setFrameSeconds] = useState('1');
  const [frames, setFrames]             = useState([]); // { id, dataUrl, width, height, seconds }

  /* Movie text & watermark settings */
  const [movieTitleText, setMovieTitleText]         = useState('Billiard Sketcher — Animación 3 Bandas');
  const [movieShowHeader, setMovieShowHeader]       = useState(true);
  const [movieShowWatermark, setMovieShowWatermark] = useState(true);
  const [movieWatermarkText, setMovieWatermarkText] = useState('Billiard Sketcher • 3-Bandas HD');

  const handleAddFrame = () => {
    const fn = captureHandlerRef.current?.();
    const snap = fn?.({
      showHeader: movieShowHeader,
      titleText: movieTitleText,
      showWatermark: movieShowWatermark,
      watermarkText: movieWatermarkText,
    });
    if (!snap) return;
    const seconds = Math.max(0.1, Number(frameSeconds) || 1);
    setFrames(prev => [
      ...prev,
      { id: `frame-${Date.now()}`, dataUrl: snap.dataUrl, width: snap.width, height: snap.height, seconds },
    ]);
  };

  const handleRemoveFrame = (id) =>
    setFrames(prev => prev.filter(f => f.id !== id));

  const handleUpdateFrameTime = (id, value) => {
    const seconds = Math.max(0.1, Number(value) || 0.1);
    setFrames(prev => prev.map(f => (f.id === id ? { ...f, seconds } : f)));
  };

  const [isSavingMovie, setIsSavingMovie] = useState(false);

  const handleSaveMovie = async () => {
    if (frames.length === 0 || isSavingMovie) return;
    setIsSavingMovie(true);
    try {
      await exportMovieWebM(frames);
    } catch (err) {
      console.error('Error exportando película:', err);
    } finally {
      setIsSavingMovie(false);
    }
  };

  /* ── Strike & Spin (Toma y Efecto) state ── */
  const [strikeMode, setStrikeMode] = useState(true);
  const [spin, setSpin]             = useState({ x: 0, y: 0 }); // english / efecto, -1..1
  const [strike, setStrike]         = useState(-0.5);          // yellow A offset: -1 left .. 0 center .. +1 right

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
          <img
              src="/logo.svg"
              alt="Billiard Sketcher"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                flexShrink: 0,
              }}
            />
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
              Billiard Sketcher
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
        setActiveTool={handleSelectTool}
        onDownloadPNG={handleDownloadPNG}
        onResetTable={handleResetTable}
        onSaveJSON={handleSaveJSON}
        onLoadJSON={handleLoadJSON}
        isDrawingLine={lineState.isDrawingLine}
        onFinishLine={lineState.finishLine}
        selectedLineId={lineState.selectedLineId}
        onDropSelectedLine={lineState.dropSelectedLine}
        selectedLine={lineState.selectedLine}
        onUpdateLine={lineState.updateSelectedLine ?? (() => {})}
        movieMode={movieMode}
        onToggleMovieMode={() => setMovieMode(m => !m)}
        frameSeconds={frameSeconds}
        onFrameSecondsChange={setFrameSeconds}
        onAddFrame={handleAddFrame}
        frameCount={frames.length}
        strikeMode={strikeMode}
        onToggleStrikeMode={() => setStrikeMode(m => !m)}
        onOpenHDModal={() => setIsHDModalOpen(true)}
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
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            overflow: 'hidden',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <TableCanvas
            activeTool={activeTool}
            clothColor={clothColor}
            setClothColor={setClothColor}
            showDiamonds={showDiamonds}
            setShowDiamonds={setShowDiamonds}
            showAlignmentGuides={showAlignmentGuides}
            setShowAlignmentGuides={setShowAlignmentGuides}
            strikeMode={strikeMode}
            setStrikeMode={setStrikeMode}
            spin={spin}
            setSpin={setSpin}
            strike={strike}
            setStrike={setStrike}
            points={points}
            setPoints={setPoints}
            pointRadius={pointRadius}
            pointColor={pointColor}
            selectedPointId={selectedPointId}
            setSelectedPointId={setSelectedPointId}
            texts={texts}
            setTexts={setTexts}
            textColor={textColor}
            setTextColor={setTextColor}
            selectedTextId={selectedTextId}
            setSelectedTextId={setSelectedTextId}
            onRegisterExportHandler={handleRegisterExportHandler}
            onRegisterCaptureHandler={handleRegisterCaptureHandler}
            onRegisterJsonHandler={handleRegisterJsonHandler}
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

            {/* Alignment guides toggle */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 8, borderTop: '1px solid var(--border)',
              }}
            >
              <label
                htmlFor="guides-toggle"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}
              >
                <Compass size={13} color="var(--sky-light)" />
                Guías de alineación
              </label>
              <input
                id="guides-toggle"
                type="checkbox"
                checked={showAlignmentGuides}
                onChange={(e) => setShowAlignmentGuides(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: 'var(--sky)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* ── 2. Point Configuration Panel (Puntos) ── */}
          <PointPanel
            pointRadius={pointRadius}
            setPointRadius={setPointRadius}
            pointColor={pointColor}
            setPointColor={setPointColor}
            points={points}
            setPoints={setPoints}
            selectedPointId={selectedPointId}
            setSelectedPointId={setSelectedPointId}
            activeTool={activeTool}
            setActiveTool={handleSelectTool}
          />

          {/* ── 3. Text Configuration Panel (Textos) ── */}
          <TextPanel
            textColor={textColor}
            setTextColor={setTextColor}
            texts={texts}
            setTexts={setTexts}
            selectedTextId={selectedTextId}
            setSelectedTextId={setSelectedTextId}
            activeTool={activeTool}
            setActiveTool={handleSelectTool}
          />

          {/* ── 4. Movie / Animation ── */}
          <MoviePanel
            frames={frames}
            onRemoveFrame={handleRemoveFrame}
            onUpdateFrameTime={handleUpdateFrameTime}
            onSaveMovie={handleSaveMovie}
            isSaving={isSavingMovie}
            onAddFrame={handleAddFrame}
            movieTitleText={movieTitleText}
            onMovieTitleTextChange={setMovieTitleText}
            movieShowHeader={movieShowHeader}
            onMovieShowHeaderChange={setMovieShowHeader}
            movieShowWatermark={movieShowWatermark}
            onMovieShowWatermarkChange={setMovieShowWatermark}
            movieWatermarkText={movieWatermarkText}
            onMovieWatermarkTextChange={setMovieWatermarkText}
          />

          {/* ── 4. Quick Guide ── */}
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
                ['Mover', 'arrastra bolas, puntos o selecciona líneas'],
                ['Punto', 'clic en cualquier lugar de la mesa (incluidas bandas)'],
                ['Línea / Flecha', 'clic = vértice, doble clic = finalizar'],
                ['Vértices azules', 'arrastra para mover puntos individuales'],
                ['Supr', 'elimina la línea o punto seleccionado'],
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
        <span>Billiard Sketcher — Maestro del Billar · Diseñador de Jugadas de Tres Bandas</span>
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

      {/* HD Screenshot Modal */}
      <HDScreenshotModal
        isOpen={isHDModalOpen}
        onClose={() => setIsHDModalOpen(false)}
        getDiagramData={() => jsonHandlerRef.current?.()?.getDiagramData()}
      />
    </div>
  );
}
