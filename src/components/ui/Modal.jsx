import { X } from 'lucide-react'


export default function Modal({ open, title, onClose, children, footer }) {
if (!open) return null
return (
<div className="fixed inset-0 z-50 grid place-items-center p-4">
<div className="absolute inset-0 bg-black/50" onClick={onClose} />
<div className="relative w-full max-w-lg card p-4">
<div className="flex items-center justify-between border-b border-white/10 pb-2">
<h3 className="font-semibold">{title}</h3>
<button onClick={onClose} className="icon-btn"><X className="w-5 h-5"/></button>
</div>
<div className="py-4">{children}</div>
{footer && <div className="pt-3 border-t border-white/10">{footer}</div>}
</div>
</div>
)
}