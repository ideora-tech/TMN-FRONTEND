import axios from 'axios'
import dayjs from 'dayjs'
import { API_ENDPOINTS } from '@/constants/api.constant'
import type { PengajuanKeuanganInfo } from './arusKas.service'

export type StatusPermintaan = 'diajukan' | 'menunggu_approval' | 'disetujui' | 'ditolak' | 'diproses' | 'dipesan' | 'dibeli' | 'diterima_sebagian' | 'diterima' | 'selesai' | 'dibatalkan'
export type TipePermintaan = 'umum' | 'sparepart' | 'aset'
export type JenisItem = 'barang' | 'jasa' | 'sparepart' | 'aset'
export type TahapBukti = 'pengajuan' | 'pembelian' | 'penerimaan'
export type StatusTermin = 'menunggu' | 'ditransfer'

export interface ArmadaTerdaftar {
    id_armada: string
    nopol: string
}

export interface Termin {
    id_termin: string
    urutan: number
    nama: string
    nominal: number
    jatuh_tempo: string | null
    status: StatusTermin
    tanggal_transfer: string | null
    pengajuan: PengajuanKeuanganInfo | null
}

export type TerminPayload = {
    nama: string
    nominal: number
    jatuh_tempo?: string | null
}

export interface PembelianSparepartTertaut {
    id_pembelian: string
    nomor_pengajuan: string
    status: string
}

export interface PermintaanItem {
    id_item: string
    jenis: JenisItem
    id_barang: string | null
    kode_barang: string | null
    nama_barang: string | null
    id_sparepart: string | null
    kode_sparepart: string | null
    nama_sparepart: string | null
    stok_sparepart: number | null
    id_jenis_kendaraan?: string | null
    nama_jenis_kendaraan?: string | null
    merk?: string | null
    model?: string | null
    tahun?: number | null
    armada_terdaftar?: ArmadaTerdaftar[]
    nama_item: string
    spesifikasi: string | null
    qty: number
    satuan: string
    harga_estimasi: number
    harga_aktual: number | null
    subtotal_estimasi: number
    subtotal_aktual: number | null
    qty_diterima: number | null
    keterangan: string | null
}

export interface PermintaanBukti {
    id_bukti: string
    tahap: TahapBukti
    url_file: string
    nama_asli: string
}

export type PrioritasPermintaan = 'normal' | 'urgent'
export type SyaratPembayaran = 'setelah_terima' | 'di_muka'

export interface PermintaanPembelian {
    id_permintaan: string
    nomor_permintaan: string
    tipe: TipePermintaan
    judul: string
    id_judul_permintaan?: string | null
    nama_kategori?: string | null
    prioritas?: PrioritasPermintaan
    metode_pembelian?: string | null
    nama_toko?: string | null
    nama_penalang?: string | null
    syarat_pembayaran?: SyaratPembayaran
    kelebihan_bayar?: number | null
    batas_beli_tunai?: number | null
    alasan: string
    status: StatusPermintaan
    id_pengaju: string
    username_pengaju: string | null
    id_departemen: string | null
    nama_departemen: string | null
    id_supplier: string | null
    nama_supplier: string | null
    id_perawatan: string | null
    nopol_perawatan: string | null
    tanggal_perawatan: string | null
    tanggal_permintaan: string
    tanggal_dibutuhkan: string | null
    tanggal_pembelian: string | null
    nomor_po: string | null
    tanggal_po?: string | null
    sisa_ditutup_pada?: string | null
    alasan_tutup_sisa?: string | null
    penerimaan?: PenerimaanPermintaan[]
    tanggal_diterima: string | null
    keterangan_penerimaan: string | null
    tanggal_pembayaran: string | null
    total_estimasi: number
    subtotal_aktual: number | null
    diskon: number
    ppn_persen: number
    ppn: number
    ongkir: number
    total_aktual: number | null
    alasan_ditolak: string | null
    alasan_batal: string | null
    diproses_pada: string | null
    dibeli_pada: string | null
    dibeli_oleh?: string | null
    diterima_pada: string | null
    items: PermintaanItem[]
    bukti: PermintaanBukti[]
    pengajuan_keuangan?: PengajuanKeuanganInfo | null
    pembayaran_ditolak?: boolean
    pembelian_sparepart?: PembelianSparepartTertaut | null
    termin?: Termin[]
    termin_lunas?: boolean
    boleh_realisasi_mandiri: boolean
    batas_mandiri: number | null
    dibuat_pada: string
}

export interface LaporanPengadaanRingkasan {
    total_estimasi: number
    total_aktual: number
    selisih: number
    jumlah: number
    menunggu_diproses: number
    rata_lead_time_hari: number | null
}

export interface LaporanPengadaanPerBulan { bulan: string; umum: number; sparepart: number; aset: number; total: number; jumlah: number }
export interface LaporanPengadaanPerTipe { tipe: TipePermintaan; label: string; total_aktual: number; jumlah: number }
export interface LaporanPengadaanPerKategori { kategori: string; total_aktual: number }
export interface LaporanPengadaanPerDepartemen { departemen: string; total_aktual: number; jumlah: number }
export interface LaporanPengadaanPerSupplier { supplier: string; total_aktual: number; jumlah: number }
export interface LaporanPengadaanPerArmada { nopol: string; total_aktual: number; jumlah: number }
export interface LaporanPengadaanTanpaArmada { total_aktual: number; jumlah: number }

export interface LaporanPengadaanAset {
    id_permintaan: string
    nomor_permintaan: string
    judul: string
    tanggal_pembelian: string | null
    unit_total: number
    unit_terdaftar: number
    total_aktual: number
    terbayar: number
    sisa: number
    status: StatusPermintaan
}

export interface LaporanPengadaanMenungguLama {
    id_permintaan: string
    nomor_permintaan: string
    judul: string
    tipe: TipePermintaan
    status: StatusPermintaan
    tanggal_permintaan: string
    umur_hari: number
    username_pengaju: string | null
}

export interface LaporanPengadaanLeadTime { tipe: TipePermintaan; label: string; rata_hari: number; jumlah: number }

export interface LaporanPengadaan {
    ringkasan: LaporanPengadaanRingkasan
    per_bulan: LaporanPengadaanPerBulan[]
    per_tipe: LaporanPengadaanPerTipe[]
    per_kategori: LaporanPengadaanPerKategori[]
    per_departemen: LaporanPengadaanPerDepartemen[]
    per_supplier: LaporanPengadaanPerSupplier[]
    per_armada: LaporanPengadaanPerArmada[]
    sparepart_tanpa_armada: LaporanPengadaanTanpaArmada
    aset: LaporanPengadaanAset[]
    menunggu_lama: LaporanPengadaanMenungguLama[]
    lead_time_per_tipe: LaporanPengadaanLeadTime[]
}

export type ItemPayload = {
    jenis: JenisItem
    id_barang?: string | null
    id_sparepart?: string | null
    id_jenis_kendaraan?: string | null
    merk?: string | null
    model?: string | null
    tahun?: number | null
    nama_item: string
    spesifikasi?: string | null
    qty: number
    satuan: string
    harga_estimasi: number
    keterangan?: string | null
}

export type PermintaanPayload = {
    id_judul_permintaan?: string | null
    tipe?: TipePermintaan
    judul?: string
    prioritas?: PrioritasPermintaan
    alasan: string
    id_departemen?: string | null
    id_perawatan?: string | null
    tanggal_permintaan: string
    tanggal_dibutuhkan?: string | null
    items: ItemPayload[]
}

export interface PenerimaanPermintaan {
    id_penerimaan: string
    tanggal_diterima: string
    keterangan: string | null
    diterima_oleh: string | null
    dibuat_pada: string | null
    items: { id_item: string; nama_item: string; satuan: string; qty: number }[]
}

export type BeliTunaiPayload = {
    tanggal_pembelian: string
    id_supplier?: string | null
    nama_toko?: string | null
    nama_penalang: string
    items: { id_item: string; qty_dibeli: number; harga_aktual: number; id_barang?: string | null }[]
    diskon?: number
    ppn_persen?: number
    ongkir?: number
}

export type PesanPayload = {
    id_supplier: string
    tanggal_po: string
    syarat_pembayaran?: SyaratPembayaran
    items: { id_item: string; harga_aktual: number; id_barang?: string | null }[]
    diskon?: number
    ppn_persen?: number
    ongkir?: number
}

export type RealisasiSparepartPayload = {
    tanggal_pembelian: string
    id_supplier?: string | null
    items: { id_item: string; harga_aktual: number }[]
    diskon?: number
    ppn_persen?: number
    ongkir?: number
}

export type DibeliPayload = {
    id_supplier: string
    tanggal_pembelian: string
    items: { id_item: string; harga_aktual: number; id_barang?: string | null }[]
    diskon?: number
    ppn_persen?: number
    ongkir?: number
    termin?: TerminPayload[]
}

type ListMeta = { page: number; total: number; totalPages: number; limit: number; ringkasan: Partial<Record<StatusPermintaan, number>>; pembayaran_ditolak?: number; dibayar_menunggu_barang?: number; lihat_semua?: boolean }

const isiItem = (form: FormData, items: ItemPayload[]) => {
    items.forEach((item, i) => {
        form.append(`items[${i}][jenis]`, item.jenis)
        if (item.id_barang) form.append(`items[${i}][id_barang]`, item.id_barang)
        if (item.id_sparepart) form.append(`items[${i}][id_sparepart]`, item.id_sparepart)
        if (item.id_jenis_kendaraan) form.append(`items[${i}][id_jenis_kendaraan]`, item.id_jenis_kendaraan)
        if (item.merk) form.append(`items[${i}][merk]`, item.merk)
        if (item.model) form.append(`items[${i}][model]`, item.model)
        if (item.tahun !== undefined && item.tahun !== null) form.append(`items[${i}][tahun]`, String(item.tahun))
        form.append(`items[${i}][nama_item]`, item.nama_item)
        if (item.spesifikasi) form.append(`items[${i}][spesifikasi]`, item.spesifikasi)
        form.append(`items[${i}][qty]`, String(item.qty))
        form.append(`items[${i}][satuan]`, item.satuan)
        form.append(`items[${i}][harga_estimasi]`, String(item.harga_estimasi))
        if (item.keterangan) form.append(`items[${i}][keterangan]`, item.keterangan)
    })
}

export const permintaanPembelianService = {
    async list(params?: { page?: number; limit?: number; search?: string; status?: string; tipe?: TipePermintaan | string; id_departemen?: string; prioritas?: string; dari?: string; sampai?: string; milik_saya?: '1'; pembayaran_ditolak?: '1'; menunggu_barang?: '1' }) {
        const { data } = await axios.get(API_ENDPOINTS.PERMINTAAN_PEMBELIAN, { params })
        return data as { data: PermintaanPembelian[]; meta: ListMeta }
    },
    async get(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_DETAIL(id))
        return data.data as PermintaanPembelian
    },
    async create(payload: PermintaanPayload, bukti: File[]) {
        const form = new FormData()
        if (payload.id_judul_permintaan) form.append('id_judul_permintaan', payload.id_judul_permintaan)
        if (payload.tipe) form.append('tipe', payload.tipe)
        if (payload.judul) form.append('judul', payload.judul)
        if (payload.prioritas) form.append('prioritas', payload.prioritas)
        form.append('alasan', payload.alasan)
        if (payload.id_departemen) form.append('id_departemen', payload.id_departemen)
        if (payload.id_perawatan) form.append('id_perawatan', payload.id_perawatan)
        form.append('tanggal_permintaan', payload.tanggal_permintaan)
        if (payload.tanggal_dibutuhkan) form.append('tanggal_dibutuhkan', payload.tanggal_dibutuhkan)
        isiItem(form, payload.items)
        bukti.forEach(f => form.append('bukti[]', f))
        const { data } = await axios.post(API_ENDPOINTS.PERMINTAAN_PEMBELIAN, form)
        return data.data as PermintaanPembelian
    },
    async update(id: string, payload: PermintaanPayload) {
        const { data } = await axios.put(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_DETAIL(id), payload)
        return data.data as PermintaanPembelian
    },
    async remove(id: string) {
        await axios.delete(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_DETAIL(id))
    },
    async proses(id: string) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_PROSES(id))
        return data.data as PermintaanPembelian
    },
    async beliTunai(id: string, payload: BeliTunaiPayload, bukti: File[]) {
        const form = new FormData()
        form.append('_method', 'PATCH')
        form.append('tanggal_pembelian', payload.tanggal_pembelian)
        if (payload.id_supplier) form.append('id_supplier', payload.id_supplier)
        if (payload.nama_toko) form.append('nama_toko', payload.nama_toko)
        form.append('nama_penalang', payload.nama_penalang)
        payload.items.forEach((item, i) => {
            form.append(`items[${i}][id_item]`, item.id_item)
            form.append(`items[${i}][qty_dibeli]`, String(item.qty_dibeli))
            form.append(`items[${i}][harga_aktual]`, String(item.harga_aktual))
            if (item.id_barang) form.append(`items[${i}][id_barang]`, item.id_barang)
        })
        if (payload.diskon) form.append('diskon', String(payload.diskon))
        if (payload.ppn_persen) form.append('ppn_persen', String(payload.ppn_persen))
        if (payload.ongkir) form.append('ongkir', String(payload.ongkir))
        bukti.forEach(f => form.append('bukti[]', f))
        const { data } = await axios.post(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_BELI_TUNAI(id), form)
        return data.data as PermintaanPembelian
    },
    async pesan(id: string, payload: PesanPayload) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_PESAN(id), payload)
        return data.data as PermintaanPembelian
    },
    async dibeli(id: string, payload: DibeliPayload) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_DIBELI(id), payload)
        return data.data as PermintaanPembelian
    },
    async cetakPo(id: string) {
        const res = await axios.get(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_PO_PDF(id), { responseType: 'blob' })
        return res.data as Blob
    },
    async terima(id: string, payload: { tanggal_diterima: string; keterangan?: string; items: { id_item: string; qty_diterima: number; qty_sebelumnya?: number }[] }) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_TERIMA(id), payload)
        return data.data as PermintaanPembelian
    },
    async tutupSisa(id: string, payload: { alasan: string; diskon?: number; ongkir?: number; jumlah_diterima?: number }) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_TUTUP_SISA(id), payload)
        return data.data as PermintaanPembelian
    },
    async ajukanUlangPembayaran(id: string, payload: { catatan: string; id_termin?: string; versi_pengajuan?: string; items?: { id_item: string; harga_aktual: number }[]; diskon?: number; ppn_persen?: number; ongkir?: number }) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_AJUKAN_ULANG_PEMBAYARAN(id), payload)
        return data.data as PermintaanPembelian
    },
    async batal(id: string, alasan: string) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_BATAL(id), { alasan })
        return data.data as PermintaanPembelian
    },
    async uploadBukti(id: string, files: File[], tahap: TahapBukti) {
        const form = new FormData()
        form.append('tahap', tahap)
        files.forEach(f => form.append('bukti[]', f))
        const { data } = await axios.post(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_BUKTI(id), form)
        return data.data as PermintaanPembelian
    },
    async hapusBukti(id: string, idBukti: string) {
        const { data } = await axios.delete(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_BUKTI_DETAIL(id, idBukti))
        return data.data as PermintaanPembelian
    },
    async infoPengajuan(id: string) {
        const { data } = await axios.get(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_PENGAJUAN(id))
        return data.data as PengajuanKeuanganInfo | null
    },
    async realisasiSparepart(id: string, payload: RealisasiSparepartPayload) {
        const { data } = await axios.patch(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_REALISASI_SPAREPART(id), payload)
        return data.data as PermintaanPembelian
    },
    async laporan(params?: { dari?: string; sampai?: string; tipe?: string }) {
        const { data } = await axios.get(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_LAPORAN, { params })
        return data.data as LaporanPengadaan
    },
    async exportLaporan(format: 'excel' | 'pdf', params?: { dari?: string; sampai?: string; tipe?: string }) {
        const res = await axios.get(API_ENDPOINTS.PERMINTAAN_PEMBELIAN_LAPORAN_EXPORT(format), { responseType: 'blob', params })
        const ekstensi = format === 'excel' ? 'xlsx' : 'pdf'
        const href = URL.createObjectURL(res.data)
        const link = document.createElement('a')
        link.href = href
        link.download = `laporan-pengadaan-${dayjs().format('YYYYMMDD')}.${ekstensi}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
    },
}
