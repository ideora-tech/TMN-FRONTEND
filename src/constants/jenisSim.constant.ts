export const JENIS_SIM = ['A', 'A Umum', 'B1', 'B1 Umum', 'B2', 'B2 Umum'] as const

export function opsiJenisSim(nilaiSekarang?: string | null): { value: string; label: string }[] {
    const opsi: { value: string; label: string }[] = JENIS_SIM.map(j => ({ value: j, label: j }))
    if (nilaiSekarang && !opsi.some(o => o.value === nilaiSekarang)) {
        opsi.push({ value: nilaiSekarang, label: `${nilaiSekarang} (golongan lama — ganti ke golongan baru)` })
    }
    return opsi
}
