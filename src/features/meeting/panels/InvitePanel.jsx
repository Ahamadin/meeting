export default function InvitePanel() {
  const copy = async () => {
    await navigator.clipboard.writeText(location.href)
    alert('Lien de réunion copié !')
  }
  return (
    <div className="grid gap-3">
      <p>Partagez ce lien pour inviter des utilisateurs à la réunion.</p>
      <input readOnly value={location.href} className="p-3 rounded-xl bg-white/10 outline-none"/>
      <button className="btn btn-solid" onClick={copy}>Copier le lien</button>
    </div>
  )
}
