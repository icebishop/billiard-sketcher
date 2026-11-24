import React, { useEffect } from 'react';
import {
  Info, X, PenTool, Compass, Camera, Keyboard,
} from 'lucide-react';

const SECTIONS = [
  {
    title: 'Herramientas de Dibujo',
    icon: PenTool,
    color: 'var(--sky-light)',
    items: [
      { key: 'V', label: 'Mover', desc: 'Arrastra bolas, puntos, textos o selecciona líneas y sus vértices azules.' },
      { key: 'L / A', label: 'Línea / Flecha', desc: 'Clic para añadir vértices, doble clic o Esc para finalizar. Ajusta color, grosor y trazo en la barra.' },
      { key: 'P', label: 'Punto', desc: 'Clic en cualquier lugar de la mesa o bandas; personaliza tamaño y color en el panel lateral.' },
      { key: 'T', label: 'Texto', desc: 'Clic en la mesa para etiquetar jugadas; edita texto, tamaño (XS–XL) y color en el panel lateral.' },
      { key: 'E', label: 'Borrar', desc: 'Clic sobre un punto o texto para eliminarlo, o sobre la mesa para quitar la última línea.' },
    ],
  },
  {
    title: 'Precisión y Mesa (UMB 2.84 m × 1.42 m)',
    icon: Compass,
    color: 'var(--emerald)',
    items: [
      { key: '1/10', label: 'Puntos 1/10', desc: 'Muestra subdivisiones en décimas entre diamantes (80 × 40 marcas) con efecto imán en las bandas.' },
      { key: 'Imán', label: 'Guías de alineación', desc: 'Alinea automáticamente líneas, flechas, vértices, puntos y textos con diamantes y marcas 1/10.' },
      { key: 'Toma', label: 'Toma / Efecto', desc: 'Activa el panel interactivo de toma de bola (1/8 a 8/8) y punto de ataque del taco.' },
    ],
  },
  {
    title: 'Animación y Exportación',
    icon: Camera,
    color: 'var(--amber)',
    items: [
      { key: '🎬', label: 'Modo Película', desc: 'Captura fotogramas con duración personalizada y exporta la secuencia en video WebM.' },
      { key: 'HD', label: 'Captura HD', desc: 'Exporta en 1080p, 2K, 4K, 8K o SVG vectorial con encabezado, marca de agua y widget de efecto.' },
      { key: 'JSON', label: 'Guardar / Cargar', desc: 'Exporta e importa diagramas completos (bolas, líneas, puntos, textos y ajustes) en formato JSON.' },
    ],
  },
];

const SHORTCUTS = [
  ['Supr / Retroceso', 'Elimina la línea, punto o texto seleccionado'],
  ['Doble clic / Esc', 'Finaliza el trazado de la línea o flecha actual'],
  ['Esc (en modal)', 'Cierra esta ventana de ayuda'],
];

export default function HelpModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '88vh',
          background: 'rgba(15, 23, 42, 0.96)',
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
        {/* Header */}
        <div
          style={{
            padding: '14px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(14,165,233,0.12) 0%, rgba(15,23,42,0.95) 100%)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'rgba(14, 165, 233, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Info size={17} color="var(--sky-light)" />
            </div>
            <div>
              <h2
                id="help-modal-title"
                style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}
              >
                Guía Rápida — Billiard Sketcher
              </h2>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                Herramientas, guías de precisión 1/10 y exportación
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="tb-ghost"
            style={{ padding: 6 }}
            title="Cerrar  [Esc]"
            aria-label="Cerrar guía rápida"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: '18px 22px 22px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                style={{
                  background: 'rgba(7, 11, 22, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: '#f8fafc',
                  }}
                >
                  <Icon size={14} color={section.color} />
                  {section.title}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      <kbd
                        style={{
                          minWidth: 44,
                          textAlign: 'center',
                          padding: '2px 6px',
                          borderRadius: '5px',
                          background: 'rgba(255, 255, 255, 0.07)',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          color: section.color,
                          fontSize: 10.5,
                          fontWeight: 700,
                          fontFamily: "'SF Mono', monospace",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {item.key}
                      </kbd>
                      <div style={{ color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{item.label}</strong>
                        {' — '}
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Keyboard & Quick Tips */}
          <div
            style={{
              background: 'rgba(14, 165, 233, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.18)',
              borderRadius: '12px',
              padding: '11px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <h3
              style={{
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--sky-light)',
              }}
            >
              <Keyboard size={14} />
              Atajos Rápidos
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
              {SHORTCUTS.map(([k, desc]) => (
                <div key={k} style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text)' }}>{k}:</strong> {desc}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
