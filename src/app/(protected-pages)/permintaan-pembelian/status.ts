import type { StatusPermintaan, JenisItem, TahapBukti, TipePermintaan } from '@/services/permintaanPembelian.service'

export const STATUS_LABEL: Record<StatusPermintaan, string> = {
    diajukan:          'Diajukan',
    menunggu_approval: 'Menunggu Approval',
    disetujui:         'Disetujui',
    ditolak:           'Ditolak',
    diproses:          'Diproses Pengadaan',
    dibeli:            'Dibeli',
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
    dibeli:            'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    diterima:          'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300',
    selesai:           'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    dibatalkan:        'bg-gray-200 text-gray-600 dark:bg-gray-600/30 dark:text-gray-300',
}

export const STATUS_URUT: StatusPermintaan[] = ['menunggu_approval', 'disetujui', 'diproses', 'dibeli', 'diterima', 'selesai', 'ditolak', 'dibatalkan']

export const JENIS_LABEL: Record<JenisItem, string> = { barang: 'Barang', jasa: 'Jasa', sparepart: 'Spare Part', aset: 'Unit Armada' }

export const TIPE_LABEL: Record<TipePermintaan, string> = { umum: 'Umum', sparepart: 'Spare Part', aset: 'Aset Armada' }

export const TIPE_TAG: Record<TipePermintaan, string> = {
    umum:      'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    sparepart: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    aset:      'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
}

export const TAHAP_LABEL: Record<TahapBukti, string> = { pengajuan: 'Lampiran Pengajuan', pembelian: 'Nota / PO Supplier', penerimaan: 'Bukti Penerimaan' }

export const bolehDiubah = (status: StatusPermintaan) => ['menunggu_approval', 'disetujui', 'ditolak'].includes(status)
