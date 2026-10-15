import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import type { RincianKomponenUangJalan } from '@/services/komponenUangJalan.service'

export interface ProyekRute {
    id_proyek_rute: string
    id_proyek: string
    id_rute: string
    kode_rute: string | null
    nama_rute: string | null
    asal: string | null
    tujuan: string | null
    id_jenis_kendaraan: string | null
    nama_jenis: string | null
    harga_penawaran: number | null
    estimasi_ritase: number
    subtotal: number | null
    uang_jalan: number | null
    komponen_uang_jalan: RincianKomponenUangJalan[]
    estimasi_biaya: number | null
    keterangan: string | null
    dibuat_pada: string
    diubah_pada: string | null
}

export interface ProyekRutePayload {
    id_rute: string
    id_jenis_kendaraan?: string | null
    harga_penawaran?: number | null
    estimasi_ritase?: number
    uang_jalan?: number | null
    komponen_uang_jalan?: { id_komponen_uang_jalan: string; nominal: number }[]
    keterangan?: string | null
}

export const proyekRuteService = {
    list: (idProyek: string): Promise<ProyekRute[]> =>
        axios.get(API_ENDPOINTS.PROYEK_RUTE(idProyek)).then(r => r.data?.data ?? []),

    create: (idProyek: string, payload: ProyekRutePayload): Promise<ProyekRute> =>
        axios.post(API_ENDPOINTS.PROYEK_RUTE(idProyek), payload).then(r => r.data?.data),

    update: (idProyek: string, id: string, payload: Partial<ProyekRutePayload>): Promise<ProyekRute> =>
        axios.put(API_ENDPOINTS.PROYEK_RUTE_DETAIL(idProyek, id), payload).then(r => r.data?.data),

    delete: (idProyek: string, id: string): Promise<void> =>
        axios.delete(API_ENDPOINTS.PROYEK_RUTE_DETAIL(idProyek, id)).then(() => undefined),
}
