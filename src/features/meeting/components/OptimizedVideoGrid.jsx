// src/features/meeting/components/OptimizedVideoGrid.jsx
import { useRef, useMemo, useLayoutEffect, useState, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMeeting } from '../context/MeetingContext';
import ParticipantTile from './ParticipantTile';

/**
 * Hook pour observer la taille du conteneur (width/height) via ResizeObserver
 */
function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setSize({ width: cr.width, height: cr.height });
    });
    
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  
  return size;
}

/**
 * Calcule le layout optimal pour la grille vidéo
 */
function calculateOptimalLayout(containerWidth, containerHeight, participantCount) {
  if (participantCount === 0) return { cols: 1, rows: 1, tileWidth: 0, tileHeight: 0 };
  
  const GAP = 16;
  const MIN_TILE_WIDTH = 160; // Minimum pour mobile
  const IDEAL_TILE_WIDTH = 240; // Idéal pour desktop
  const VIDEO_ASPECT_RATIO = 16 / 9;
  const INFO_BAR_HEIGHT = 60; // Hauteur de la barre d'infos sous la vidéo
  
  // Calculer le nombre de colonnes optimal
  let cols = Math.floor((containerWidth + GAP) / (IDEAL_TILE_WIDTH + GAP));
  cols = Math.max(1, Math.min(cols, participantCount));
  
  // S'assurer que la largeur minimale est respectée
  while (cols > 1 && (containerWidth - (cols + 1) * GAP) / cols < MIN_TILE_WIDTH) {
    cols--;
  }
  
  // Calculer la largeur réelle des tuiles
  const tileWidth = Math.floor((containerWidth - (cols + 1) * GAP) / cols);
  
  // Calculer la hauteur de la vidéo basée sur l'aspect ratio
  const videoHeight = Math.floor(tileWidth / VIDEO_ASPECT_RATIO);
  const tileHeight = videoHeight + INFO_BAR_HEIGHT;
  
  // Calculer le nombre de lignes nécessaires
  const rows = Math.ceil(participantCount / cols);
  
  return { cols, rows, tileWidth, tileHeight, gap: GAP };
}

/**
 * Composant de cellule mémoïsé pour éviter les re-renders inutiles
 */
const GridCell = memo(({ participant, style, tileWidth, tileHeight }) => {
  return (
    <div style={style} className="px-2">
      <div style={{ width: tileWidth, height: tileHeight }}>
        <ParticipantTile participant={participant} />
      </div>
    </div>
  );
});

GridCell.displayName = 'GridCell';

/**
 * Grille vidéo virtualisée optimisée pour 1000+ participants
 */
export default function OptimizedVideoGrid() {
  const { participants } = useMeeting();
  const count = participants.length;
  
  // Cas spécial : 2 participants (affichage simple 50/50)
  if (count === 2) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 h-full">
        {participants.map((p) => (
          <div key={p.id} className="h-full">
            <ParticipantTile participant={p} />
          </div>
        ))}
      </div>
    );
  }
  
  // Cas spécial : 1 participant (plein écran)
  if (count === 1) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="w-full max-w-4xl">
          <ParticipantTile participant={participants[0]} />
        </div>
      </div>
    );
  }
  
  // Conteneur avec scroll + mesure de taille
  const parentRef = useRef(null);
  const { width, height } = useElementSize(parentRef);
  
  // Calculer le layout optimal
  const layout = useMemo(() => {
    return calculateOptimalLayout(width || 1, height || 1, count);
  }, [width, height, count]);
  
  const { cols, rows, tileWidth, tileHeight, gap } = layout;
  
  // Virtualizers pour les lignes et colonnes
  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => tileHeight + gap,
    overscan: 3, // Nombre de lignes hors écran à rendre
  });
  
  const colVirtualizer = useVirtualizer({
    count: cols,
    getScrollElement: () => parentRef.current,
    estimateSize: () => tileWidth + gap,
    overscan: 2,
    horizontal: true,
  });
  
  // Fonction pour obtenir le participant à partir des indices
  const getParticipant = (rowIndex, colIndex) => {
    const index = rowIndex * cols + colIndex;
    if (index >= count) return null;
    return participants[index];
  };
  
  const totalWidth = colVirtualizer.getTotalSize();
  const totalHeight = rowVirtualizer.getTotalSize();
  
  return (
    <div
      ref={parentRef}
      className="h-full w-full overflow-auto"
      style={{
        // Améliorer le scrolling sur mobile
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          width: totalWidth,
          height: totalHeight,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((row) =>
          colVirtualizer.getVirtualItems().map((col) => {
            const participant = getParticipant(row.index, col.index);
            if (!participant) return null;
            
            const style = {
              position: 'absolute',
              left: col.start + gap,
              top: row.start + gap,
              width: tileWidth,
              height: tileHeight,
            };
            
            return (
              <GridCell
                key={`${row.index}-${col.index}`}
                participant={participant}
                style={style}
                tileWidth={tileWidth}
                tileHeight={tileHeight}
              />
            );
          })
        )}
      </div>
    </div>
  );
}