import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Pencil, Trash2, Magnet, Undo2, Redo2 } from 'lucide-react';

interface CanvasDrawProps {
  onProcess: (base64Image: string) => void;
  isProcessing: boolean;
}

export function CanvasDraw({ onProcess, isProcessing }: CanvasDrawProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [measurement, setMeasurement] = useState<{x: number, y: number, text: string} | null>(null);
  const strokeStart = useRef<{x: number, y: number} | null>(null);
  const lastPos = useRef<{x: number, y: number} | null>(null);
  
  // History state for undo/redo
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const GRID_SIZE = 25;

  const updateHistoryState = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(data);
      historyIndexRef.current = historyRef.current.length - 1;
      updateHistoryState();
    }
  };

  const undo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      }
      updateHistoryState();
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      }
      updateHistoryState();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Resize canvas to fit container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Initialize history with blank canvas
      historyRef.current = [];
      historyIndexRef.current = -1;
      saveState();
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    
    const sx = snapToGrid ? Math.round(x / GRID_SIZE) * GRID_SIZE : x;
    const sy = snapToGrid ? Math.round(y / GRID_SIZE) * GRID_SIZE : y;
    
    lastPos.current = { x: sx, y: sy };
    strokeStart.current = { x: sx, y: sy };
    setMeasurement({ x: sx, y: sy, text: '0m' });
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = mode === 'erase' ? 'white' : 'black';
      ctx.arc(sx, sy, (mode === 'erase' ? 20 : 4) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPos.current = null;
    strokeStart.current = null;
    setMeasurement(null);
    saveState();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const { x, y } = getCoordinates(e);
    const sx = snapToGrid ? Math.round(x / GRID_SIZE) * GRID_SIZE : x;
    const sy = snapToGrid ? Math.round(y / GRID_SIZE) * GRID_SIZE : y;

    if (snapToGrid && lastPos.current && sx === lastPos.current.x && sy === lastPos.current.y) {
      return;
    }

    if (strokeStart.current) {
      const w = Math.abs(sx - strokeStart.current.x) / GRID_SIZE;
      const h = Math.abs(sy - strokeStart.current.y) / GRID_SIZE;
      let text = '0m';
      
      if (w > 0 && h > 0) {
        text = `${w.toFixed(1)}m × ${h.toFixed(1)}m`;
      } else if (w > 0) {
        text = `${w.toFixed(1)}m`;
      } else if (h > 0) {
        text = `${h.toFixed(1)}m`;
      }
      
      setMeasurement({ x: sx, y: sy, text });
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !lastPos.current) return;

    ctx.lineWidth = mode === 'erase' ? 20 : 4;
    ctx.strokeStyle = mode === 'erase' ? 'white' : 'black';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    lastPos.current = { x: sx, y: sy };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      saveState();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (!type) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const sx = snapToGrid ? Math.round(x / GRID_SIZE) * GRID_SIZE : x;
    const sy = snapToGrid ? Math.round(y / GRID_SIZE) * GRID_SIZE : y;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'white';

    if (type === 'rack') {
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(sx, sy, GRID_SIZE * 4, GRID_SIZE);
      ctx.strokeRect(sx, sy, GRID_SIZE * 4, GRID_SIZE);
      ctx.fillStyle = 'black';
      ctx.font = '10px Arial';
      ctx.fillText('RACK', sx + 5, sy + 15);
    } else if (type === 'pallet') {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(sx, sy, GRID_SIZE, GRID_SIZE);
      ctx.strokeRect(sx, sy, GRID_SIZE, GRID_SIZE);
      ctx.fillStyle = 'white';
      ctx.font = '8px Arial';
      ctx.fillText('PAL', sx + 2, sy + 15);
    } else if (type === 'forklift') {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(sx, sy, GRID_SIZE * 1.5, GRID_SIZE * 1.5);
      ctx.strokeRect(sx, sy, GRID_SIZE * 1.5, GRID_SIZE * 1.5);
      ctx.fillStyle = 'black';
      ctx.font = '8px Arial';
      ctx.fillText('FORK', sx + 2, sy + 15);
    } else if (type === 'shipping') {
      ctx.fillStyle = 'rgba(74, 222, 128, 0.5)';
      ctx.setLineDash([5, 5]);
      ctx.fillRect(sx, sy, GRID_SIZE * 6, GRID_SIZE * 4);
      ctx.strokeRect(sx, sy, GRID_SIZE * 6, GRID_SIZE * 4);
      ctx.fillStyle = 'black';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('ZONE RÉCEPTION', sx + 10, sy + 25);
    } else if (type === 'workstation') {
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(sx, sy, GRID_SIZE * 3, GRID_SIZE * 2);
      ctx.strokeRect(sx, sy, GRID_SIZE * 3, GRID_SIZE * 2);
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.fillText('POSTE', sx + 5, sy + 25);
    }

    ctx.restore();
    saveState();
  };

  const handleProcess = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const base64 = canvas.toDataURL('image/png');
      onProcess(base64);
    }
  };

  return (
    <div className="flex-1 relative bg-slate-200 p-4 flex flex-col h-full w-full">
      <div className="flex justify-between items-center mb-2 shrink-0">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inspecteur d'Objet / Dessin</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${canUndo ? 'text-slate-500 hover:bg-slate-300' : 'text-slate-300 cursor-not-allowed'}`}
            title="Annuler (Undo)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${canRedo ? 'text-slate-500 hover:bg-slate-300' : 'text-slate-300 cursor-not-allowed'}`}
            title="Rétablir (Redo)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-1.5 rounded transition-colors ${snapToGrid ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-300'}`}
            title="Magnétisme de la grille (Snapping)"
          >
            <Magnet className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <button
            onClick={() => setMode('draw')}
            className={`p-1.5 rounded transition-colors ${mode === 'draw' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-300'}`}
            title="Dessiner"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode('erase')}
            className={`p-1.5 rounded transition-colors ${mode === 'erase' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-300'}`}
            title="Gommer"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <button
            onClick={clearCanvas}
            className="p-1.5 rounded text-slate-500 hover:bg-red-500 hover:text-white transition-colors"
            title="Tout effacer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 w-full bg-white rounded-lg shadow-inner relative overflow-hidden cursor-crosshair touch-none"
        style={{ backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '25px 25px' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="absolute inset-0 w-full h-full"
        />
        {measurement && isDrawing && mode === 'draw' && (
          <div 
            className="absolute z-50 px-2 py-1 bg-blue-600 text-white text-[10px] font-mono rounded shadow-md pointer-events-none whitespace-nowrap transition-none"
            style={{ 
              left: `${measurement.x + 15}px`, 
              top: `${measurement.y - 25}px` 
            }}
          >
            {measurement.text}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end shrink-0">
        <button
          onClick={handleProcess}
          disabled={isProcessing}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'ANALYSE EN COURS...' : 'GÉNÉRER L\'ENTREPÔT'}
        </button>
      </div>
    </div>
  );
}
