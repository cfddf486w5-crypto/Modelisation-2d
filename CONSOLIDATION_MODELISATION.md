# Consolidation — modélisation 2D

Ce dépôt absorbe `Modelisation-2d-main` pour qu'il puisse être supprimé sans
perte. Date : 2026-09-01.

## Ce qui s'était passé

Les deux dépôts ne sont pas deux versions du même produit : ils ont **divergé en
sens opposés** à partir d'une base commune.

| | **ce dépôt** (avant fusion) | `Modelisation-2d-main` |
|---|---|---|
| `server.ts` | **4 040 o — backend Gemini** (`/api/analyze-warehouse`) | 748 o, serveur nu, sans IA |
| `package.json` | inclut `@google/genai` | pas de dépendance IA |
| `src/App.tsx` | 9 429 o, **appelle l'API IA** | 13 605 o, n'appelle aucune API |
| `src/types.ts` | 380 o | **1 382 o** (sous-options d'alvéoles, zonage, quais) |
| `CanvasDraw.tsx` | 12 495 o | **37 203 o** |

Aucun n'était un sur-ensemble de l'autre : celui-ci portait l'IA, l'autre portait
l'éditeur avancé. Reprendre son `App.tsx` tel quel aurait **supprimé la
fonctionnalité Gemini** — d'où une fusion sélective plutôt qu'un écrasement.

## Deux surfaces d'édition, pas une

Les deux `CanvasDraw` ont des interfaces incompatibles parce qu'ils font des
choses différentes :

| | `CanvasDraw` (ici) | `CanvasDrawPro` (repris) |
|---|---|---|
| Props | `{ onProcess, isProcessing }` | `{ items, setItems, onExport3D }` |
| Modes | dessin libre / gomme | sélection, plage d'alvéoles, mur, zone, quai |
| Sortie | image PNG → analyse Gemini | `WarehouseItem[]` typés → export 3D |

Ils coexistent désormais derrière un sélecteur **Croquis IA / Éditeur structuré**
dans l'en-tête.

## Ce qui a été repris

| Élément | Détail |
|---|---|
| `src/components/CanvasDrawPro.tsx` | L'éditeur structuré (37 Ko). Export renommé pour ne pas entrer en collision avec `CanvasDraw`. N'a besoin que de React, `../types` et `lucide-react`, déjà présents. |
| `src/types.ts` | **Types unifiés** — voir ci-dessous. |
| `src/App.tsx` | Sélecteur de mode + état `items` pour l'éditeur structuré. Le flux IA est inchangé. |

### Les types ont dû être fusionnés, pas remplacés

Le `types.ts` de `Modelisation-2d-main` n'était pas compatible en l'état :

- il **retirait** `'bathroom'` de `WarehouseItemType`, alors que
  `WarehouseView.tsx` en dépend (un `case 'bathroom'`) et que le prompt Gemini de
  `server.ts` le cite ;
- il rendait `gridInchSize` **obligatoire** sur `WarehouseLayout`, alors que les
  plans renvoyés par l'analyse IA ne le fournissent pas.

Le fichier final est un vrai sur-ensemble : `'bathroom'` conservé aux côtés des
nouveaux types (`dock`, `zone`, `charger`, `fire_extinguisher`…), et
`gridInchSize` rendu optionnel.

## Ce qui n'a pas été repris

Les 18 documents Markdown de `Modelisation-2d-main` (analyses logistique,
catalogue d'options, rapports) : **17 sont déjà présents à l'octet près dans
`wms-slotting-3d-v2`**, où ils sont conservés. Seul `RAPPORT_SESSION_ACTUELLE.md`
diffère, d'une version de session à l'autre. Rien à dupliquer ici.

Le dossier `Modelisation-2d-main/` imbriqué contenait aussi
`CanvasDraw_backup.tsx` (12 499 o) — soit l'ancien canvas, identique à celui
d'ici : c'est la preuve que le canvas y avait été remplacé sur place, pas une
version à conserver.

## Vérifications effectuées

- `tsc --noEmit` → **0 erreur**.
- `vite build` → build de production réussi (244 Ko de JS, 30 Ko de CSS).

## Les autres dépôts de la famille

- **`Mapping-test`** — malgré son nom, c'est une **troisième application
  distincte**, pas une version de celle-ci : modèle de données sans aucun
  recouvrement (`ProjectState`, `ConstructionElement`, `WarehouseBin` au lieu de
  `WarehouseItem`), et ~158 Ko de code — `Workspace` (40 Ko), `ThreeDView`
  (25 Ko), `AuditPanel` (17 Ko), `PropertyPanel` (16 Ko), export PNG, historique
  undo/redo. **À conserver comme dépôt à part** (et à renommer : son nom
  le dessert). L'y fusionner reviendrait à réconcilier deux modèles de données
  incompatibles, ce qui est un chantier, pas une consolidation.
- **`cf-worker-dlogistique-modelisations`** — artefact de déploiement Cloudflare
  Worker, pas du code source dupliqué. À conserver tel quel.
