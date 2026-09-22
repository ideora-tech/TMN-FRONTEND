export type TipeHarga = 'per_rit' | 'borongan' | 'unit_only' | 'unit_driver' | 'all_in'

export const TIPE_HARGA_OPTIONS: { value: TipeHarga; label: string }[] = [
    { value: 'per_rit', label: 'On Call' },
    { value: 'borongan', label: 'Dedicate' },
    { value: 'unit_only', label: 'Unit Only' },
    { value: 'unit_driver', label: 'Unit + Driver' },
    { value: 'all_in', label: 'All In' },
]

export const TIPE_HARGA_LABEL: Record<string, string> = Object.fromEntries(
    TIPE_HARGA_OPTIONS.map(o => [o.value, o.label]),
)

const TIPE_HARGA_NILAI_TETAP: TipeHarga[] = ['borongan', 'unit_only', 'unit_driver', 'all_in']

export const tipeHargaNilaiTetap = (tipe?: string | null) => TIPE_HARGA_NILAI_TETAP.includes(tipe as TipeHarga)

export const tipeHargaPerRit = (tipe?: string | null) => !tipeHargaNilaiTetap(tipe)

export const labelTipeHarga = (tipe?: string | null) => TIPE_HARGA_LABEL[tipe ?? 'per_rit'] ?? tipe ?? ''
