import { createContext, useContext, useMemo, useState } from 'react'


// keys: 'chat' | 'participants' | 'invite' | 'av' | 'recording' | null
const SidePanelContext = createContext(null)


export function SidePanelProvider({ children }) {
const [panel, setPanel] = useState(null)
const open = (key) => setPanel(key)
const close = () => setPanel(null)
const toggle = (key) => setPanel(p => (p === key ? null : key))


const value = useMemo(() => ({ panel, open, close, toggle }), [panel])
return <SidePanelContext.Provider value={value}>{children}</SidePanelContext.Provider>
}


export const useSidePanel = () => useContext(SidePanelContext)