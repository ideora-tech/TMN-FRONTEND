// MySQL mengembalikan kolom DECIMAL sebagai string (mis. "755000.00") bila backend lupa cast (float).
// Semua formatter menerima angka maupun string numerik supaya satu field lupa-cast tidak menjatuhkan halaman.
function keAngka(value: number | string | null | undefined): number | null {
    if (value == null || value === '') return null
    const n = typeof value === 'number' ? value : Number(value)
    return Number.isNaN(n) ? null : n
}

export function formatRupiah(value: number | string | null | undefined): string {
    const n = keAngka(value)
    if (n == null) return '-'
    return 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatNum(value: number | string | null | undefined, decimals = 0): string {
    const n = keAngka(value)
    if (n == null) return '-'
    return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
