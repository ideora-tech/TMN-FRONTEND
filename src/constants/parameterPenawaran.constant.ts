export const PARAMETER_PENAWARAN = [
    { kolom: 'biaya_overnight', label: 'Overnight', satuan: 'per malam' },
    { kolom: 'biaya_cancellation', label: 'Cancellation', satuan: 'per trip' },
    { kolom: 'biaya_add_drop', label: 'Add Drop', satuan: 'per titik tambahan' },
    { kolom: 'biaya_cross_cluster', label: 'Cross Cluster', satuan: 'per trip' },
] as const

export type KolomParameterPenawaran = typeof PARAMETER_PENAWARAN[number]['kolom']

export type NilaiParameterPenawaran = Record<KolomParameterPenawaran, number | null>

export type IsianParameterPenawaran = Record<KolomParameterPenawaran, string>

export interface ParameterPenawaranTerisi {
    kolom: KolomParameterPenawaran
    label: string
    satuan: string
    nilai: number
}

export const isianParameterDari = (sumber?: Partial<NilaiParameterPenawaran> | null): IsianParameterPenawaran =>
    Object.fromEntries(PARAMETER_PENAWARAN.map(p => {
        const nilai = sumber?.[p.kolom]
        return [p.kolom, nilai != null ? String(Math.round(nilai)) : '']
    })) as IsianParameterPenawaran

export const payloadParameterDari = (isian: IsianParameterPenawaran): NilaiParameterPenawaran =>
    Object.fromEntries(PARAMETER_PENAWARAN.map(p => [p.kolom, isian[p.kolom] !== '' ? Number(isian[p.kolom]) : null])) as NilaiParameterPenawaran

export const parameterTerisiDari = (sumber?: Partial<NilaiParameterPenawaran> | null): ParameterPenawaranTerisi[] =>
    PARAMETER_PENAWARAN
        .filter(p => sumber?.[p.kolom] != null)
        .map(p => ({ kolom: p.kolom, label: p.label, satuan: p.satuan, nilai: Number(sumber![p.kolom]) }))
