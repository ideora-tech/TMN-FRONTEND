import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface DokumenVendor {
    id_dokumen_vendor: string
    id_vendor: string
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

export const dokumenVendorService = {
    async list(idVendor: string) {
        const { data } = await axios.get(API_ENDPOINTS.VENDOR_DOKUMEN(idVendor))
        return data.data as DokumenVendor[]
    },

    async create(idVendor: string, payload: DocPayload, file?: File | null) {
        const body = file ? buildFormData(payload, file) : payload
        const { data } = await axios.post(API_ENDPOINTS.VENDOR_DOKUMEN(idVendor), body)
        return data.data as DokumenVendor
    },

    async update(idVendor: string, id: string, payload: Partial<DocPayload>, file?: File | null) {
        if (file) {
            const fd = buildFormData({ jenis_dokumen: payload.jenis_dokumen ?? '', ...payload }, file)
            fd.append('_method', 'PUT')
            const { data } = await axios.post(API_ENDPOINTS.VENDOR_DOKUMEN_UPDATE(idVendor, id), fd)
            return data.data as DokumenVendor
        }
        const { data } = await axios.put(API_ENDPOINTS.VENDOR_DOKUMEN_UPDATE(idVendor, id), payload)
        return data.data as DokumenVendor
    },

    async delete(idVendor: string, id: string) {
        await axios.delete(API_ENDPOINTS.VENDOR_DOKUMEN_DELETE(idVendor, id))
    },
}
