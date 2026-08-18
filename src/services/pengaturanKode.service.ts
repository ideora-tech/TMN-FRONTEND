import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type EntitasKode = 'proyek' | 'rute' | 'penawaran'
export type ResetKode = 'tidak' | 'bulanan' | 'tahunan'

export interface PengaturanKode {
    entitas: EntitasKode
    prefix: string
    panjang_digit: number
    reset: ResetKode
    tersimpan: boolean
}

export interface PengaturanKodePayload {
    prefix: string
    panjang_digit: number
    reset: ResetKode
}

export const pengaturanKodeService = {
    async list() {
        const { data } = await axios.get(API_ENDPOINTS.PENGATURAN_KODE)
        return data.data as PengaturanKode[]
    },
    async update(entitas: EntitasKode, payload: PengaturanKodePayload) {
        const { data } = await axios.put(API_ENDPOINTS.PENGATURAN_KODE_UPDATE(entitas), payload)
        return data.data as PengaturanKode
    },
}
