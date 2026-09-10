export type Option = { value: string; label: string }

export const MAX_FILE_SIZE = 5 * 1024 * 1024

export const JENIS_DOKUMEN_OPTIONS: Option[] = [
    { value: 'STNK',     label: 'STNK' },
    { value: 'KIR',      label: 'KIR' },
    { value: 'Asuransi', label: 'Asuransi' },
    { value: 'BPKB',     label: 'BPKB' },
    { value: 'Pajak',    label: 'Pajak Kendaraan' },
    { value: 'Lainnya',  label: 'Lainnya' },
]

export const JENIS_BOLEH_GANDA = ['Lainnya']

export const labelJenisDokumen = (jenis: string) =>
    JENIS_DOKUMEN_OPTIONS.find(o => o.value === jenis)?.label ?? jenis

export function getExpiryInfo(berlakuSampai: string | null): { label: string; className: string } {
    if (!berlakuSampai) return { label: '—', className: 'bg-gray-100 text-gray-400' }
    const days = Math.ceil((new Date(berlakuSampai).getTime() - Date.now()) / 86400000)
    if (days < 0)   return { label: 'Habis Masa Berlaku', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    if (days <= 14) return { label: `${days} hari lagi`, className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    if (days <= 30) return { label: `${days} hari lagi`, className: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' }
    if (days <= 60) return { label: `${days} hari lagi`, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' }
    return { label: `${days} hari lagi`, className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' }
}

export const ukuranFileTerlaluBesar = (f: File) => f.size > MAX_FILE_SIZE

export const pesanFileTerlaluBesar = (f: File) =>
    `Ukuran file maksimal 5 MB (file dipilih: ${(f.size / 1024 / 1024).toFixed(1)} MB)`
