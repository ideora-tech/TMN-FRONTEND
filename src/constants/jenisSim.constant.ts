export const JENIS_SIM = [
    { value: 'A',       keterangan: 'Mobil pribadi & barang perseorangan ≤ 3.500 kg' },
    { value: 'A Umum',  keterangan: 'Mobil penumpang/barang umum ≤ 3.500 kg' },
    { value: 'B1',      keterangan: 'Mobil penumpang & barang perseorangan > 3.500 kg' },
    { value: 'B1 Umum', keterangan: 'Mobil penumpang & barang umum > 3.500 kg' },
    { value: 'B2',      keterangan: 'Alat berat, penarik, truk gandeng/trailer perseorangan' },
    { value: 'B2 Umum', keterangan: 'Penarik / truk gandeng umum' },
] as const

export function opsiJenisSim(nilaiSekarang?: string | null): { value: string; label: string }[] {
    const opsi: { value: string; label: string }[] = JENIS_SIM.map(j => ({ value: j.value, label: `${j.value} — ${j.keterangan}` }))
    if (nilaiSekarang && !opsi.some(o => o.value === nilaiSekarang)) {
        opsi.push({ value: nilaiSekarang, label: `${nilaiSekarang} (golongan lama — ganti ke golongan baru)` })
    }
    return opsi
}
