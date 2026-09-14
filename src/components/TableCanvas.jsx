import React, { useRef, useEffect, useState, useCallback } from 'react';

export default function TableCanvas({
  activeTool,
  clothColor = '#0d5c3a',
  showDiamonds = true,
  onRegisterExportHandler,
  onRegisterCaptureHandler,
  onLineStateChange
}) {
  const canvasRef = useRef(null);

  // ── Table State ──────────────────────────────────────────────
  const [balls, setBalls] = useState({
    white:  { x: 0.25, y: 0.75, label: '1' },
    yellow: { x: 0.25, y: 0.25, label: '2' },
    red:    { x: 0.75, y: 0.5,  label: '3' },
  });

  const [lines, setLines] = useState([
    {
      id: 'default-line-1',
      points: [
        { x: 0.25, y: 0.75 },
        { x: 0.5,  y: 0.05 },
        { x: 0.95, y: 0.4  },
        { x: 0.75, y: 0.5  },
      ],
      color: '#06b6d4',
      style: 'solid',
      width: 2,
      isArrow: true,
    },
  ]);

  const [texts, setTexts] = useState([]);

  // ── Interaction State ────────────────────────────────────────
  const [draggingBall,    setDraggingBall]    = useState(null);
  const [draggingVertex,  setDraggingVertex]  = useState(null); // { lineId, pointIndex }
  const [currentLinePoints, setCurrentLinePoints] = useState(null);
  const [mousePreviewPoint,  setMousePreviewPoint]  = useState(null);
  const [selectedLineId,  setSelectedLineId]  = useState(null);

  // ── Canvas size ──────────────────────────────────────────────
  const [dimensions, setDimensions] = useState({ width: 900, height: 450 });

  useEffect(() => {
    const handleResize = () => {
      const parent = canvasRef.current?.parentElement;
      if (parent) {
        const pWidth = parent.clientWidth - 16;
        const width  = Math.min(Math.max(pWidth, 320), 1200);
        const height = width / 2;
        setDimensions({ width, height });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Coordinate Helpers ───────────────────────────────────────
  const normToPx = useCallback((nx, ny) => {
    const marginX   = dimensions.width  * 0.045;
    const marginY   = dimensions.height * 0.09;
    const playWidth  = dimensions.width  - marginX * 2;
    const playHeight = dimensions.height - marginY * 2;
    const ballRadius = Math.max(6, playWidth * (30.75 / 2840));
    return {
      x: marginX + nx * playWidth,
      y: marginY + ny * playHeight,
      marginX, marginY, playWidth, playHeight, ballRadius,
    };
  }, [dimensions]);

  const pxToNorm = useCallback((px, py) => {
    const marginX   = dimensions.width  * 0.045;
    const marginY   = dimensions.height * 0.09;
    const playWidth  = dimensions.width  - marginX * 2;
    const playHeight = dimensions.height - marginY * 2;
    // Normalized bounds that also cover the wooden bands (rails).
    // 0..1 is the cloth; negative / >1 values fall on the bands.
    const minNx = -marginX / playWidth;
    const maxNx = 1 + marginX / playWidth;
    const minNy = -marginY / playHeight;
    const maxNy = 1 + marginY / playHeight;
    return {
      nx: Math.max(minNx, Math.min(maxNx, (px - marginX) / playWidth)),
      ny: Math.max(minNy, Math.min(maxNy, (py - marginY) / playHeight)),
    };
  }, [dimensions]);

  // ── Line Actions ─────────────────────────────────────────────
  const finishCurrentLine = useCallback(() => {
    if (currentLinePoints && currentLinePoints.length >= 2) {
      const color   = activeTool === 'arrow' ? '#f59e0b' : '#06b6d4';
      const newLine = {
        id:      `line-${Date.now()}`,
        points:  [...currentLinePoints],
        color,
        style:   'solid',
        width:   2,
        isArrow: activeTool === 'arrow',
      };
      setLines(prev => [...prev, newLine]);
      setSelectedLineId(newLine.id);
    }
    setCurrentLinePoints(null);
    setMousePreviewPoint(null);
  }, [currentLinePoints, activeTool]);

  const dropSelectedLine = useCallback(() => {
    if (selectedLineId) {
      setLines(prev => prev.filter(l => l.id !== selectedLineId));
      setSelectedLineId(null);
    }
  }, [selectedLineId]);

  const updateSelectedLine = useCallback((patch) => {
    if (!selectedLineId) return;
    setLines(prev => prev.map(l => (l.id === selectedLineId ? { ...l, ...patch } : l)));
  }, [selectedLineId]);

  // ── Notify Parent ────────────────────────────────────────────
  useEffect(() => {
    if (onLineStateChange) {
      onLineStateChange({
        isDrawingLine:    !!(currentLinePoints && currentLinePoints.length >= 1),
        finishLine:       finishCurrentLine,
        selectedLineId,
        dropSelectedLine,
        updateSelectedLine,
        selectedLine:     lines.find(l => l.id === selectedLineId) || null,
      });
    }
  }, [currentLinePoints, selectedLineId, finishCurrentLine, dropSelectedLine, updateSelectedLine, onLineStateChange, lines]);

  // ── Main Render Loop ─────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    ctx.clearRect(0, 0, width, height);

    const marginX    = width  * 0.045;
    const marginY    = height * 0.09;
    const playWidth  = width  - marginX * 2;
    const playHeight = height - marginY * 2;
    const ballRadius = Math.max(6, playWidth * (30.75 / 2840));

    // 1. Outer wooden rail
    ctx.fillStyle = '#3b1c0a';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, width, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, height - 6, width, 6);

    // 2. Cloth
    ctx.fillStyle = clothColor;
    ctx.fillRect(marginX, marginY, playWidth, playHeight);
    ctx.strokeStyle = '#052b1b';
    ctx.lineWidth   = Math.max(2, playWidth * 0.005);
    ctx.setLineDash([]);
    ctx.strokeRect(marginX, marginY, playWidth, playHeight);

    // Cushion bevels
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(marginX - 4, marginY - 4, playWidth + 8, 4);
    ctx.fillRect(marginX - 4, marginY + playHeight, playWidth + 8, 4);
    ctx.fillRect(marginX - 4, marginY - 4, 4, playHeight + 8);
    ctx.fillRect(marginX + playWidth, marginY - 4, 4, playHeight + 8);

    // 3. Diamond markers
    if (showDiamonds) {
      const dr = Math.max(3, playWidth * 0.004);
      ctx.fillStyle   = '#f8fafc';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth   = 1;
      const drawDiamond = (cx, cy) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - dr);
        ctx.lineTo(cx + dr * 0.75, cy);
        ctx.lineTo(cx, cy + dr);
        ctx.lineTo(cx - dr * 0.75, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };
      for (let i = 0; i <= 8; i++) {
        drawDiamond(marginX + (i / 8) * playWidth, marginY / 2);
        drawDiamond(marginX + (i / 8) * playWidth, height - marginY / 2);
      }
      for (let j = 0; j <= 4; j++) {
        drawDiamond(marginX / 2, marginY + (j / 4) * playHeight);
        drawDiamond(width - marginX / 2, marginY + (j / 4) * playHeight);
      }
    }

    // 4. Draw polygonal lines
    lines.forEach((line) => {
      if (!line.points || line.points.length < 2) return;
      const isSelected = line.id === selectedLineId;
      const lw = line.width || 2;

      const applyDash = () => {
        if (line.style === 'dashed') ctx.setLineDash([lw * 6, lw * 3]);
        else if (line.style === 'dotted') ctx.setLineDash([lw * 1.5, lw * 4]);
        else ctx.setLineDash([]);
      };

      // Selection glow (no dash for the glow)
      if (isSelected) {
        const g0 = normToPx(line.points[0].x, line.points[0].y);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(56,189,248,0.30)';
        ctx.lineWidth   = lw + 8;
        ctx.setLineDash([]);
        ctx.moveTo(g0.x, g0.y);
        for (let i = 1; i < line.points.length; i++) {
          const gp = normToPx(line.points[i].x, line.points[i].y);
          ctx.lineTo(gp.x, gp.y);
        }
        ctx.stroke();
      }

      // Main line
      applyDash();
      const p0 = normToPx(line.points[0].x, line.points[0].y);
      ctx.beginPath();
      ctx.strokeStyle = isSelected ? '#38bdf8' : (line.color || '#06b6d4');
      ctx.lineWidth   = lw;
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < line.points.length; i++) {
        const pt = normToPx(line.points[i].x, line.points[i].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow head
      if (line.isArrow && line.points.length >= 2) {
        const last = normToPx(line.points[line.points.length - 1].x, line.points[line.points.length - 1].y);
        const prev = normToPx(line.points[line.points.length - 2].x, line.points[line.points.length - 2].y);
        const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
        const al    = Math.max(10, playWidth * 0.013) + lw;
        ctx.fillStyle = isSelected ? '#38bdf8' : (line.color || '#06b6d4');
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(last.x - al * Math.cos(angle - Math.PI / 6), last.y - al * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(last.x - al * Math.cos(angle + Math.PI / 6), last.y - al * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }

      // Vertex handles (only for selected line)
      if (isSelected) {
        line.points.forEach((ptNorm, idx) => {
          const pt = normToPx(ptNorm.x, ptNorm.y);
          const isDraggingThis = draggingVertex &&
            draggingVertex.lineId === line.id &&
            draggingVertex.pointIndex === idx;
          const r = isDraggingThis ? 9 : 6;

          // Outer glow ring
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r + 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(56,189,248,0.20)';
          ctx.fill();

          // Main handle
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          ctx.fillStyle   = isDraggingThis ? '#ffffff' : '#38bdf8';
          ctx.strokeStyle = isDraggingThis ? '#06b6d4' : '#ffffff';
          ctx.lineWidth   = 2;
          ctx.fill();
          ctx.stroke();

          // Index label inside handle
          ctx.fillStyle    = isDraggingThis ? '#06b6d4' : '#0f172a';
          ctx.font         = `700 ${Math.round(r * 1.1)}px Inter, sans-serif`;
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(idx + 1), pt.x, pt.y);
        });
      }
    });

    // 5. Active drawing preview
    if (currentLinePoints && currentLinePoints.length >= 1) {
      const activePts = [...currentLinePoints];
      if (mousePreviewPoint) activePts.push(mousePreviewPoint);

      ctx.beginPath();
      ctx.strokeStyle = activeTool === 'arrow' ? '#f59e0b' : '#06b6d4';
      ctx.lineWidth   = 2;
      ctx.setLineDash([6, 4]);
      const a0 = normToPx(activePts[0].x, activePts[0].y);
      ctx.moveTo(a0.x, a0.y);
      for (let i = 1; i < activePts.length; i++) {
        const ap = normToPx(activePts[i].x, activePts[i].y);
        ctx.lineTo(ap.x, ap.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      currentLinePoints.forEach((ptNorm) => {
        const pt = normToPx(ptNorm.x, ptNorm.y);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = activeTool === 'arrow' ? '#f59e0b' : '#06b6d4';
        ctx.fill();
      });
    }

    // 6. Text annotations
    texts.forEach((t) => {
      const pt       = normToPx(t.x, t.y);
      const fontSize = Math.max(11, Math.round(playWidth * 0.014));
      ctx.font       = `600 ${fontSize}px Inter, sans-serif`;
      ctx.setLineDash([]);
      const metrics = ctx.measureText(t.text);
      const bgW = metrics.width + 12;
      const bgH = fontSize + 8;
      ctx.fillStyle   = 'rgba(15,23,42,0.85)';
      ctx.strokeStyle = t.color || 'rgba(255,255,255,0.3)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.roundRect(pt.x - bgW / 2, pt.y - bgH / 2, bgW, bgH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle    = t.color || '#ffffff';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, pt.x, pt.y);
    });

    // 7. Balls
    const ballKeys = ['white', 'yellow', 'red'];
    ballKeys.forEach((key) => {
      const b  = balls[key];
      const pt = normToPx(b.x, b.y);
      const r  = ballRadius;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(
        pt.x - r * 0.3, pt.y - r * 0.3, r * 0.1,
        pt.x, pt.y, r
      );
      if (key === 'white') {
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.7, '#e2e8f0');
        grad.addColorStop(1, '#94a3b8');
      } else if (key === 'yellow') {
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.7, '#facc15');
        grad.addColorStop(1, '#ca8a04');
      } else {
        grad.addColorStop(0, '#fca5a5');
        grad.addColorStop(0.6, '#dc2626');
        grad.addColorStop(1, '#7f1d1d');
      }
      ctx.fillStyle    = grad;
      ctx.shadowColor  = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur   = Math.max(3, r * 0.4);
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 3;
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.lineWidth   = 1.2;
      ctx.strokeStyle = key === 'white' ? '#cbd5e1' : key === 'yellow' ? '#eab308' : '#991b1b';
      ctx.stroke();

      if (r >= 8) {
        ctx.fillStyle    = key === 'white' ? '#0f172a' : key === 'yellow' ? '#0f172a' : '#ffffff';
        ctx.font         = `700 ${Math.round(r * 0.95)}px Inter, sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.label, pt.x, pt.y);
      }

    });

    // (spin indicator removed)
  }, [dimensions, clothColor, showDiamonds, balls, lines, texts,
      currentLinePoints, mousePreviewPoint,
      selectedLineId, activeTool, normToPx, draggingVertex]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  // ── Pointer Handlers ─────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px   = e.clientX - rect.left;
    const py   = e.clientY - rect.top;
    const { nx, ny } = pxToNorm(px, py);

    // ── Move tool ──
    if (activeTool === 'move') {
      // Priority 1: vertex of selected line
      if (selectedLineId) {
        const selLine = lines.find(l => l.id === selectedLineId);
        if (selLine) {
          for (let i = 0; i < selLine.points.length; i++) {
            const vpt = normToPx(selLine.points[i].x, selLine.points[i].y);
            if (Math.hypot(px - vpt.x, py - vpt.y) <= 12) {
              setDraggingVertex({ lineId: selectedLineId, pointIndex: i });
              return;
            }
          }
        }
      }

      // Priority 2: balls
      for (const key of ['white', 'yellow', 'red']) {
        const bpt = normToPx(balls[key].x, balls[key].y);
        if (Math.hypot(px - bpt.x, py - bpt.y) <= 24) {
          setDraggingBall(key);
          setSelectedLineId(null);
          return;
        }
      }

      // Priority 3: line segment → select
      for (const line of lines) {
        for (let i = 0; i < line.points.length - 1; i++) {
          const p1  = normToPx(line.points[i].x,     line.points[i].y);
          const p2  = normToPx(line.points[i + 1].x, line.points[i + 1].y);
          const l2  = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
          if (l2 === 0) continue;
          let t = ((px - p1.x) * (p2.x - p1.x) + (py - p1.y) * (p2.y - p1.y)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = p1.x + t * (p2.x - p1.x);
          const projY = p1.y + t * (p2.y - p1.y);
          if (Math.hypot(px - projX, py - projY) < 12) {
            setSelectedLineId(line.id);
            return;
          }
        }
      }

      setSelectedLineId(null);
      return;
    }

    // ── Line / Arrow drawing ──
    if (activeTool === 'line' || activeTool === 'arrow') {
      if (!currentLinePoints) {
        setCurrentLinePoints([{ x: nx, y: ny }]);
      } else {
        setCurrentLinePoints(prev => [...prev, { x: nx, y: ny }]);
      }
      return;
    }

    // ── Text tool ──
    if (activeTool === 'text') {
      const labelText = prompt('Ingrese texto o número para la jugada:', 'Ataque 30');
      if (labelText && labelText.trim()) {
        setTexts(prev => [...prev, {
          id: `text-${Date.now()}`,
          x: nx, y: ny,
          text: labelText.trim(),
          color: '#f59e0b',
        }]);
      }
      return;
    }

    // ── Eraser ──
    if (activeTool === 'eraser') {
      const hitIdx = texts.findIndex(t => {
        const tpt = normToPx(t.x, t.y);
        return Math.hypot(px - tpt.x, py - tpt.y) < 20;
      });
      if (hitIdx !== -1) {
        setTexts(prev => prev.filter((_, i) => i !== hitIdx));
        return;
      }
      if (lines.length > 0) setLines(prev => prev.slice(0, -1));
    }
  }, [activeTool, selectedLineId, lines, balls, currentLinePoints, texts, normToPx, pxToNorm]);

  const handlePointerMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px   = e.clientX - rect.left;
    const py   = e.clientY - rect.top;
    const { nx, ny } = pxToNorm(px, py);

    if (draggingVertex) {
      setLines(prev =>
        prev.map(l => {
          if (l.id !== draggingVertex.lineId) return l;
          const pts = [...l.points];
          pts[draggingVertex.pointIndex] = { x: nx, y: ny };
          return { ...l, points: pts };
        })
      );
      return;
    }

    if (draggingBall) {
      setBalls(prev => ({ ...prev, [draggingBall]: { ...prev[draggingBall], x: nx, y: ny } }));
      return;
    }

    if (currentLinePoints) {
      setMousePreviewPoint({ x: nx, y: ny });
    }
  }, [draggingVertex, draggingBall, currentLinePoints, pxToNorm]);

  const handlePointerUp = useCallback(() => {
    if (draggingVertex) { setDraggingVertex(null); return; }
    if (draggingBall)   { setDraggingBall(null); }
  }, [draggingVertex, draggingBall]);

  const handleDoubleClick = useCallback(() => {
    if (currentLinePoints && currentLinePoints.length >= 2) finishCurrentLine();
  }, [currentLinePoints, finishCurrentLine]);

  // ── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && currentLinePoints) finishCurrentLine();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLineId && !currentLinePoints) dropSelectedLine();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentLinePoints, selectedLineId, finishCurrentLine, dropSelectedLine]);

  // ── PNG Export ───────────────────────────────────────────────
  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link     = document.createElement('a');
    link.download  = `billiard-diagram-${Date.now()}.png`;
    link.href      = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  useEffect(() => {
    if (onRegisterExportHandler) onRegisterExportHandler(() => exportPNG);
  }, [onRegisterExportHandler, exportPNG]);

  // ── Frame capture (for movie feature) ───────────────────────
  const captureFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    // Force a fresh render so the snapshot is up to date.
    drawCanvas();
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width:   canvas.width,
      height:  canvas.height,
    };
  }, [drawCanvas]);

  useEffect(() => {
    if (onRegisterCaptureHandler) onRegisterCaptureHandler(() => captureFrame);
  }, [onRegisterCaptureHandler, captureFrame]);

  // ── Status hint text ─────────────────────────────────────────
  let hintText = 'Selecciona "Línea Poligonal" para dibujar recorridos continuos.';
  if (draggingVertex)    hintText = `Moviendo vértice ${draggingVertex.pointIndex + 1}…`;
  else if (currentLinePoints)
    hintText = `${currentLinePoints.length} punto${currentLinePoints.length !== 1 ? 's' : ''} — Doble clic o "Finalizar" para confirmar.`;
  else if (selectedLineId)
    hintText = 'Línea seleccionada — arrastra los vértices (●) para moverlos individualmente.';

  return (
    <div className="w-full flex flex-col items-center justify-center p-2">
      <div className="relative glass-panel p-2 shadow-2xl rounded-xl border border-slate-700/60 overflow-hidden max-w-full">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: draggingVertex ? 'grabbing' : 'crosshair' }}
          className="block rounded-lg touch-none select-none shadow-inner"
        />
      </div>

      <div className="flex items-center justify-between w-full max-w-4xl px-2 mt-2 text-xs text-slate-400">
        <span>💡 {hintText}</span>
        <span>
          Herramienta: <strong className="text-cyan-400 uppercase">{activeTool}</strong>
        </span>
      </div>
    </div>
  );
}
