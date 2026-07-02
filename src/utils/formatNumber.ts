export function formatRupiah(value: number): string {
    return 'Rp ' + Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatNum(value: number, decimals = 0): string {
    return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
