export type WarehouseItemType = 'rack' | 'wall' | 'door' | 'eating_area' | 'office' | 'bathroom' | 'other';

export interface WarehouseItem {
  id: string;
  type: WarehouseItemType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface WarehouseLayout {
  width: number;
  height: number;
  items: WarehouseItem[];
}
