// src/features/meeting/components/SidePanelContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const SidePanelCtx = createContext(null);

export function SidePanelProvider({ children }) {
  const [panel, setPanel] = useState(null);

  const open   = useCallback((name) => setPanel(name), []);
  const close  = useCallback(() => setPanel(null), []);
  const toggle = useCallback((name) => setPanel(prev => prev === name ? null : name), []);

  return (
    <SidePanelCtx.Provider value={{ panel, open, close, toggle }}>
      {children}
    </SidePanelCtx.Provider>
  );
}

export function useSidePanel() {
  const ctx = useContext(SidePanelCtx);
  if (!ctx) throw new Error('useSidePanel must be inside SidePanelProvider');
  return ctx;
}
