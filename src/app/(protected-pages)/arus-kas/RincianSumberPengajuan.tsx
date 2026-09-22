'use client'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Spinner, Tag } from '@/components/ui'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { parseApiError } from '@/utils/error.util'
import { arusKasService } from '@/services/arusKas.service'
import type { RincianSumberPengajuan as RincianSumber, RincianPayroll, RincianUangJalan, StatusPenugasanUangJalan } from '@/services/arusKas.service'
import type { PerawatanArmadaWithArmada, StatusPerawatan } from '@/services/perawatanArmada.service'
import type { PembelianSparepart } from '@/services/pembelianSparepart.service'
import type { InvoiceVendor } from '@/services/invoice-vendor.service'
import { STATUS_LABEL as STATUS_PEMBELIAN_LABEL, STATUS_TAG as STATUS_PEMBELIAN_TAG } from '../pembelian-sparepart/status'

const LABEL_CLASS = 'text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1'
const VALUE_CLASS = 'text-sm font-medium text-gray-800 dark:text-gray-200'
const TH_CLASS = 'py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

const STATUS_PERAWATAN_TAG: Record<StatusPerawatan, string> = {
    terjadwal:    'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    dalam_proses: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:      'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    dibatalkan:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-300',
}

const JUDUL: Record<RincianSumber['tipe'], string> = {
    perawatan:      'Rincian Perawatan',
    pembelian:      'Rincian Pembelian Sparepart',
    payroll:        'Rincian Payroll',
    uang_jalan:     'Rincian Uang Jalan',
    invoice_vendor: 'Rincian Invoice Vendor',
}

const STATUS_PENUGASAN_TAG: Record<StatusPenugasanUangJalan, string> = {
    pending:  'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    aktif:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:  'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    batal:    'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-300',
}

const STATUS_PENUGASAN_LABEL: Record<StatusPenugasanUangJalan, string> = {
    pending: 'Pending',
    aktif:   'Aktif',
    selesai: 'Selesai',
    batal:   'Dibatalkan',
}

const STATUS_PERAWATAN_LABEL: Record<StatusPerawatan, string> = {
    terjadwal:    'Direncanakan',
    dalam_proses: 'Dalam Proses',
    selesai:      'Selesai',
    dibatalkan:   'Dibatalkan',
}

type Bukti = { id_bukti: string; url_file: string; nama_asli: string }

function DaftarBukti({ judul, bukti }: { judul: string; bukti: Bukti[] }) {
    const { klik } = usePratinjauBerkas()
    if (bukti.length === 0) return null

    return (
        <div className="mt-5">
            <p className={`${LABEL_CLASS} mb-2`}>{judul} ({bukti.length})</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {bukti.map(b => (
                    <div key={b.id_bukti}>
                        <a href={b.url_file} onClick={klik(b.url_file, b.nama_asli, b.nama_asli.replace(/\.[^.]+$/, ''))}
                            target="_blank" rel="noopener noreferrer" title={`Buka ${b.nama_asli}`}>
                            <img src={b.url_file} alt={b.nama_asli}
                                className="w-full h-24 object-cover rounded-lg border border-gray-100 dark:border-gray-700 hover:opacity-90 transition-opacity" />
                        </a>
                        <p className="text-xs text-gray-400 truncate mt-1">{b.nama_asli}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

function RincianPerawatan({ data }: { data: PerawatanArmadaWithArmada }) {
    const sparepart = data.sparepart ?? []
    const totalSparepart = sparepart.reduce((acc, s) => acc + s.subtotal, 0)

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                    <p className={LABEL_CLASS}>Tanggal Servis</p>
                    <p className={VALUE_CLASS}>{dayjs(data.tanggal).format('DD MMM YYYY')}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Status Perawatan</p>
                    <Tag className={`text-xs font-semibold ${STATUS_PERAWATAN_TAG[data.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_PERAWATAN_LABEL[data.status] ?? data.status.replace(/_/g, ' ')}
                    </Tag>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Paket Servis</p>
                    <p className={VALUE_CLASS}>{data.interval_label ?? '—'}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Bengkel</p>
                    <p className={VALUE_CLASS}>{data.nama_supplier ?? '—'}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>KM Odometer</p>
                    <p className={VALUE_CLASS}>{data.km_odometer != null ? `${formatNum(data.km_odometer)} km` : '—'}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Servis Berikutnya</p>
                    <p className={VALUE_CLASS}>{data.jadwal_servis_berikutnya ? dayjs(data.jadwal_servis_berikutnya).format('DD MMM YYYY') : '—'}</p>
                </div>
            </div>

            {data.keterangan && (
                <div className="mt-4">
                    <p className={LABEL_CLASS}>Catatan Perawatan</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{data.keterangan}</p>
                </div>
            )}
            {data.status === 'dibatalkan' && data.alasan_batal && (
                <div className="mt-4">
                    <p className={LABEL_CLASS}>Alasan Dibatalkan</p>
                    <p className="text-sm text-red-500 dark:text-red-400">{data.alasan_batal}</p>
                </div>
            )}

            <div className="mt-5">
                <p className={`${LABEL_CLASS} mb-2`}>Rincian Biaya</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className={`${TH_CLASS} text-left`}>Sumber</th>
                                <th className={`${TH_CLASS} text-left`}>Nama</th>
                                <th className={`${TH_CLASS} text-right`}>Qty</th>
                                <th className={`${TH_CLASS} text-right`}>Harga</th>
                                <th className={`${TH_CLASS} text-right`}>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {sparepart.map(s => (
                                <tr key={s.id_perawatan_sparepart}>
                                    <td className="py-2 px-3">
                                        <Tag className={`text-xs font-semibold whitespace-nowrap ${s.sumber === 'bengkel' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100'}`}>
                                            {s.sumber === 'bengkel' ? 'Pembelian Langsung' : 'Stok'}
                                        </Tag>
                                    </td>
                                    <td className="py-2 px-3">{s.nama_sparepart}</td>
                                    <td className="py-2 px-3 text-right">{formatNum(s.qty)}</td>
                                    <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(s.harga)}</td>
                                    <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(s.subtotal)}</td>
                                </tr>
                            ))}
                            <tr>
                                <td colSpan={4} className="py-2 px-3 text-right text-gray-500 dark:text-gray-400">Biaya Jasa</td>
                                <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(data.biaya)}</td>
                            </tr>
                            <tr className="border-t border-gray-200 dark:border-gray-600">
                                <td colSpan={4} className="py-2 px-3 text-right font-semibold text-gray-800 dark:text-gray-100">Total Biaya (jasa + sparepart)</td>
                                <td className="py-2 px-3 text-right font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                    {formatRupiah(data.biaya + totalSparepart)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <DaftarBukti judul="Bukti Perawatan" bukti={data.bukti ?? []} />
        </>
    )
}

function RincianPembelian({ data }: { data: PembelianSparepart }) {
    const items = data.items ?? []
    const adaAktual = items.some(i => i.harga_aktual != null)

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                    <p className={LABEL_CLASS}>Nomor Pembelian</p>
                    <p className={`${VALUE_CLASS} font-mono`}>{data.nomor_pengajuan}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Status Pembelian</p>
                    <Tag className={`text-xs font-semibold ${STATUS_PEMBELIAN_TAG[data.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_PEMBELIAN_LABEL[data.status] ?? data.status}
                    </Tag>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Supplier</p>
                    <p className={VALUE_CLASS}>{data.nama_supplier ?? '—'}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Armada Terkait</p>
                    <p className={VALUE_CLASS}>{data.nopol_armada ?? '—'}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Tanggal Pengajuan</p>
                    <p className={VALUE_CLASS}>{dayjs(data.tanggal_pengajuan).format('DD MMM YYYY')}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Tanggal Pembelian</p>
                    <p className={VALUE_CLASS}>{data.tanggal_pembelian ? dayjs(data.tanggal_pembelian).format('DD MMM YYYY') : '—'}</p>
                </div>
            </div>

            {data.keterangan && (
                <div className="mt-4">
                    <p className={LABEL_CLASS}>Catatan Pembelian</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{data.keterangan}</p>
                </div>
            )}
            {data.status === 'ditolak' && data.alasan_ditolak && (
                <div className="mt-4">
                    <p className={LABEL_CLASS}>Alasan Ditolak</p>
                    <p className="text-sm text-red-500 dark:text-red-400">{data.alasan_ditolak}</p>
                </div>
            )}

            <div className="mt-5">
                <p className={`${LABEL_CLASS} mb-2`}>Item Dibeli</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className={`${TH_CLASS} text-left`}>Nama</th>
                                <th className={`${TH_CLASS} text-right`}>Qty</th>
                                <th className={`${TH_CLASS} text-right`}>Estimasi</th>
                                {adaAktual && <th className={`${TH_CLASS} text-right`}>Aktual</th>}
                                {adaAktual && <th className={`${TH_CLASS} text-right`}>Selisih</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {items.map(i => (
                                <tr key={i.id_item}>
                                    <td className="py-2 px-3">{i.nama_sparepart}</td>
                                    <td className="py-2 px-3 text-right">{formatNum(i.qty)}</td>
                                    <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(i.harga_estimasi)}</td>
                                    {adaAktual && (
                                        <td className="py-2 px-3 text-right whitespace-nowrap">
                                            {i.harga_aktual != null ? formatRupiah(i.harga_aktual) : '—'}
                                        </td>
                                    )}
                                    {adaAktual && (
                                        <td className={`py-2 px-3 text-right whitespace-nowrap ${(i.selisih ?? 0) > 0 ? 'text-red-500' : (i.selisih ?? 0) < 0 ? 'text-emerald-600' : ''}`}>
                                            {i.selisih != null ? formatRupiah(i.selisih) : '—'}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            <tr className="border-t border-gray-200 dark:border-gray-600">
                                <td colSpan={2} className="py-2 px-3 text-right font-semibold text-gray-800 dark:text-gray-100">Total</td>
                                <td className="py-2 px-3 text-right font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                    {formatRupiah(data.total_estimasi)}
                                </td>
                                {adaAktual && (
                                    <td className="py-2 px-3 text-right font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                        {data.total_aktual != null ? formatRupiah(data.total_aktual) : '—'}
                                    </td>
                                )}
                                {adaAktual && (
                                    <td className={`py-2 px-3 text-right font-semibold whitespace-nowrap ${(data.selisih ?? 0) > 0 ? 'text-red-500' : (data.selisih ?? 0) < 0 ? 'text-emerald-600' : 'text-gray-800 dark:text-gray-100'}`}>
                                        {data.selisih != null ? formatRupiah(data.selisih) : '—'}
                                    </td>
                                )}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <DaftarBukti judul="Nota / Bukti Pembelian" bukti={data.bukti ?? []} />
        </>
    )
}

function RincianUangJalanBlok({ data }: { data: RincianUangJalan }) {
    const penugasan = data.penugasan ?? []
    const tarif = data.tarif_per_hari
    const hariAktif = penugasan.length - data.jumlah_dibatalkan
    const adaSelisih = data.jumlah_hari_ditagih != null && hariAktif !== data.jumlah_hari_ditagih

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                    <p className={LABEL_CLASS}>Supir</p>
                    <p className={VALUE_CLASS}>{data.nama_supir ?? '—'}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Proyek</p>
                    <p className={VALUE_CLASS}>{data.nama_proyek ?? '—'}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Periode</p>
                    <p className={VALUE_CLASS}>
                        {data.periode_dari
                            ? `${dayjs(data.periode_dari).format('DD MMM YYYY')} – ${data.periode_sampai ? dayjs(data.periode_sampai).format('DD MMM YYYY') : '—'}`
                            : '—'}
                    </p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Tarif</p>
                    <p className={VALUE_CLASS}>
                        {tarif != null
                            ? `${formatRupiah(tarif)}/hari${data.jumlah_hari_ditagih != null ? ` × ${data.jumlah_hari_ditagih} hari` : ''}`
                            : '—'}
                    </p>
                </div>
            </div>

            {adaSelisih && (
                <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
                    Penugasan aktif saat ini {formatNum(hariAktif)} hari, sedangkan yang ditagihkan {formatNum(data.jumlah_hari_ditagih)} hari
                    {data.jumlah_dibatalkan > 0 ? ` (${formatNum(data.jumlah_dibatalkan)} penugasan dibatalkan setelah pengajuan dibuat)` : ''}.
                </p>
            )}

            <div className="mt-5">
                <p className={`${LABEL_CLASS} mb-2`}>Penugasan Dibiayai ({formatNum(penugasan.length)})</p>
                {penugasan.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Tidak ada penugasan yang tertaut ke pengajuan ini.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className={`${TH_CLASS} text-left`}>Tanggal</th>
                                    <th className={`${TH_CLASS} text-left`}>Rute</th>
                                    <th className={`${TH_CLASS} text-left`}>Armada</th>
                                    <th className={`${TH_CLASS} text-left`}>Status</th>
                                    <th className={`${TH_CLASS} text-right`}>Tarif</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {penugasan.map(t => (
                                    <tr key={t.id_penugasan} className={t.status === 'batal' ? 'opacity-60' : ''}>
                                        <td className="py-2 px-3 whitespace-nowrap">
                                            {t.tanggal_tugas ? dayjs(t.tanggal_tugas).format('DD MMM YYYY') : '—'}
                                        </td>
                                        <td className="py-2 px-3">{t.nama_rute ?? '—'}</td>
                                        <td className="py-2 px-3 whitespace-nowrap">{t.nopol ?? '—'}</td>
                                        <td className="py-2 px-3">
                                            <Tag className={`text-xs font-semibold whitespace-nowrap ${STATUS_PENUGASAN_TAG[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {STATUS_PENUGASAN_LABEL[t.status] ?? t.status}
                                            </Tag>
                                        </td>
                                        <td className="py-2 px-3 text-right whitespace-nowrap">
                                            {t.status === 'batal' || tarif == null ? '—' : formatRupiah(tarif)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}

function RincianPayrollBlok({ data }: { data: RincianPayroll }) {
    const { periode, ringkasan } = data

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                    <p className={LABEL_CLASS}>Periode</p>
                    <p className={VALUE_CLASS}>{periode.nama}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Status</p>
                    <Tag className={`text-xs font-semibold ${periode.status === 'final'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'}`}>
                        {periode.status === 'final' ? 'Final' : 'Draft'}
                    </Tag>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Rentang</p>
                    <p className={VALUE_CLASS}>
                        {dayjs(periode.tanggal_mulai).format('DD MMM YYYY')} – {dayjs(periode.tanggal_selesai).format('DD MMM YYYY')}
                    </p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Jumlah Karyawan</p>
                    <p className={VALUE_CLASS}>{formatNum(ringkasan.jumlah_slip)} slip</p>
                </div>
            </div>

            <div className="mt-5">
                <p className={`${LABEL_CLASS} mb-2`}>Ringkasan Gaji</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            <tr>
                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">Total Bruto</td>
                                <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(ringkasan.total_bruto)}</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">Total Potongan</td>
                                <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(ringkasan.total_potongan)}</td>
                            </tr>
                            <tr className="border-t border-gray-200 dark:border-gray-600">
                                <td className="py-2 px-3 font-semibold text-gray-800 dark:text-gray-100">Total Gaji Bersih</td>
                                <td className="py-2 px-3 text-right font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                    {formatRupiah(ringkasan.total_gaji_bersih)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    Slip gaji per karyawan tidak ditampilkan di sini — buka menu Payroll untuk rinciannya.
                </p>
            </div>
        </>
    )
}

function RincianInvoiceVendorBlok({ data }: { data: InvoiceVendor }) {
    const trip = data.trip_terkait ?? []

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                    <p className={LABEL_CLASS}>Nomor Invoice</p>
                    <p className={`${VALUE_CLASS} font-mono`}>{data.nomor_invoice}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Vendor</p>
                    <p className={VALUE_CLASS}>{data.vendor?.nama_vendor ?? '—'}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Tanggal Invoice</p>
                    <p className={VALUE_CLASS}>{dayjs(data.tanggal_invoice).format('DD MMM YYYY')}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Jatuh Tempo</p>
                    <p className={VALUE_CLASS}>{data.jatuh_tempo ? dayjs(data.jatuh_tempo).format('DD MMM YYYY') : '—'}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Nomor Kontrak</p>
                    <p className={VALUE_CLASS}>{data.kontrak?.nomor_kontrak ?? data.no_kontrak ?? '—'}</p>
                </div>
                <div>
                    <p className={LABEL_CLASS}>Status Pembayaran</p>
                    <Tag className={`text-xs font-semibold ${data.status_pembayaran === 'lunas'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                        : data.status_pembayaran === 'sebagian'
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'}`}>
                        {data.status_pembayaran === 'lunas' ? 'Lunas' : data.status_pembayaran === 'sebagian' ? 'Sebagian' : 'Belum Dibayar'}
                    </Tag>
                </div>
            </div>

            {data.keterangan && (
                <div className="mt-4">
                    <p className={LABEL_CLASS}>Keterangan Invoice</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{data.keterangan}</p>
                </div>
            )}

            <div className="mt-5">
                <p className={`${LABEL_CLASS} mb-2`}>Nilai Invoice</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            <tr>
                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">DPP</td>
                                <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(data.dpp)}</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">PPN</td>
                                <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(data.ppn)}</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">PPh</td>
                                <td className="py-2 px-3 text-right whitespace-nowrap">-{formatRupiah(data.pph)}</td>
                            </tr>
                            <tr className="border-t border-gray-200 dark:border-gray-600">
                                <td className="py-2 px-3 font-semibold text-gray-800 dark:text-gray-100">Total Invoice</td>
                                <td className="py-2 px-3 text-right font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                    {formatRupiah(data.total)}
                                </td>
                            </tr>
                            <tr>
                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">Sudah Dibayar</td>
                                <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(data.total_dibayar ?? 0)}</td>
                            </tr>
                            <tr>
                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">Sisa</td>
                                <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(data.sisa ?? 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {trip.length > 0 && (
                <div className="mt-5">
                    <p className={`${LABEL_CLASS} mb-2`}>Trip Ditagihkan ({formatNum(trip.length)})</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className={`${TH_CLASS} text-left`}>Tanggal</th>
                                    <th className={`${TH_CLASS} text-left`}>Rute</th>
                                    <th className={`${TH_CLASS} text-left`}>Armada</th>
                                    <th className={`${TH_CLASS} text-left`}>Proyek</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {trip.map(t => (
                                    <tr key={t.id_trip}>
                                        <td className="py-2 px-3 whitespace-nowrap">{t.tanggal ? dayjs(t.tanggal).format('DD MMM YYYY') : '—'}</td>
                                        <td className="py-2 px-3">{t.rute ?? '—'}</td>
                                        <td className="py-2 px-3 whitespace-nowrap">{t.nopol ?? '—'}</td>
                                        <td className="py-2 px-3">{t.nama_proyek}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    )
}

/**
 * Rincian transaksi asal sebuah pengajuan — perawatan, pembelian sparepart, payroll,
 * uang jalan, atau invoice vendor. Ditarik saat drawer detail dibuka supaya keuangan
 * bisa verifikasi tanpa pindah halaman.
 */
export default function RincianSumberPengajuan({ idPengajuan }: { idPengajuan: string }) {
    const [rincian, setRincian] = useState<RincianSumber | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let batal = false
        setLoading(true)
        setError('')
        setRincian(null)
        arusKasService.rincianSumberPengajuan(idPengajuan)
            .then(res => { if (!batal) setRincian(res) })
            .catch(err => { if (!batal) setError(parseApiError(err)) })
            .finally(() => { if (!batal) setLoading(false) })
        return () => { batal = true }
    }, [idPengajuan])

    return (
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className={`${LABEL_CLASS} mb-3`}>{rincian ? JUDUL[rincian.tipe] : 'Rincian Transaksi'}</p>

            {loading && (
                <div className="py-6 text-center"><Spinner className="inline-block" size={28} /></div>
            )}

            {!loading && error && <p className="text-xs text-red-500">{error}</p>}

            {!loading && !error && rincian?.tipe === 'perawatan' && <RincianPerawatan data={rincian.data} />}
            {!loading && !error && rincian?.tipe === 'pembelian' && <RincianPembelian data={rincian.data} />}
            {!loading && !error && rincian?.tipe === 'payroll' && <RincianPayrollBlok data={rincian.data} />}
            {!loading && !error && rincian?.tipe === 'uang_jalan' && <RincianUangJalanBlok data={rincian.data} />}
            {!loading && !error && rincian?.tipe === 'invoice_vendor' && <RincianInvoiceVendorBlok data={rincian.data} />}
        </div>
    )
}
