import React, { useState } from 'react';
import { CanvasDraw } from './components/CanvasDraw';
import { CanvasDrawPro } from './components/CanvasDrawPro';
import { WarehouseView } from './components/WarehouseView';
import { WarehouseItem, WarehouseLayout } from './types';
import { Box, Layout } from 'lucide-react';

/** Croquis libre analysé par l'IA, ou édition directe d'objets typés. */
type EditorMode = 'sketch' | 'structured';

export default function App() {
  const [layout, setLayout] = useState<WarehouseLayout | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('sketch');
  const [items, setItems] = useState<WarehouseItem[]>([]);

  const handleProcessImage = async (base64Image: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch('/api/analyze-warehouse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse de l\'image');
      }

      const data = await response.json();
      setLayout(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      <header className="h-12 bg-[#0f172a] text-white flex items-center justify-between px-6 border-b border-slate-700 shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-bold tracking-tight text-blue-400">STOCKFLOW 2D</span>
          <div className="h-4 w-[1px] bg-slate-600"></div>
          <span className="text-xs font-medium text-slate-300 uppercase tracking-widest">Entrepôt IA</span>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded overflow-hidden border border-slate-600 mr-2">
            <button
              onClick={() => setMode('sketch')}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                mode === 'sketch' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              CROQUIS IA
            </button>
            <button
              onClick={() => setMode('structured')}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                mode === 'structured' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ÉDITEUR STRUCTURÉ
            </button>
          </div>
          <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition-colors">GÉNÉRER LE PLAN 3D</button>
          <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold transition-colors">EXPORTER PDF</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-3 bg-red-900/90 border border-red-500 text-white rounded-lg text-xs font-mono shadow-xl">
            {error}
          </div>
        )}


        <div className="flex-1 flex overflow-hidden w-full h-full">
          {mode === 'structured' ? (
            <CanvasDrawPro items={items} setItems={setItems} />
          ) : !layout ? (
            <CanvasDraw onProcess={handleProcessImage} isProcessing={isProcessing} />
          ) : (
            <WarehouseView layout={layout} onReset={() => setLayout(null)} />
          )}
        </div>

        {/* Right Aside Sidebar */}
        <aside className="w-72 bg-white border-l border-slate-300 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Inspecteur d'Objet</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <label className="text-[9px] text-slate-400 uppercase font-bold">Largeur (m)</label>
                <input type="text" value={layout ? "Auto" : "-"} className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-600 font-mono" readOnly />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] text-slate-400 uppercase font-bold">Hauteur (m)</label>
                <input type="text" value={layout ? "Auto" : "-"} className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-600 font-mono" readOnly />
              </div>
            </div>
          </div>
          
          <div className="p-4 border-b border-slate-100 bg-white">
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Bibliothèque</h2>
            <div className="grid grid-cols-2 gap-2">
              <div 
                draggable 
                onDragStart={(e) => e.dataTransfer.setData('type', 'rack')}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing border border-slate-200 transition-colors"
              >
                <div className="w-8 h-4 bg-[#fb923c] border border-orange-700"></div>
                <span className="text-[9px] text-slate-600 font-bold uppercase text-center leading-tight">Étagère</span>
              </div>
              <div 
                draggable 
                onDragStart={(e) => e.dataTransfer.setData('type', 'pallet')}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing border border-slate-200 transition-colors"
              >
                <div className="w-5 h-5 bg-[#d97706] border border-amber-800"></div>
                <span className="text-[9px] text-slate-600 font-bold uppercase text-center leading-tight">Palette</span>
              </div>
              <div 
                draggable 
                onDragStart={(e) => e.dataTransfer.setData('type', 'forklift')}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing border border-slate-200 transition-colors"
              >
                <div className="w-6 h-6 bg-[#eab308] border border-yellow-700 rounded-sm"></div>
                <span className="text-[9px] text-slate-600 font-bold uppercase text-center leading-tight">Chariot</span>
              </div>
              <div 
                draggable 
                onDragStart={(e) => e.dataTransfer.setData('type', 'shipping')}
                className="flex flex-col items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing border border-slate-200 transition-colors"
              >
                <div className="w-8 h-6 border-2 border-dashed border-[#4ade80] bg-green-500/20"></div>
                <span className="text-[9px] text-slate-600 font-bold uppercase text-center leading-tight">Zone Récep.</span>
              </div>
              <div 
                draggable 
                onDragStart={(e) => e.dataTransfer.setData('type', 'workstation')}
                className="col-span-2 flex items-center justify-center gap-3 p-2 bg-slate-50 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing border border-slate-200 transition-colors"
              >
                <div className="w-6 h-5 bg-[#60a5fa] border border-blue-700"></div>
                <span className="text-[9px] text-slate-600 font-bold uppercase text-center leading-tight">Poste de Travail</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Inventaire du Plan</h2>
            <div className="space-y-1">
              {layout ? (
                <>
                  <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-xs font-medium">Éléments Détectés</span>
                    <span className="text-[10px] font-mono bg-slate-200 px-1 rounded">x{layout.items.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-default border border-transparent">
                    <span className="text-xs">Racks de Stockage</span>
                    <span className="text-[10px] font-mono bg-slate-200 px-1 rounded">x{layout.items.filter(i => i.type === 'rack').length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-default border border-transparent">
                    <span className="text-xs">Portes d'Accès</span>
                    <span className="text-[10px] font-mono bg-slate-200 px-1 rounded">x{layout.items.filter(i => i.type === 'door').length}</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 italic">Dessinez un plan pour voir l'inventaire.</div>
              )}
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-200 bg-slate-900 text-white">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Utilisation Sol</span>
              <span className="text-[10px] font-bold">{layout ? "64%" : "0%"}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: layout ? '64%' : '0%' }}></div>
            </div>
            <div className="mt-3 text-[10px] text-slate-400 leading-tight italic">
              {layout ? "Planification automatique des flux optimisée pour 3 chariots élévateurs." : "En attente de génération..."}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
