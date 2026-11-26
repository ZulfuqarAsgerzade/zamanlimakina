/** Open a native <dialog> modally; falls back to the `open` attribute where showModal is unavailable (old browsers, jsdom). */
export function openDialog(d: HTMLDialogElement): void {
  if (d.open) return
  if (typeof d.showModal === 'function') d.showModal()
  else d.setAttribute('open', '')
}
export function closeDialog(d: HTMLDialogElement): void {
  if (!d.open) return
  if (typeof d.close === 'function') d.close()
  else d.removeAttribute('open')
}
