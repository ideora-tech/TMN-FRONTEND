import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface MenuAkses {
    id_menu: string
    nama_menu: string
    path: string | null
    id_menu_induk: string | null
    urutan: number
    aktif: boolean
    kode_peran: string[]
}

export const aksesMenuService = {
    async list() {
        const { data } = await axios.get(API_ENDPOINTS.MENU_AKSES_PERAN)
        return data.data as MenuAkses[]
    },
    async simpan(kodePeran: string, idMenu: string[]) {
        await axios.put(API_ENDPOINTS.MENU_AKSES_PERAN_SIMPAN(kodePeran), { id_menu: idMenu })
    },
}
