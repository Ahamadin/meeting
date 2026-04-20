import { useEffect, useRef, useState } from 'react'


export default function Popover({ button, children }) {
const [open, setOpen] = useState(false)
const ref = useRef(null)
useEffect(() => {
const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
document.addEventListener('click', onDoc)
return () => document.removeEventListener('click', onDoc)
}, [])
return (
<div className="relative" ref={ref}>
<div onClick={() => setOpen(o=>!o)}>{button}</div>
{open && (
<div className="absolute mt-2 right-0 min-w-[220px] card p-2">
{children}
</div>
)}
</div>
)
}