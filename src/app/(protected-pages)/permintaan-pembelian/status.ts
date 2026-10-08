import type { StatusPermintaan, JenisItem, TahapBukti, TipePermintaan, PermintaanPembelian } from '@/services/permintaanPembelian.service'
import { formatRupiah } from '@/utils/formatNumber'

export const STATUS_LABEL: Record<StatusPermintaan, string> = {
    diajukan:          'Diajukan',
    menunggu_approval: 'Menunggu Approval',
    disetujui:         'Disetujui',
    ditolak:           'Ditolak',
    diproses:          'Diproses Pengadaan',
    dipesan:           'PO Terbit',
    dibeli:            'Dibeli',
    diterima_sebagian: 'Diterima Sebagian',
    diterima:          'Diterima',
    selesai:           'Selesai',
    dibatalkan:        'Dibatalkan',
}

export const STATUS_TAG: Record<StatusPermintaan, string> = {
    diajukan:          'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    menunggu_approval: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    disetujui:         'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-100',
    ditolak:           'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
    diproses:          'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    dipesan:           'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200',
    dibeli:            'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    diterima_sebagian: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-200',
    diterima:          'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300',
    selesai:           'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    dibatalkan:        'bg-gray-200 text-gray-600 dark:bg-gray-600/30 dark:text-gray-300',
}

export const STATUS_URUT: StatusPermintaan[] = ['menunggu_approval', 'disetujui', 'diproses', 'dipesan', 'dibeli', 'diterima_sebagian', 'diterima', 'selesai', 'ditolak', 'dibatalkan']

export const JENIS_LABEL: Record<JenisItem, string> = { barang: 'Barang', jasa: 'Jasa', sparepart: 'Spare Part', aset: 'Unit Armada' }

export const TIPE_LABEL: Record<TipePermintaan, string> = { umum: 'Umum', sparepart: 'Spare Part', aset: 'Aset Armada' }

export const TIPE_TAG: Record<TipePermintaan, string> = {
    umum:      'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    sparepart: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    aset:      'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
}

export const TAHAP_LABEL: Record<TahapBukti, string> = { pengajuan: 'Lampiran Pengajuan', pembelian: 'Nota Supplier', penerimaan: 'Bukti Penerimaan' }

export const bolehDiubah = (status: StatusPermintaan) => ['menunggu_approval', 'disetujui', 'ditolak'].includes(status)

export const adaKomponenBiaya = (d: PermintaanPembelian) => d.diskon > 0 || d.ppn_persen > 0 || d.ppn > 0 || d.ongkir > 0

export const rincianBiaya = (d: PermintaanPembelian) => {
    const subtotal = d.subtotal_aktual ?? (d.items ?? []).reduce((s, i) => s + (i.subtotal_aktual ?? i.subtotal_estimasi), 0)
    return {
        baris: [
            { label: 'Subtotal', nilai: formatRupiah(subtotal) },
            { label: 'Diskon', nilai: d.diskon > 0 ? `- ${formatRupiah(d.diskon)}` : formatRupiah(0) },
            { label: d.ppn_persen > 0 ? `PPN (${d.ppn_persen}%)` : 'PPN', nilai: formatRupiah(d.ppn) },
            { label: 'Ongkos Kirim', nilai: formatRupiah(d.ongkir) },
        ],
        total: d.total_aktual ?? subtotal - d.diskon + d.ppn + d.ongkir,
    }
}
