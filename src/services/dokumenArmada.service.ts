import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface DokumenArmada {
    id_dokumen_armada: string
    id_armada: string
    jenis_dokumen: string
    nomor: string | null
    berlaku_sampai: string | null
    url_file: string | null
    dibuat_pada: string
}

type DocPayload = {
    jenis_dokumen: string
    nomor?: string | null
    berlaku_sampai?: string | null
    url_file?: string | null
}

function buildFormData(payload: DocPayload, file: File): FormData {
    const fd = new FormData()
    fd.append('jenis_dokumen', payload.jenis_dokumen)
    if (payload.nomor) fd.append('nomor', payload.nomor)
    if (payload.berlaku_sampai) fd.append('berlaku_sampai', payload.berlaku_sampai)
    fd.append('file', file)
    return fd
}

export const dokumenArmadaService = {
    async list(idArmada: string) {
        const { data } = await axios.get(API_ENDPOINTS.ARMADA_DOKUMEN(idArmada))
        return data.data as DokumenArmada[]
    },

    async create(idArmada: string, payload: DocPayload, file?: File | null) {
        const body = file ? buildFormData(payload, file) : payload
        const { data } = await axios.post(API_ENDPOINTS.ARMADA_DOKUMEN(idArmada), body)
        return data.data as DokumenArmada
    },

    async update(idArmada: string, id: string, payload: Partial<DocPayload>, file?: File | null) {
        const body = file ? buildFormData({ jenis_dokumen: payload.jenis_dokumen ?? '', ...payload }, file) : payload
        const { data } = await axios.put(API_ENDPOINTS.ARMADA_DOKUMEN_UPDATE(idArmada, id), body)
        return data.data as DokumenArmada
    },

    async delete(idArmada: string, id: string) {
        await axios.delete(API_ENDPOINTS.ARMADA_DOKUMEN_DELETE(idArmada, id))
    },
}
