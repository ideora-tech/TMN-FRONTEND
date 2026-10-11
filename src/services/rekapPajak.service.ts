import axios from 'axios'
import dayjs from 'dayjs'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { unduhDariApi } from '@/utils/unduhBerkas'

export type JenisPajak = 'ppn_keluaran' | 'ppn_masukan' | 'pph_vendor' | 'pph21' | 'pph_dipotong_klien' | 'pajak_lain'

export interface TotalPajak {
    dpp: number
    pajak: number
    jumlah: number
}

export type RekapPerMasa = Record<JenisPajak, number> & {
    masa: string
    label: string
    ppn_kurang_bayar: number
}

export interface RekapPajak {
    periode: { dari: string; sampai: string; tanggal_dari: string; tanggal_sampai: string; label: string }
    ringkasan: Record<JenisPajak, TotalPajak> & {
        ppn_kurang_bayar: number
        invoice_tanpa_pajak: { jumlah: number; dpp: number }
        potongan_lain_klien: { jumlah: number; nominal: number }
    }
    per_masa: RekapPerMasa[]
}

export interface BarisPajak {
    tanggal: string
    masa: string
    nomor: string
    pihak: string | null
    npwp: string | null
    keterangan: string | null
    dpp: number
    tarif: number | null
    pajak: number
    sumber: string
    link: string
}

export interface RincianPajak {
    jenis: JenisPajak
    label: string
    total: TotalPajak
    data: BarisPajak[]
    meta: { page: number; limit: number; total: number; totalPages: number }
}

export type MasaPajak = { dari: string; sampai: string }

export const rekapPajakService = {
    async rekap(masa: MasaPajak) {
        const { data } = await axios.get(API_ENDPOINTS.REKAP_PAJAK, { params: masa })
        return data.data as RekapPajak
    },

    async rincian(jenis: JenisPajak, masa: MasaPajak, page = 1, limit = 10, search = '') {
        const { data } = await axios.get(API_ENDPOINTS.REKAP_PAJAK_RINCIAN, {
            params: { jenis, ...masa, page, limit, search: search || undefined },
        })
        return data.data as RincianPajak
    },

    async exportExcel(masa: MasaPajak) {
        await unduhDariApi(API_ENDPOINTS.REKAP_PAJAK_EXPORT, masa, `rekap-pajak-${dayjs().format('YYYY-MM-DD')}.xlsx`)
    },
}
