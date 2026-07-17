import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Armada {
    id_armada: string
    nopol: string
    merk: string
    model?: string
    tahun: number
    status: string
    aktif?: boolean
    id_jenis_kendaraan?: string
    nomor_rangka?: string | null
    nomor_mesin?: string | null
    warna?: string | null
    jenis_bahan_bakar?: string | null
    kapasitas_muatan_kg?: number | null
    tanggal_beli?: string | null
    harga_beli?: number | null
    kondisi_beli?: string | null
    url_foto?: string | null
    keterangan?: string | null
}

export type ArmadaPayload = Partial<Omit<Armada, 'id_armada' | 'url_foto'>>

function buildFormData(payload: ArmadaPayload, foto: File): FormData {
    const fd = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined) return
        if (typeof value === 'boolean') {
            fd.append(key, value ? '1' : '0')
            return
        }
        fd.append(key, value === null ? '' : String(value))
    })
    fd.append('foto', foto)
    return fd
}

export const armadaService = {
    async list(page = 1, limit = 15) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA, { params: { page, limit } })
        return data as { data: Armada[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_DETAIL(id))
        return data.data as Armada
    },
    async create(payload: ArmadaPayload, foto?: File | null) {
        const body = foto ? buildFormData(payload, foto) : payload
        const { data } = await axios.post(API_ENDPOINTS.ARMADA, body)
        return data.data as Armada
    },
    async update(id: string, payload: ArmadaPayload, foto?: File | null) {
        if (foto) {
            const fd = buildFormData(payload, foto)
            fd.append('_method', 'PUT')
            const { data } = await axios.post(API_ENDPOINTS.ARMADA_DETAIL(id), fd)
            return data.data as Armada
        }
        const { data } = await axios.put(API_ENDPOINTS.ARMADA_DETAIL(id), payload)
        return data.data as Armada
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.ARMADA_DETAIL(id))
    },
}
