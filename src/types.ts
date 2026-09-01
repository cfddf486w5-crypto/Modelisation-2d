// Types unifiés lors de la consolidation avec le dépôt `Modelisation-2d-main`.
//
// Deux variantes de l'application avaient divergé : celle-ci (croquis analysé par
// Gemini) et l'éditeur structuré. Leurs types sont ici réunis en un sur-ensemble,
// pour que les deux surfaces d'édition partagent le même modèle de données.

export type WarehouseItemType =
  | 'rack'
  | 'wall'
  | 'door'
  | 'dock'
  | 'office'
  | 'eating_area'
  | 'bathroom'
  | 'stop_sign'
  | 'direction_arrow'
  | 'charger'
  | 'fire_extinguisher'
  | 'zone'
  | 'other';

export type ReachDepth = 'single' | 'double' | 'multi';
export type ReachDirection = 'up' | 'down' | 'left' | 'right';
export type DockStatus = 'available' | 'loading' | 'out_of_service';
export type ZoneClass = 'A' | 'B' | 'C' | 'D';

export interface WarehouseItem {
  id: string;
  type: WarehouseItemType;
  label: string;
  x: number; // pourcentage (0-100)
  y: number;
  width: number;
  height: number;
  color?: string;

  // Sous-options d'alvéoles (racks) — sans calibrage P1-P7
  depthType?: ReachDepth;
  direction?: ReachDirection;
  isHead?: boolean;
  levels?: number; // 1 à 6
  beamHeight?: number;
  binOver?: number;
  pickBin?: number;
  cnesstHeavy?: boolean; // > 15 kg contraint au sol

  // Sous-options de zonage
  zone?: ZoneClass | string;
  rotationWeekly?: number; // pour heatmap thermique

  // Sous-options d'infrastructures
  dockNumber?: number;
  dockStatus?: DockStatus;
}

export interface WarehouseLayout {
  width: number;
  height: number;
  /**
   * Taille de la grille en pouces (50 po calibré) — utilisée par l'éditeur
   * structuré. Optionnel : les plans produits par l'analyse IA ne la
   * renseignent pas.
   */
  gridInchSize?: number;
  blueprint?: {
    url?: string;
    opacity: number;
    scale: number;
    visible: boolean;
  };
  items: WarehouseItem[];
}
