/**
 * Éditeur structuré de plan d'entrepôt — repris du dépôt `Modelisation-2d-main`
 * lors de la consolidation. Complémentaire de `CanvasDraw` : celui-ci édite des
 * objets typés (murs, zones, quais, plages d'alvéoles) avec export 3D, là où
 * `CanvasDraw` produit un croquis libre analysé par Gemini.
 */
import React, { useRef, useState } from 'react';
import { 
  WarehouseItem, 
  WarehouseItemType, 
  ReachDepth, 
  ReachDirection, 
  ZoneClass, 
  DockStatus 
} from '../types';
import { 
  Trash2, 
  MousePointer2, 
  Square, 
  Undo2, 
  Redo2, 
  Copy, 
  FlipHorizontal, 
  Eye, 
  Layers, 
  Flame, 
  Download, 
  Upload, 
  Image as ImageIcon, 
  Grid, 
  Truck, 
  ShieldAlert, 
  Sliders, 
  Compass,
  DoorOpen,
  Navigation
} from "lucide-react";

interface CanvasDrawProProps {
  items: WarehouseItem[];
  setItems: React.Dispatch<React.SetStateAction<WarehouseItem[]>>;
  onExport3D?: (payload: { timestamp: string; items: WarehouseItem[] }) => void;
}

export function CanvasDrawPro({ items, setItems, onExport3D }: CanvasDrawProProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Modes de dessin
  const [mode, setMode] = useState<'select' | 'binrange' | 'draw_wall' | 'draw_zone' | 'draw_dock'>('select');
  
  // États de sélection et d'édition
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<WarehouseItem | null>(null);
  
  // Historique Undo / Redo (jusqu'à 150 étapes)
  const [history, setHistory] = useState<WarehouseItem[][]>([[]]);
  const [future, setFuture] = useState<WarehouseItem[][]>([]);
  
  // Mode BIN+ (Assistant 3 Clics : Start -> End -> Head)
  const [binRangeState, setBinRangeState] = useState<{
    phase: 'idle' | 'awaitEnd' | 'awaitHead';
    start: { x: number; y: number } | null;
    end: { x: number; y: number } | null;
    cells: { x: number; y: number }[];
  }>({ phase: 'idle', start: null, end: null, cells: [] });
  
  // Calque Blueprint Architecte
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgVisible, setBgVisible] = useState<boolean>(true);
  const [bgOpacity, setBgOpacity] = useState<number>(0.35);
  const [bgScale, setBgScale] = useState<number>(1.0);
  
  // Grille 50x50 pouces calibrée
  const snapToGrid = true;
  const GRID_SIZE = 25; // Représente 50 pouces à l'échelle d'affichage (1px = 2 pouces)
  
  // Filtres de vue & Mode Rayon X
  const [xrayMode, setXrayMode] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [heatmapMode, setHeatmapMode] = useState<boolean>(false);
  
  // Tracé vectoriel libre
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [currentMouse, setCurrentMouse] = useState<{ x: number; y: number } | null>(null);
  
  // Fenêtre de paramétrage de l'alvéole
  const [editItem, setEditItem] = useState<WarehouseItem | null>(null);
  
  // Synchronisation de l'historique
  const pushState = (newItems: WarehouseItem[]) => {
    setHistory(prev => [...prev.slice(-149), items]);
    setFuture([]);
    setItems(newItems);
  };
  
  const undo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      const previous = newHistory.pop()!;
      setFuture(prev => [items, ...prev]);
      setHistory(newHistory);
      setItems(previous);
      setSelectedId(null);
      setEditItem(null);
    }
  };
  
  const redo = () => {
    if (future.length > 0) {
      const newFuture = [...future];
      const next = newFuture.shift()!;
      setHistory(prev => [...prev, items]);
      setFuture(newFuture);
      setItems(next);
      setSelectedId(null);
      setEditItem(null);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.DragEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (snapToGrid) {
      return {
        x: Math.round(x / GRID_SIZE) * GRID_SIZE,
        y: Math.round(y / GRID_SIZE) * GRID_SIZE,
      };
    }
    return { x, y };
  };

  const getPercentage = (px: number, isWidth: boolean) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const total = isWidth ? rect.width : rect.height;
    return (px / total) * 100;
  };

  // Gestion des clics sur la zone de dessin
  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCoordinates(e);
    
    if (mode === 'draw_wall' || mode === 'draw_zone' || mode === 'draw_dock') {
      setDrawingStart(coords);
      setCurrentMouse(coords);
      return;
    }
    
    if (mode === 'binrange') {
      if (binRangeState.phase === 'idle') {
        setBinRangeState({
          phase: 'awaitEnd',
          start: coords,
          end: null,
          cells: [coords]
        });
      } else if (binRangeState.phase === 'awaitEnd') {
        if (!binRangeState.start) return;
        const start = binRangeState.start;
        const isHorizontal = Math.abs(coords.x - start.x) >= Math.abs(coords.y - start.y);
        const cells: { x: number; y: number }[] = [];
        
        if (isHorizontal) {
          const xMin = Math.min(start.x, coords.x);
          const xMax = Math.max(start.x, coords.x);
          for (let x = xMin; x <= xMax; x += GRID_SIZE) {
            cells.push({ x, y: start.y });
          }
        } else {
          const yMin = Math.min(start.y, coords.y);
          const yMax = Math.max(start.y, coords.y);
          for (let y = yMin; y <= yMax; y += GRID_SIZE) {
            cells.push({ x: start.x, y });
          }
        }
        
        setBinRangeState({
          phase: 'awaitHead',
          start,
          end: coords,
          cells
        });
      } else if (binRangeState.phase === 'awaitHead') {
        const start = binRangeState.start!;
        const end = binRangeState.end!;
        const isNearStart = Math.hypot(coords.x - start.x, coords.y - start.y) <= Math.hypot(coords.x - end.x, coords.y - end.y);
        const head = isNearStart ? start : end;
        
        let direction: ReachDirection = 'up';
        if (start.y === end.y) {
          direction = (head.x === Math.min(start.x, end.x)) ? 'left' : 'right';
        } else {
          direction = (head.y === Math.min(start.y, end.y)) ? 'up' : 'down';
        }
        
        const prefix = prompt("Préfixe d'allée (ex: L3A) :", "L3A") || "L3A";
        const newRacks: WarehouseItem[] = binRangeState.cells.map((cell, idx) => {
          const isCellHead = (cell.x === head.x && cell.y === head.y);
          const numStr = String(idx + 1).padStart(2, '0');
          return {
            id: 'rack_' + Math.random().toString(36).substr(2, 9),
            type: 'rack',
            label: prefix + numStr,
            x: getPercentage(cell.x, true),
            y: getPercentage(cell.y, false),
            width: getPercentage(GRID_SIZE, true),
            height: getPercentage(GRID_SIZE, false),
            depthType: 'single',
            direction: direction,
            isHead: isCellHead,
            levels: 4,
            zone: 'B',
            rotationWeekly: Math.floor(Math.random() * 80) + 10,
            cnesstHeavy: false
          };
        });
        
        pushState([...items, ...newRacks]);
        setBinRangeState({ phase: 'idle', start: null, end: null, cells: [] });
        setMode('select');
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drawingStart) {
      setCurrentMouse(getCoordinates(e));
    }
  };

  const handleMouseUp = () => {
    if (drawingStart && currentMouse) {
      const widthPx = Math.abs(currentMouse.x - drawingStart.x);
      const heightPx = Math.abs(currentMouse.y - drawingStart.y);
      const xPx = Math.min(drawingStart.x, currentMouse.x);
      const yPx = Math.min(drawingStart.y, currentMouse.y);

      if (widthPx >= GRID_SIZE || heightPx >= GRID_SIZE) {
        let newItem: WarehouseItem;
        
        if (mode === 'draw_wall') {
          newItem = {
            id: 'wall_' + Math.random().toString(36).substr(2, 9),
            type: 'wall',
            label: 'Mur',
            x: getPercentage(xPx, true),
            y: getPercentage(yPx, false),
            width: getPercentage(widthPx, true),
            height: getPercentage(heightPx, false),
          };
        } else if (mode === 'draw_zone') {
          const zoneName = prompt('Nom / Classe de la Zone (A, B, C, D) :', 'A') || 'A';
          newItem = {
            id: 'zone_' + Math.random().toString(36).substr(2, 9),
            type: 'zone',
            label: 'Zone ' + zoneName,
            zone: zoneName.toUpperCase() as ZoneClass,
            x: getPercentage(xPx, true),
            y: getPercentage(yPx, false),
            width: getPercentage(widthPx, true),
            height: getPercentage(heightPx, false),
          };
        } else {
          const dockNum = prompt('Numéro de porte de quai (1-8) :', '1') || '1';
          newItem = {
            id: 'dock_' + Math.random().toString(36).substr(2, 9),
            type: 'dock',
            label: 'Quai Porte ' + dockNum,
            dockNumber: parseInt(dockNum, 10),
            dockStatus: 'available',
            x: getPercentage(xPx, true),
            y: getPercentage(yPx, false),
            width: getPercentage(Math.max(widthPx, GRID_SIZE * 3), true),
            height: getPercentage(Math.max(heightPx, GRID_SIZE * 2), false),
          };
        }
        pushState([...items, newItem]);
      }
      setDrawingStart(null);
      setCurrentMouse(null);
    }
  };

  // Duplication & Outil Miroir
  const handleCopy = () => {
    if (!selectedId) return;
    const target = items.find(i => i.id === selectedId);
    if (target) setClipboard(target);
  };

  const handlePaste = () => {
    if (!clipboard) return;
    const pasted: WarehouseItem = {
      ...clipboard,
      id: clipboard.type + '_' + Math.random().toString(36).substr(2, 9),
      label: clipboard.label + '_copie',
      x: Math.min(clipboard.x + 3, 90),
      y: Math.min(clipboard.y + 3, 90)
    };
    pushState([...items, pasted]);
    setSelectedId(pasted.id);
    setEditItem(pasted);
  };

  const handleFlip = (horizontal: boolean) => {
    if (!selectedId) return;
    const updated = items.map(item => {
      if (item.id === selectedId) {
        let newDir = item.direction;
        if (horizontal) {
          if (item.direction === 'left') newDir = 'right';
          else if (item.direction === 'right') newDir = 'left';
        } else {
          if (item.direction === 'up') newDir = 'down';
          else if (item.direction === 'down') newDir = 'up';
        }
        return { ...item, direction: newDir };
      }
      return item;
    });
    pushState(updated);
    if (editItem && editItem.id === selectedId) {
      setEditItem({ ...editItem, direction: updated.find(i => i.id === selectedId)?.direction });
    }
  };

  // Générateur automatique d'allées en vis-à-vis (S-Shape All-in-One)
  const handleGenerateAisle = () => {
    const aisleName = prompt("Nom de l'allée (ex: L2A) :", "L2A") || "L2A";
    const nbPairs = parseInt(prompt('Nombre de travées par rangée (ex: 8) :', '8') || '8', 10);
    const startX = 15;
    const startY = 20;
    const newItems: WarehouseItem[] = [];

    for (let i = 0; i < nbPairs; i++) {
      // Rangée gauche (impairs)
      const numG = String(i * 2 + 1).padStart(2, '0');
      newItems.push({
        id: 'rack_' + Math.random().toString(36).substr(2, 9),
        type: 'rack',
        label: aisleName + numG,
        x: startX + i * 4.5,
        y: startY,
        width: 3.8,
        height: 5.5,
        depthType: 'single',
        direction: 'down',
        isHead: i === 0,
        levels: 4,
        zone: 'A',
        rotationWeekly: 120 - i * 8,
        cnesstHeavy: false
      });

      // Rangée droite (pairs) en vis-à-vis avec allée cariste centrale
      const numD = String(i * 2 + 2).padStart(2, '0');
      newItems.push({
        id: 'rack_' + Math.random().toString(36).substr(2, 9),
        type: 'rack',
        label: aisleName + numD,
        x: startX + i * 4.5,
        y: startY + 12,
        width: 3.8,
        height: 5.5,
        depthType: 'single',
        direction: 'up',
        isHead: i === nbPairs - 1,
        levels: 4,
        zone: 'B',
        rotationWeekly: 40 + i * 5,
        cnesstHeavy: false
      });
    }

    pushState([...items, ...newItems]);
  };

  // Importation de fichier Blueprint
  const handleBlueprintUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBgImage(event.target?.result as string);
        setBgVisible(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Ingestion CSV / Reverse-Mapping
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      const imported: WarehouseItem[] = [];
      let row = 10;
      let col = 10;

      lines.slice(0, 30).forEach((line, idx) => {
        const parts = line.split(/[,;\t]/);
        const code = parts[0].trim();
        if (code && !code.toLowerCase().includes('bin') && !code.toLowerCase().includes('item')) {
          imported.push({
            id: 'rack_imp_' + idx,
            type: 'rack',
            label: code,
            x: col,
            y: row,
            width: 4,
            height: 5,
            depthType: 'single',
            direction: 'down',
            levels: 4,
            zone: 'B',
            rotationWeekly: 50
          });
          col += 5;
          if (col > 80) { col = 10; row += 8; }
        }
      });
      pushState([...items, ...imported]);
    };
    reader.readAsText(file);
  };

  // Couleurs de rendu
  const getItemStyle = (item: WarehouseItem) => {
    if (heatmapMode && item.type === 'rack') {
      const rot = item.rotationWeekly || 0;
      if (rot > 100) return { bg: 'bg-red-500/90', border: 'border-red-600', text: 'text-white' };
      if (rot > 50) return { bg: 'bg-amber-500/90', border: 'border-amber-600', text: 'text-white' };
      return { bg: 'bg-blue-500/90', border: 'border-blue-600', text: 'text-white' };
    }

    switch (item.type) {
      case 'rack':
        if (item.zone === 'A') return { bg: 'bg-blue-600/85', border: 'border-blue-400', text: 'text-white' };
        if (item.zone === 'B') return { bg: 'bg-emerald-600/85', border: 'border-emerald-400', text: 'text-white' };
        if (item.zone === 'C') return { bg: 'bg-amber-600/85', border: 'border-amber-400', text: 'text-white' };
        if (item.zone === 'D') return { bg: 'bg-rose-600/85', border: 'border-rose-400', text: 'text-white' };
        return { bg: 'bg-orange-500/85', border: 'border-orange-300', text: 'text-white' };
      case 'wall':
        return { bg: 'bg-slate-700', border: 'border-slate-900', text: 'text-slate-200' };
      case 'dock':
        return { bg: 'bg-cyan-600/90', border: 'border-cyan-400', text: 'text-white' };
      case 'zone':
        return { bg: 'bg-indigo-500/20', border: 'border-indigo-400 border-dashed', text: 'text-indigo-200 font-bold' };
      case 'charger':
        return { bg: 'bg-yellow-500/90', border: 'border-yellow-300', text: 'text-slate-900 font-black' };
      case "door":
        return { bg: "bg-amber-800/80", border: "border-amber-600", text: "text-amber-100" };
      case "fire_extinguisher":
        return { bg: "bg-red-600/90", border: "border-red-400", text: "text-white" };
      case "direction_arrow":
        return { bg: "bg-blue-600/60", border: "border-blue-400 border-dashed", text: "text-white" };
      case 'stop_sign':
        return { bg: 'bg-red-600', border: 'border-white', text: 'text-white font-black' };
      default:
        return { bg: 'bg-slate-500/80', border: 'border-slate-400', text: 'text-white' };
    }
  };

  return (
    <div className="flex-1 relative bg-slate-900 text-slate-100 flex flex-col h-full w-full select-none">
      {/* Barre d'outils supérieure */}
      <div className="h-12 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-1.5">
          <button
            onClick={undo}
            disabled={history.length <= 1}
            className={`p-1.5 rounded transition-colors ${history.length > 1 ? 'hover:bg-slate-800 text-slate-200' : 'text-slate-600 cursor-not-allowed'}`}
            title="Annuler (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className={`p-1.5 rounded transition-colors ${future.length > 0 ? 'hover:bg-slate-800 text-slate-200' : 'text-slate-600 cursor-not-allowed'}`}
            title="Rétablir (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-800 mx-1"></div>

          {/* Outils de mode */}
          <button
            onClick={() => setMode('select')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${mode === 'select' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <MousePointer2 className="w-3.5 h-3.5" /> Sélection
          </button>

          <button
            onClick={() => setMode('binrange')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${mode === 'binrange' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Assistant 3 clics : Start -> End -> Tête cariste"
          >
            <Compass className="w-3.5 h-3.5" /> BIN+ Guidé
          </button>

          <button
            onClick={() => setMode('draw_wall')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${mode === 'draw_wall' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Square className="w-3.5 h-3.5" /> Mur
          </button>

          <button
            onClick={() => setMode('draw_dock')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${mode === 'draw_dock' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Truck className="w-3.5 h-3.5" /> Quai 53'
          </button>

          <button
            onClick={() => setMode('draw_zone')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${mode === 'draw_zone' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Layers className="w-3.5 h-3.5" /> Zone ABC
          </button>

          <button
            onClick={handleGenerateAisle}
            className="px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            title="Générer une allée en vis-à-vis avec sens cariste"
          >
            ⚡ Allée Complète
          </button>
        </div>

        {/* Commandes rapides & Filtres */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setXrayMode(!xrayMode)}
            className={`p-1.5 rounded transition-colors text-xs font-bold flex items-center gap-1 ${xrayMode ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Mode Rayon X (estompe l'infrastructure)"
          >
            <Sliders className="w-3.5 h-3.5" /> X-Ray
          </button>

          <button
            onClick={() => setHeatmapMode(!heatmapMode)}
            className={`p-1.5 rounded transition-colors text-xs font-bold flex items-center gap-1 ${heatmapMode ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Heatmap de rotation hebdomadaire"
          >
            <Flame className="w-3.5 h-3.5" /> Heatmap
          </button>

          <div className="w-px h-5 bg-slate-800 mx-1"></div>

          {/* Outils de duplication */}
          <button
            onClick={handleCopy}
            disabled={!selectedId}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:text-slate-600"
            title="Copier"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handlePaste}
            disabled={!clipboard}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:text-slate-600"
            title="Coller"
          >
            📋
          </button>
          <button
            onClick={() => handleFlip(true)}
            disabled={!selectedId}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:text-slate-600"
            title="Miroir Horizontal (Retournement cariste)"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-800 mx-1"></div>

          {/* Calque Blueprint */}
          <label className="cursor-pointer p-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1 text-xs" title="Importer plan d'architecte">
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" /> Blueprint
            <input type="file" accept="image/*" onChange={handleBlueprintUpload} className="hidden" />
          </label>

          {/* Import CSV */}
          <label className="cursor-pointer p-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1 text-xs" title="Importer alvéoles CSV">
            <Upload className="w-3.5 h-3.5 text-emerald-400" /> Ingestion CSV
            <input type="file" accept=".csv,.txt" onChange={handleCsvImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* Barre d'information contextuelle */}
      <div className="h-8 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <span>
            Mode : <strong className="text-cyan-400 uppercase">{mode}</strong>
            {binRangeState.phase === 'awaitEnd' && ' (Cliquez sur la deuxième extrémité de la rangée)'}
            {binRangeState.phase === 'awaitHead' && " (Cliquez sur la TÊTE de l'allée pour la façade cariste)"}
          </span>
          <span className="flex items-center gap-1">
            <Grid className="w-3 h-3 text-slate-500" /> Grille : <strong>50&quot; x 50&quot; (Palette 48x40)</strong>
          </span>
        </div>

        {bgImage && (
          <div className="flex items-center gap-3">
            <span className="text-cyan-300 font-medium">Blueprint actif</span>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={bgOpacity} 
              onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
              className="w-16 h-1 accent-cyan-400"
              title="Opacité plan d'architecte"
            />
            <button onClick={() => setBgVisible(!bgVisible)} className="text-slate-400 hover:text-white">
              {bgVisible ? <Eye className="w-3.5 h-3.5" /> : '👁️‍🗨️'}
            </button>
          </div>
        )}
      </div>

      {/* Canevas Principal */}
      <div className="flex-1 relative overflow-hidden flex">
        <div 
          ref={containerRef}
          className={`flex-1 relative overflow-auto cursor-crosshair bg-[#0b1220] ${xrayMode ? 'opacity-90' : ''}`}
          style={{
            backgroundImage: `linear-gradient(rgba(56, 189, 248, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.15) 1px, transparent 1px), linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.04) 1px, transparent 1px)`,
            backgroundSize: `${GRID_SIZE * 10}px ${GRID_SIZE * 10}px, ${GRID_SIZE * 10}px ${GRID_SIZE * 10}px, ${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px`,
              backgroundPosition: `-1px -1px`
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Calque Blueprint d'Arrière-Plan */}
          {bgImage && bgVisible && (
            <img 
              src={bgImage} 
              alt="Blueprint" 
              className="absolute top-0 left-0 pointer-events-none transition-opacity select-none"
              style={{
                opacity: bgOpacity,
                transform: `scale(${bgScale})`,
                transformOrigin: 'top left'
              }}
            />
          )}

          {/* Rendu des Éléments */}
          {items.map((item) => {
            const style = getItemStyle(item);
            const isSelected = item.id === selectedId;

            return (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(item.id);
                  setEditItem(item);
                }}
                className={`absolute flex flex-col items-center justify-center border-2 rounded-sm transition-all ${style.border} ${style.bg} ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 z-30' : 'z-10'}`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  width: `${item.width}%`,
                  height: `${item.height}%`,
                }}
              >
                {/* Flèche de sens d'insertion cariste */}
                {item.type === 'rack' && item.direction && (
                  <span className="text-[10px] text-cyan-300 font-bold leading-none mb-0.5">
                    {item.direction === 'up' && '▲'}
                    {item.direction === 'down' && '▼'}
                    {item.direction === 'left' && '◄'}
                    {item.direction === 'right' && '►'}
                  </span>
                )}

                {/* Libellé */}
                
                {item.type === "door" && <DoorOpen className="w-full h-full opacity-50 p-1" />}
                {item.type === "fire_extinguisher" && <Flame className="w-full h-full opacity-80 p-1" />}
                {item.type === "direction_arrow" && <Navigation className="w-full h-full opacity-70 p-1" />}
{showLabels && (
                  <span className={`text-[9px] font-bold text-center leading-tight truncate px-0.5 ${style.text}`}>
                    {item.label}
                  </span>
                )}

                {/* Badge Tête de rack ou CNESST */}
                {item.isHead && (
                  <span className="absolute -top-1.5 -left-1.5 bg-amber-400 text-slate-950 text-[7px] font-black px-1 rounded-full shadow">
                    HEAD
                  </span>
                )}
                {item.cnesstHeavy && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[7px] font-black px-1 rounded-full shadow">
                    SOL
                  </span>
                )}
              </div>
            );
          })}

          {/* Prévisualisation de tracé libre */}
          {drawingStart && currentMouse && (
            <div
              className="absolute border-2 border-cyan-400 bg-cyan-500/20 pointer-events-none z-40"
              style={{
                left: `${Math.min(drawingStart.x, currentMouse.x)}px`,
                top: `${Math.min(drawingStart.y, currentMouse.y)}px`,
                width: `${Math.abs(currentMouse.x - drawingStart.x)}px`,
                height: `${Math.abs(currentMouse.y - drawingStart.y)}px`,
              }}
            />
          )}
        </div>

        {/* Panneau latéral de sous-options de l'élément sélectionné */}
        {editItem && (
          <aside className="w-72 bg-slate-950 border-l border-slate-800 p-4 flex flex-col shrink-0 text-xs z-30 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> Propriétés
              </h3>
              <button 
                onClick={() => {
                  pushState(items.filter(i => i.id !== editItem.id));
                  setEditItem(null);
                  setSelectedId(null);
                }} 
                className="text-rose-400 hover:text-rose-300"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Identifiant / Nom :</label>
                <input 
                  type="text" 
                  value={editItem.label} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditItem({ ...editItem, label: val });
                    setItems(items.map(i => i.id === editItem.id ? { ...i, label: val } : i));
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                />
              </div>

              {editItem.type === 'rack' && (
                <>
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Profondeur :</label>
                    <select 
                      value={editItem.depthType || 'single'} 
                      onChange={(e) => {
                        const val = e.target.value as ReachDepth;
                        setEditItem({ ...editItem, depthType: val });
                        setItems(items.map(i => i.id === editItem.id ? { ...i, depthType: val } : i));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    >
                      <option value="single">Simple Profondeur (Single-Reach)</option>
                      <option value="double">Double Profondeur (Deep-Reach)</option>
                      <option value="multi">Multi-Profondeur (Drive-In)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Sens Prélèvement Cariste :</label>
                    <select 
                      value={editItem.direction || 'up'} 
                      onChange={(e) => {
                        const val = e.target.value as ReachDirection;
                        setEditItem({ ...editItem, direction: val });
                        setItems(items.map(i => i.id === editItem.id ? { ...i, direction: val } : i));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    >
                      <option value="up">Haut (▲)</option>
                      <option value="down">Bas (▼)</option>
                      <option value="left">Gauche (◄)</option>
                      <option value="right">Droite (►)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Zone ABC :</label>
                    <select 
                      value={editItem.zone || 'B'} 
                      onChange={(e) => {
                        const val = e.target.value as ZoneClass;
                        setEditItem({ ...editItem, zone: val });
                        setItems(items.map(i => i.id === editItem.id ? { ...i, zone: val } : i));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    >
                      <option value="A">Zone A (Forte rotation)</option>
                      <option value="B">Zone B (Rotation moyenne)</option>
                      <option value="C">Zone C (Stockage profond)</option>
                      <option value="D">Zone D (Retours / TMD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">Niveaux Verticaux :</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="6" 
                      value={editItem.levels || 4} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setEditItem({ ...editItem, levels: val });
                        setItems(items.map(i => i.id === editItem.id ? { ...i, levels: val } : i));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 font-medium flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Charge &gt; 15 kg (CNESST)
                    </span>
                    <input 
                      type="checkbox" 
                      checked={!!editItem.cnesstHeavy} 
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEditItem({ ...editItem, cnesstHeavy: val });
                        setItems(items.map(i => i.id === editItem.id ? { ...i, cnesstHeavy: val } : i));
                      }}
                      className="rounded accent-amber-500"
                    />
                  </div>
                </>
              )}

              {editItem.type === 'dock' && (
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Statut de Niveleur :</label>
                  <select 
                    value={editItem.dockStatus || 'available'} 
                    onChange={(e) => {
                      const val = e.target.value as DockStatus;
                      setEditItem({ ...editItem, dockStatus: val });
                      setItems(items.map(i => i.id === editItem.id ? { ...i, dockStatus: val } : i));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                  >
                    <option value="available">Disponible</option>
                    <option value="loading">En déchargement (70%)</option>
                    <option value="out_of_service">⚠️ Hors Service (Panne)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between">
              <button 
                onClick={() => setEditItem(null)} 
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 rounded font-semibold text-slate-300"
              >
                Fermer
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Pied de page avec bouton Export 3D */}
      <footer className="h-10 bg-slate-950 border-t border-slate-800 px-4 flex items-center justify-between text-xs shrink-0">
        <span className="text-slate-400 font-mono">
          {items.length} éléments au plan • {items.filter(i => i.type === 'rack').length} alvéoles de stockage
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const exportPayload = {
                version: '3.0',
                unit: 'inches',
                gridSquare: 50,
                timestamp: new Date().toISOString(),
                items: items
              };
              if (onExport3D) {
                onExport3D(exportPayload);
              } else {
                navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
                alert('Données exportées pour Three.js copiées dans le presse-papier !');
              }
            }}
            className="px-4 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded shadow-md transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> EXPORTER EN 3D INSTANCIÉ
          </button>
        </div>
      </footer>
    </div>
  );
}


