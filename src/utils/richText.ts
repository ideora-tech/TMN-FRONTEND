const POLA_TAG = /<\/?[a-z][^>]*>/i

const escapeHtml = (teks: string) =>
    teks.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const kontenKeHtml = (konten?: string | null): string => {
    const teks = (konten ?? '').trim()
    if (!teks) return ''
    if (POLA_TAG.test(teks)) return teks
    return teks
        .split(/\r?\n/)
        .map(baris => `<p>${escapeHtml(baris)}</p>`)
        .join('')
}
