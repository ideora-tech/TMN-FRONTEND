import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface MenuItem {
    id_menu: string
    nama_menu: string
    path: string | null
    id_menu_induk: string | null
    icon: string | null
    urutan: number
    aktif: boolean
    children?: MenuItem[]
    dibuat_pada: string
    diubah_pada: string
}

export const menuService = {
    async list(page = 1) {
        const { data } = await axios.get(API_ENDPOINTS.MENU, { params: { page, limit: 50 } })
        return data as { data: MenuItem[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async tree() {
        const { data } = await axios.get(API_ENDPOINTS.MENU_TREE)
        return data.data as MenuItem[]
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.MENU_DETAIL(id))
        return data.data as MenuItem
    },
    async create(payload: Omit<MenuItem, 'id_menu' | 'children' | 'dibuat_pada' | 'diubah_pada'>) {
        const { data } = await axios.post(API_ENDPOINTS.MENU, payload)
        return data.data as MenuItem
    },
    async update(id: string, payload: Partial<Omit<MenuItem, 'id_menu' | 'children' | 'dibuat_pada' | 'diubah_pada'>>) {
        const { data } = await axios.put(API_ENDPOINTS.MENU_DETAIL(id), payload)
        return data.data as MenuItem
    },
    async delete(id: string) {
        await axios.delete(API_ENDPOINTS.MENU_DETAIL(id))
    },
}
