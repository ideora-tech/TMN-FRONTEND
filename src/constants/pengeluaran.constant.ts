export const KODE_PENGAJUAN_PENGELUARAN = [
    'pengajuan_pengeluaran',
    'uang_jalan',
    'legalitas',
    'perawatan',
    'sparepart',
    'penggajian',
    'pembelian_aset',
    'pembayaran_pinjaman',
    'lainnya',
    'persetujuan_transfer',
] as const

export type KodePengajuanPengeluaran = typeof KODE_PENGAJUAN_PENGELUARAN[number]

export const isKodePengeluaran = (kode: string | null | undefined): kode is KodePengajuanPengeluaran =>
    !!kode && (KODE_PENGAJUAN_PENGELUARAN as readonly string[]).includes(kode)
