import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface Project {
    id_proyek: string
    id_klien: string
    kode_proyek: string
    nama_proyek: string
    tanggal_mulai?: string
    tanggal_selesai?: string
    status: 'draft' | 'aktif' | 'selesai' | 'batal'
    keterangan?: string
}

export const projectService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.PROYEK, { params: { page, limit: 15 } })
        return data as { data: Project[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async listByKlien(idKlien: string, page = 1, limit = 50) {
        const { data } = await axios.get(API_ENDPOINTS.PROYEK, { params: { id_klien: idKlien, page, limit } })
        return data as { data: Project[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PROYEK_DETAIL(id))
        return data.data as Project
    },
    async create(payload: Omit<Project, 'id_proyek' | 'status'> & { status?: string }) {
        const { data } = await axios.post(API_ENDPOINTS.PROYEK, payload)
        return data.data as Project
    },
    async update(id: string, payload: Partial<Project>) {
        const { data } = await axios.put(API_ENDPOINTS.PROYEK_DETAIL(id), payload)
        return data.data as Project
    },
    async updateStatus(id: string, status: string) {
        const { data } = await axios.patch(API_ENDPOINTS.PROYEK_STATUS(id), { status })
        return data.data as Project
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.PROYEK_DETAIL(id))
    },
}
