import React from 'react';
import { WarehouseLayout } from '../types';
import { Download, RefreshCcw } from 'lucide-react';

interface WarehouseViewProps {
  layout: WarehouseLayout;
  onReset: () => void;
}

export function WarehouseView({ layout, onReset }: WarehouseViewProps) {
  const getStyle = (type: string) => {
    switch (type) {
      case 'wall': return { border: 'border-slate-600', bg: 'bg-slate-200/50', text: 'text-slate-700' };
      case 'rack': return { border: 'border-blue-600', bg: 'bg-blue-50/50', text: 'text-blue-700' };
      case 'eating_area': return { border: 'border-green-600', bg: 'bg-green-50/50', text: 'text-green-700' };
      case 'office': return { border: 'border-orange-500', bg: 'bg-orange-50/50', text: 'text-orange-700' };
      case 'bathroom': return { border: 'border-purple-500', bg: 'bg-purple-50/50', text: 'text-purple-700' };
      case 'door': return { border: 'border-red-500', bg: 'bg-red-50/50', text: 'text-red-700' };
      default: return { border: 'border-slate-400', bg: 'bg-slate-50/50', text: 'text-slate-600' };
    }
  };

  return (
    <div className="flex-1 relative bg-slate-200 p-4 flex flex-col h-full w-full">
      <div className="flex justify-between items-center mb-2 shrink-0">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plan d'Entrepôt</h2>
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
        >
          <RefreshCcw className="w-3 h-3" />
          NOUVEAU DESSIN
        </button>
      </div>
      
      <div 
        className="flex-1 w-full bg-white rounded-lg shadow-inner relative overflow-hidden"
        style={{ backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '25px 25px' }}
      >
        {/* We use percentage based positioning directly from the AI layout */}
        {layout.items.map((item) => {
          const style = getStyle(item.type);
          return (
            <div
              key={item.id}
              className={`absolute flex items-start justify-start p-1 border-2 ${style.border} ${style.bg}`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.width}%`,
                height: `${item.height}%`,
              }}
              title={item.label}
            >
              {item.width > 5 && item.height > 5 ? (
                <span className={`text-[10px] font-bold uppercase leading-tight bg-white px-1 -mt-3 -ml-1 ${style.text}`}>
                  {item.label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[10px] uppercase font-bold text-slate-500 shrink-0">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-slate-600 bg-slate-200/50"></span> MURS</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-blue-600 bg-blue-50/50"></span> RACKS</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-green-600 bg-green-50/50"></span> ZONE REPOS</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-orange-500 bg-orange-50/50"></span> BUREAU</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-red-500 bg-red-50/50"></span> PORTES</div>
      </div>
    </div>
  );
}
