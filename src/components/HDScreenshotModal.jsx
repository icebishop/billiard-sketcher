import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, Download, Copy, Check, X, Sliders, Image, Sparkles, Monitor, Type, Layers, Eye
} from 'lucide-react';
import { renderDiagramToCanvas, downloadHDDiagram, copyHDDiagramToClipboard, downloadSVGDiagram } from '../utils/hdRender';

const RESOLUTION_PRESETS = [
  { id: '1080p', name: 'Full HD 1080p', width: 1920, height: 960, badge: 'Recomendado', megapixels: '1.8 MP' },
  { id: '2K',    name: '2K QHD',        width: 2560, height: 1280, badge: 'Alta Def.',  megapixels: '3.3 MP' },
  { id: '4K',    name: '4K Ultra HD',   width: 3840, height: 1920, badge: 'Ultra Def.', megapixels: '7.4 MP' },
  { id: '8K',    name: '8K Ultra HD',   width: 7680, height: 3840, badge: 'Máxima',     megapixels: '29.5 MP' },
];

const FORMAT_OPTIONS = [
  { id: 'image/png',  label: 'PNG',  desc: 'Calidad original sin pérdida' },
  { id: 'image/webp', label: 'WebP', desc: 'Súper liviano para web' },
  { id: 'image/jpeg', label: 'JPEG', desc: 'Compatibilidad universal' },
  { id: 'image/svg+xml', label: 'SVG', desc: 'Vector HD infinitamente escalable' },
];

export default function HDScreenshotModal({
  isOpen,
  onClose,
  getDiagramData,
}) {
  const [selectedPreset, setSelectedPreset] = useState('1080p');
  const [customScale, setCustomScale]         = useState(2);
  const [isCustomMode, setIsCustomMode]       = useState(false);
  const [selectedFormat, setSelectedFormat]   = useState('image/png');

  /* Custom header & watermark settings */
  const [showHeader, setShowHeader]           = useState(true);
  const [titleText, setTitleText]             = useState('Billiard Sketcher — Diagrama 3 Bandas');
  const [subtitleText, setSubtitleText]       = useState('');
  const [showWatermark, setShowWatermark]     = useState(true);
  const [watermarkText, setWatermarkText]     = useState('Billiard Sketcher • 3-Bandas HD');
  const [showStrikeWidget, setShowStrikeWidget] = useState(true);

  /* Status states */
  const [isProcessing, setIsProcessing]       = useState(false);
  const [copySuccess, setCopySuccess]         = useState(false);
  const [toastMessage, setToastMessage]       = useState('');

  const previewCanvasRef = useRef(null);

  // Calculate target resolution
  const preset = RESOLUTION_PRESETS.find(p => p.id === selectedPreset) || RESOLUTION_PRESETS[0];
  const targetWidth = isCustomMode ? Math.round(900 * customScale) : preset.width;
  const targetHeight = isCustomMode ? Math.round(450 * customScale) : preset.height;
  const mpVal = ((targetWidth * targetHeight) / 1000000).toFixed(1);

  // Render live preview on thumbnail canvas whenever settings change
  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current || !getDiagramData) return;
    const diagramData = getDiagramData();
    if (!diagramData) return;

    // Render offscreen at 640px width for fast live preview UI response
    const previewW = 640;
    const previewH = 320;
    renderDiagramToCanvas({
      canvas: previewCanvasRef.current,
      width: previewW,
      height: previewH,
      clothColor: diagramData.table?.clothColor ?? '#0d5c3a',
      showDiamonds: diagramData.table?.showDiamonds ?? true,
      balls: diagramData.balls,
      lines: diagramData.lines,
      points: diagramData.points,
      texts: diagramData.texts,
      strikeMode: diagramData.strike?.strikeMode ?? false,
      spin: diagramData.strike?.spin ?? { x: 0, y: 0 },
      strike: diagramData.strike?.strike ?? -0.5,
      showHeader,
      titleText,
      subtitleText,
      showWatermark,
      watermarkText,
      showStrikeWidget,
    });
  }, [isOpen, getDiagramData, selectedPreset, isCustomMode, customScale, showHeader, titleText, subtitleText, showWatermark, watermarkText, showStrikeWidget]);

  if (!isOpen) return null;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleDownload = async () => {
    if (!getDiagramData || isProcessing) return;
    setIsProcessing(true);
    try {
      const diagramData = getDiagramData();

      if (selectedFormat === 'image/svg+xml') {
        downloadSVGDiagram(diagramData, {
          width: targetWidth,
          height: targetHeight,
          showHeader,
          titleText,
          subtitleText,
          showWatermark,
          watermarkText,
          showStrikeWidget,
          resolutionLabel: isCustomMode ? `${customScale}x` : preset.id,
        });
        showToast('¡Diagrama SVG descargado con éxito!');
      } else {
        await downloadHDDiagram(diagramData, {
          width: targetWidth,
          height: targetHeight,
          format: selectedFormat,
          showHeader,
          titleText,
          subtitleText,
          showWatermark,
          watermarkText,
          showStrikeWidget,
          resolutionLabel: isCustomMode ? `${customScale}x` : preset.id,
        });
        showToast('¡Captura HD descargada con éxito!');
      }
    } catch (err) {
      console.error('Error al exportar:', err);
      showToast('Error al generar la exportación.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyClipboard = async () => {
    if (!getDiagramData || isProcessing) return;
    setIsProcessing(true);
    try {
      const diagramData = getDiagramData();
      const success = await copyHDDiagramToClipboard(diagramData, {
        width: targetWidth,
        height: targetHeight,
        showHeader,
        titleText,
        subtitleText,
        showWatermark,
        watermarkText,
        showStrikeWidget,
      });
      if (success) {
        setCopySuccess(true);
        showToast('¡Imagen HD copiada al portapapeles!');
        setTimeout(() => setCopySuccess(false), 2500);
      } else {
        showToast('No se pudo copiar directamente. Intenta descargar la imagen.');
      }
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      showToast('Error al copiar imagen HD.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 8, 15, 0.82)',
        backdropFilter: 'blur(12px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(14, 165, 233, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(14,165,233,0.12) 0%, rgba(15,23,42,0.95) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 34, height: 34,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
              }}
            >
              <Camera size={18} color="#fff" strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                Exportar Captura HD
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                  Alta Resolución
                </span>
              </h2>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                Genera imágenes de resolución profesional para imprimir, publicar o compartir.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Section 1: Resolution Presets */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#38bdf8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Monitor size={14} />
              Resolución HD
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              {RESOLUTION_PRESETS.map((p) => {
                const isSelected = !isCustomMode && selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPreset(p.id); setIsCustomMode(false); }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #0ea5e9' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isSelected ? 'rgba(14, 165, 233, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                      color: isSelected ? '#ffffff' : '#cbd5e1',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</span>
                      <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: isSelected ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.06)', color: isSelected ? '#38bdf8' : '#94a3b8' }}>
                        {p.megapixels}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: isSelected ? '#7dd3fc' : '#64748b' }}>
                      {p.width} × {p.height} px
                    </div>
                  </button>
                );
              })}

              {/* Custom scale option */}
              <button
                onClick={() => setIsCustomMode(true)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: isCustomMode ? '2px solid #0ea5e9' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isCustomMode ? 'rgba(14, 165, 233, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                  color: isCustomMode ? '#ffffff' : '#cbd5e1',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sliders size={13} /> Custom ({customScale}x)
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: isCustomMode ? '#7dd3fc' : '#64748b' }}>
                  {targetWidth} × {targetHeight} px
                </div>
              </button>
            </div>

            {/* Custom Scale Slider if Custom selected */}
            {isCustomMode && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', border: '1px dashed rgba(14,165,233,0.3)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Multiplicador de escala:</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={customScale}
                  onChange={(e) => setCustomScale(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#0ea5e9', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', minWidth: 32 }}>{customScale}x</span>
              </div>
            )}
          </div>

          {/* Section 2: Format & Banner Customization */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

            {/* Format Selector */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#38bdf8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Image size={14} />
                Formato de Imagen
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {FORMAT_OPTIONS.map((f) => {
                  const isSel = selectedFormat === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFormat(f.id)}
                      style={{
                        flex: 1,
                        padding: '8px 6px',
                        borderRadius: '8px',
                        border: isSel ? '1px solid #0ea5e9' : '1px solid rgba(255,255,255,0.08)',
                        background: isSel ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.03)',
                        color: isSel ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Options Toggles */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#38bdf8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Layers size={14} />
                Opciones de Arte
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showHeader}
                    onChange={(e) => setShowHeader(e.target.checked)}
                    style={{ accentColor: '#0ea5e9' }}
                  />
                  Incluir Encabezado Superior (Banner con título)
                </label>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showWatermark}
                      onChange={(e) => setShowWatermark(e.target.checked)}
                      style={{ accentColor: '#0ea5e9' }}
                    />
                    Marca de Agua
                  </label>
                  {showWatermark && (
                    <div style={{ marginTop: 4, paddingLeft: 22 }}>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="Texto de marca de agua..."
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          color: '#f8fafc',
                          fontSize: 11,
                        }}
                      />
                    </div>
                  )}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showStrikeWidget}
                    onChange={(e) => setShowStrikeWidget(e.target.checked)}
                    style={{ accentColor: '#0ea5e9' }}
                  />
                  Incluir Widget de Toma y Efecto
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Header Text Inputs (conditional) */}
          {showHeader && (
            <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Título del Diagrama</span>
                <input
                  type="text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  placeholder="Ej: Jugada de 3 Bandas — Rotación Brico"
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#f8fafc',
                    fontSize: 12,
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Subtítulo / Autor (Opcional)</span>
                <input
                  type="text"
                  value={subtitleText}
                  onChange={(e) => setSubtitleText(e.target.value)}
                  placeholder="Ej: Autor: Juan Perez • Torneo 2026"
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#f8fafc',
                    fontSize: 12,
                  }}
                />
              </div>
            </div>
          )}

          {/* Section 4: Live HD Preview Canvas */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Eye size={14} />
                Vista Previa de Salida
              </label>
              <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                {targetWidth} × {targetHeight} px ({mpVal} MP)
              </span>
            </div>

            <div
              style={{
                width: '100%',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#07090f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
              }}
            >
              {selectedFormat === 'image/svg+xml' ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⬡</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8', marginBottom: 4 }}>Formato vectorial SVG</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    La vista previa no aplica — el archivo generado es infinitamente escalable.
                  </div>
                </div>
              ) : (
                <canvas
                  ref={previewCanvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '220px',
                    display: 'block',
                    objectFit: 'contain',
                  }}
                />
              )}
            </div>
          </div>

        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.15)', borderTop: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
            {toastMessage}
          </div>
        )}

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(10, 15, 30, 0.95)',
          }}
        >
          <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color="#0ea5e9" />
            Salida vectorizada ultra nítida
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleCopyClipboard}
              disabled={isProcessing}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#f8fafc',
                fontSize: 13,
                fontWeight: 600,
                cursor: isProcessing ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              {copySuccess ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
              {copySuccess ? '¡Copiado!' : 'Copiar al Portapapeles'}
            </button>

            <button
              onClick={handleDownload}
              disabled={isProcessing}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                cursor: isProcessing ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <Download size={16} />
              {isProcessing ? 'Procesando...' : selectedFormat === 'image/svg+xml' ? `Descargar SVG` : `Descargar ${isCustomMode ? `${customScale}x` : preset.id}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
