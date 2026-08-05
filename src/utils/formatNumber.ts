export function formatRupiah(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return '-'
    return 'Rp ' + Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatNum(value: number | null | undefined, decimals = 0): string {
    if (value == null || Number.isNaN(value)) return '-'
    return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
