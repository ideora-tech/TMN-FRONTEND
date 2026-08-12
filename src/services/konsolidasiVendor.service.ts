import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export interface KonsolidasiKontrak {
    id_kontrak_vendor: string
    mekanisme: string
    rate: number | null
    satuan: string | null
    nilai_kontrak: number
    jumlah_rit: number
    nilai_seharusnya: number | null
}

export interface KonsolidasiTrip {
    id_trip: string
    tanggal: string
    nopol: string | null
    supir_nama: string | null
    rute: string | null
    jarak_tempuh_km: number | null
    id_kontrak_vendor: string
    mekanisme: string
}

export interface KonsolidasiRekap {
    vendor: { id_vendor: string; nama_vendor: string }
    ringkasan: {
        total_rit: number
        total_jarak_km: number
        kontrak: KonsolidasiKontrak[]
    }
    trips: KonsolidasiTrip[]
}

export const konsolidasiVendorService = {
    async rekap(idVendor: string, dari?: string, sampai?: string) {
        const { data } = await axios.get(API_ENDPOINTS.KONSOLIDASI_VENDOR, {
            params: { id_vendor: idVendor, dari: dari || undefined, sampai: sampai || undefined },
        })
        return data.data as KonsolidasiRekap
    },
    async exportExcel(idVendor: string, namaVendor: string, dari?: string, sampai?: string) {
        const res = await axios.get(API_ENDPOINTS.KONSOLIDASI_VENDOR_EXPORT_EXCEL, {
            responseType: 'blob',
            params: { id_vendor: idVendor, dari: dari || undefined, sampai: sampai || undefined },
        })
        const href = URL.createObjectURL(res.data)
        const link = document.createElement('a')
        link.href = href
        link.download = `konsolidasi-${namaVendor.replace(/\s+/g, '-').toLowerCase()}-${dari || 'semua'}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
    },
}
