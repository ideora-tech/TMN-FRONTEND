import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { penugasanService, Penugasan, StatusPenugasan } from '@/services/penugasan.service'

export type TipeUnitBoard = 'internal' | 'vendor'

export interface BoardUnit {
    tipe: TipeUnitBoard
    id_armada?: string
    id_armada_vendor?: string
    nopol: string
    nama_jenis?: string | null
    nama_vendor?: string | null
    id_supir_default?: string | null
    nama_supir_default?: string | null
}

export interface BoardAssignmentTrip {
    id_trip: string
    status: 'berjalan' | 'selesai'
}

export interface BoardAssignment {
    id_penugasan: string
    tanggal: string
    id_armada?: string | null
    id_armada_vendor?: string | null
    id_supir: string | null
    nama_supir: string | null
    id_proyek: string
    kode_proyek: string | null
    id_rute: string | null
    nama_rute: string | null
    estimasi_biaya: number | null
    id_pengajuan: string | null
    status: StatusPenugasan
    trips: BoardAssignmentTrip[]
}

export interface BoardData {
    units: BoardUnit[]
    assignments: BoardAssignment[]
}

export interface AssignHarianPayload {
    tanggal: string
    tanggal_sampai?: string | null
    id_armada?: string
    id_armada_vendor?: string
    id_supir: string
    id_proyek: string
    id_rute: string
    uang_jalan?: number | null
    titik_drop?: string[]
}

export interface AssignHarianGagal {
    tanggal: string
    alasan: string
}

export interface AssignHarianHasil {
    sukses: number
    gagal: AssignHarianGagal[]
    peringatan: string[]
    penugasan: Penugasan[]
}

export const penugasanHarianService = {
    async board(dari: string, sampai: string) {
        const { data } = await axios.get(API_ENDPOINTS.PENUGASAN_BOARD, { params: { dari, sampai } })
        return data.data as BoardData
    },
    async assign(payload: AssignHarianPayload) {
        const { data } = await axios.post(API_ENDPOINTS.PENUGASAN_HARIAN, payload)
        return data.data as AssignHarianHasil
    },
    async hapus(idPenugasan: string) {
        await penugasanService.delete(idPenugasan)
    },
    async update(idPenugasan: string, payload: Parameters<typeof penugasanService.update>[1]) {
        return penugasanService.update(idPenugasan, payload)
    },
}
