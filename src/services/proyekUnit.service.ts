import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type SumberUnitProyek = 'internal' | 'vendor'

export interface OpsiUnitProyek {
    sumber: SumberUnitProyek
    id_armada: string | null
    id_armada_vendor: string | null
    nopol: string | null
    merk: string | null
    nama_jenis: string | null
    nama_vendor: string | null
    nama_supir: string | null
}

export interface UnitProyek extends OpsiUnitProyek {
    id_proyek_unit: string
}

export type UnitProyekPayload = {
    sumber: SumberUnitProyek
    id_armada?: string
    id_armada_vendor?: string
}

export const proyekUnitService = {
    list: (idProyek: string): Promise<UnitProyek[]> =>
        axios.get(API_ENDPOINTS.PROYEK_UNIT(idProyek)).then(r => r.data?.data ?? []),

    opsi: (idProyek: string): Promise<OpsiUnitProyek[]> =>
        axios.get(API_ENDPOINTS.PROYEK_UNIT_OPSI(idProyek)).then(r => r.data?.data ?? []),

    tambah: (idProyek: string, unit: UnitProyekPayload[]): Promise<UnitProyek[]> =>
        axios.post(API_ENDPOINTS.PROYEK_UNIT(idProyek), { unit }).then(r => r.data?.data ?? []),

    hapus: (idProyek: string, id: string): Promise<void> =>
        axios.delete(API_ENDPOINTS.PROYEK_UNIT_DETAIL(idProyek, id)).then(() => undefined),

    hapusMassal: (idProyek: string, ids: string[]): Promise<number> =>
        axios.delete(API_ENDPOINTS.PROYEK_UNIT(idProyek), { data: { ids } }).then(r => r.data?.data?.dihapus ?? 0),
}
