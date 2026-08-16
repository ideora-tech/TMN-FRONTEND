import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import type { PengajuanKeuanganInfo } from './arusKas.service'

export interface PengaturanPayroll {
    tanggal_mulai_cutoff: number
    hari_kerja_per_bulan: number
    persen_bpjs_kesehatan: number
    persen_bpjs_jht: number
    persen_bpjs_jp: number
    plafon_gaji_bpjs_kesehatan: number
    ptkp_dasar: number
    ptkp_tambahan: number
}

export interface PayrollPeriode {
    id_periode: string
    nama: string
    tanggal_mulai: string
    tanggal_selesai: string
    status: 'draft' | 'final'
    difinalisasi_pada: string | null
    jumlah_slip?: number
    total_gaji_bersih?: number
}

export interface PayrollSlip {
    id_slip: string
    id_periode: string
    id_karyawan: string
    karyawan_nik: string
    nama_karyawan: string
    proyek: string | null
    tipe_truck: string | null
    absen_masuk: string | null
    gaji_pokok: number
    upah_lembur: number
    menit_lembur: number
    tunjangan_lain: number
    keterangan_tunjangan: string | null
    uang_makan: number
    uang_makan_mingguan: number
    kasbon: number
    uang_jalan_terpakai: number
    tilangan: number
    jumlah_alpha: number
    potongan_absen: number
    potongan_bpjs_kesehatan: number
    potongan_bpjs_tk: number
    pph21: number
    potongan_lain: number
    keterangan_potongan: string | null
    total_bruto: number
    total_potongan: number
    gaji_bersih: number
    catatan: string | null
}

export interface ImportGagalPayroll {
    baris: number
    nama: string
    alasan: string
}

export interface ImportResultPayroll {
    berhasil: number
    gagal: ImportGagalPayroll[]
}

export interface RingkasanPayroll {
    jumlah_slip: number
    total_bruto: number
    total_potongan: number
    total_gaji_bersih: number
}

export const payrollService = {
    async getPengaturan() {
        const { data } = await axios.get(API_ENDPOINTS.PAYROLL_PENGATURAN)
        return data.data as PengaturanPayroll
    },
    async simpanPengaturan(payload: PengaturanPayroll) {
        const { data } = await axios.put(API_ENDPOINTS.PAYROLL_PENGATURAN, payload)
        return data.data as PengaturanPayroll
    },
    async previewRentang(bulan: string) {
        const { data } = await axios.get(API_ENDPOINTS.PAYROLL_PREVIEW_RENTANG, { params: { bulan } })
        return data.data as { tanggal_mulai: string; tanggal_selesai: string; nama: string }
    },
    async listPeriode(params: { page?: number; limit?: number; search?: string; status?: string } = {}) {
        const { data } = await axios.get(API_ENDPOINTS.PAYROLL_PERIODE, { params: { page: 1, limit: 10, ...params } })
        return data as { data: PayrollPeriode[]; meta: { page: number; total: number; totalPages: number; limit: number } }
    },
    async buatPeriode(bulan: string) {
        const { data } = await axios.post(API_ENDPOINTS.PAYROLL_PERIODE, { bulan })
        return data.data as PayrollPeriode
    },
    async detailPeriode(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PAYROLL_PERIODE_DETAIL(id))
        return data.data as { periode: PayrollPeriode; ringkasan: RingkasanPayroll; slips: PayrollSlip[] }
    },
    async hapusPeriode(id: string) {
        await axios.delete(API_ENDPOINTS.PAYROLL_PERIODE_DETAIL(id))
    },
    async generate(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.PAYROLL_GENERATE(id))
        return data.data as { dibuat: number }
    },
    async finalisasi(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.PAYROLL_FINALISASI(id))
        return data.data as PayrollPeriode
    },
    async batalFinalisasi(id: string) {
        const { data } = await axios.post(API_ENDPOINTS.PAYROLL_BATAL_FINALISASI(id))
        return data.data as PayrollPeriode
    },
    async infoPengajuan(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PAYROLL_PENGAJUAN(id))
        return data.data as PengajuanKeuanganInfo | null
    },
    async importExcel(id: string, file: File) {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await axios.post(API_ENDPOINTS.PAYROLL_IMPORT(id), fd)
        return data.data as ImportResultPayroll
    },
    async updateSlip(id: string, payload: Partial<{
        tunjangan_lain: number
        keterangan_tunjangan: string | null
        uang_makan: number
        uang_makan_mingguan: number
        kasbon: number
        uang_jalan_terpakai: number
        tilangan: number
        potongan_lain: number
        keterangan_potongan: string | null
        pph21: number
        catatan: string | null
    }>) {
        const { data } = await axios.put(API_ENDPOINTS.PAYROLL_SLIP(id), payload)
        return data.data as PayrollSlip
    },
}
