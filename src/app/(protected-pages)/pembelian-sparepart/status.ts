export const STATUS_LABEL: Record<string, string> = {
    diajukan:          'Diajukan',
    disetujui_manager: 'Disetujui Manager',
    disetujui_finance: 'Disetujui Finance',
    ditolak:           'Ditolak',
    dibeli:            'Dibeli',
    lunas:             'Lunas',
}

export const STATUS_TAG: Record<string, string> = {
    diajukan:          'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    disetujui_manager: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    disetujui_finance: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-100',
    ditolak:           'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
    dibeli:            'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-100',
    lunas:             'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
}

export function bolehDiubahAtauDihapus(status: string, idPerawatan: string | null | undefined): boolean {
    return status === 'diajukan' || (status === 'disetujui_finance' && !!idPerawatan)
}
