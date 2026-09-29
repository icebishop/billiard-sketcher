import React from 'react';
import { Type, Trash2, Plus, RotateCcw, Check, MousePointer, Edit3 } from 'lucide-react';

const TEXT_COLORS = [
  { hex: '#f59e0b', name: 'Ámbar'   },
  { hex: '#06b6d4', name: 'Cian'    },
  { hex: '#f8fafc', name: 'Blanco'  },
  { hex: '#ef4444', name: 'Rojo'    },
  { hex: '#22c55e', name: 'Verde'   },
  { hex: '#f97316', name: 'Naranja' },
  { hex: '#a855f7', name: 'Violeta' },
  { hex: '#0f172a', name: 'Oscuro'  },
];

export default function TextPanel({
  textColor,
  setTextColor,
  texts,
  setTexts,
  selectedTextId,
  setSelectedTextId,
  activeTool,
  setActiveTool,
}) {
  const selectedText = texts.find(t => t.id === selectedTextId);
  const activeColor  = selectedText ? selectedText.color : textColor;

  const handleColorChange = (newColor) => {
    setTextColor(newColor);
    if (selectedTextId) {
      setTexts(prev => prev.map(t => (t.id === selectedTextId ? { ...t, color: newColor } : t)));
    }
  };

  const handleTextContentChange = (newContent) => {
    if (selectedTextId) {
      setTexts(prev => prev.map(t => (t.id === selectedTextId ? { ...t, text: newContent } : t)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedTextId) {
      setTexts(prev => prev.filter(t => t.id !== selectedTextId));
      setSelectedTextId(null);
    }
  };

  const handleClearAll = () => {
    if (texts.length === 0) return;
    if (window.confirm('¿Desea borrar todos los textos de la mesa?')) {
      setTexts([]);
      setSelectedTextId(null);
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
          <Type size={15} color="var(--amber)" />
          Texto en Mesa
        </h3>
        <span
          className="tb-value"
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 99,
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: 'var(--amber)',
          }}
        >
          {texts.length} {texts.length === 1 ? 'texto' : 'textos'}
        </span>
      </div>

      {/* ── Selection Status Indicator / Text Editor ── */}
      {selectedText ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.4)',
              fontSize: 11,
              color: 'var(--amber)',
            }}
          >
            <span>Texto seleccionado</span>
            <button
              onClick={() => setSelectedTextId(null)}
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

          {/* Edit text input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Edit3 size={13} color="var(--text-muted)" />
            <input
              type="text"
              value={selectedText.text}
              onChange={(e) => handleTextContentChange(e.target.value)}
              placeholder="Contenido del texto"
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--border-active)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)',
                fontSize: 12,
                padding: '4px 8px',
              }}
            />
          </div>
        </div>
      ) : activeTool !== 'text' ? (
        <button
          onClick={() => setActiveTool('text')}
          className="btn-secondary"
          style={{
            width: '100%',
            justifyContent: 'center',
            fontSize: 11.5,
            padding: '6px 10px',
            borderColor: 'rgba(245,158,11,0.3)',
          }}
        >
          <Plus size={13} color="var(--amber)" />
          Añadir texto [T]
        </button>
      ) : (
        <div
          style={{
            fontSize: 10.5,
            color: 'var(--amber)',
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.3)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <MousePointer size={13} />
          Haz clic en la mesa para ingresar texto.
        </div>
      )}

      {/* ── Text Color Picker ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>COLOR DEL TEXTO</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {TEXT_COLORS.map(({ hex, name }) => (
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
                boxShadow: activeColor === hex ? '0 0 0 2px var(--amber)' : 'none',
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

      {/* ── Actions (Delete Selected / Clear All) ── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          paddingTop: 8,
          borderTop: '1px solid var(--border)',
        }}
      >
        {selectedText && (
          <button
            onClick={handleDeleteSelected}
            className="tb-delete"
            style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
            title="Eliminar texto seleccionado  [Supr]"
          >
            <Trash2 size={13} />
            Eliminar
          </button>
        )}

        {texts.length > 0 && (
          <button
            onClick={handleClearAll}
            className="tb-ghost"
            style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
            title="Borrar todos los textos de la mesa"
          >
            <RotateCcw size={13} />
            Limpiar textos
          </button>
        )}
      </div>
    </div>
  );
}
