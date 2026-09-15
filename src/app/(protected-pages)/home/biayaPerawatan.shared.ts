import type { StatusPerawatan, SumberRekapSparepart } from '@/services/perawatanArmada.service'

export const STATUS_PERAWATAN: Record<StatusPerawatan, { label: string; className: string }> = {
    terjadwal:    { label: 'Direncanakan', className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100' },
    dalam_proses: { label: 'Dalam Proses', className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100' },
    selesai:      { label: 'Selesai',      className: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100' },
    dibatalkan:   { label: 'Dibatalkan',   className: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-300' },
}

export const SUMBER_SPAREPART: Record<SumberRekapSparepart, { label: string; className: string }> = {
    bengkel:      { label: 'Pembelian Langsung', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
    stok_sendiri: { label: 'Stok Sendiri',       className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100' },
    campuran:     { label: 'Campuran',           className: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300' },
}

export const TH_KIRI  = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'
export const TH_KANAN = 'py-2.5 px-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

export const formatRupiahRingkas = (nilai: number): string => {
    const abs = Math.abs(nilai)
    if (abs >= 1_000_000_000) return `Rp ${(nilai / 1_000_000_000).toFixed(1).replace('.', ',')} M`
    if (abs >= 1_000_000) return `Rp ${(nilai / 1_000_000).toFixed(1).replace('.', ',')} jt`
    if (abs >= 1_000) return `Rp ${Math.round(nilai / 1_000)} rb`
    return `Rp ${Math.round(nilai)}`
}
