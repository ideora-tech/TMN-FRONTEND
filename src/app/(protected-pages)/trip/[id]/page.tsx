'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Checkbox, Dialog, Input, Tag, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EvaluasiPenugasanCard from '@/components/shared/EvaluasiPenugasanCard'
import LaporanPerjalananPanel from '@/components/shared/LaporanPerjalananPanel'
import {
    HiArrowLeft,
    HiOutlineMap,
    HiOutlinePlus,
    HiOutlinePencilAlt,
    HiOutlineTrash,
} from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { tripService, Trip, StatusTrip } from '@/services/trip.service'
import { formatRupiah } from '@/utils/formatNumber'
import axios from 'axios'
import dayjs from 'dayjs'

const STATUS_TAG: Record<string, string> = {
    belum_mulai: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    berjalan:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:     'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    dibatalkan:  'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

const STATUS_LABEL: Record<string, string> = {
    belum_mulai: 'Belum Mulai',
    berjalan:    'Berjalan',
    selesai:     'Selesai',
    dibatalkan:  'Dibatalkan',
}

const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'Full',
}
const MEKANISME_CLASS: Record<string, string> = {
    unit_only:   'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    unit_driver: 'bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    full:        'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
}

const PENGAJUAN_LABEL: Record<string, string> = {
    diajukan:          'Diajukan',
    dicek:             'Dicek Keuangan',
    menunggu_approval: 'Menunggu Approval',
    disetujui:         'Disetujui',
    ditolak:           'Ditolak',
    ditransfer:        'Sudah Ditransfer',
}

const PENGAJUAN_TAG: Record<string, string> = {
    diajukan:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    dicek:             'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    menunggu_approval: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    disetujui:         'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
    ditolak:           'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    ditransfer:        'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
}

const PENGAJUAN_BORDER: Record<string, string> = {
    diajukan:          'border-l-yellow-400',
    dicek:             'border-l-blue-400',
    menunggu_approval: 'border-l-amber-400',
    disetujui:         'border-l-indigo-400',
    ditolak:           'border-l-red-400',
    ditransfer:        'border-l-emerald-400',
}

const RIWAYAT_BORDER: Record<string, string> = {
    belum_mulai: 'border-l-blue-400',
    berjalan:    'border-l-emerald-400',
    selesai:     'border-l-purple-400',
    dibatalkan:  'border-l-red-400',
}

const PERAN_LABEL: Record<string, string> = {
    SUPIR:       'Supir',
    SUPERADMIN:  'Super Admin',
    ADMIN:       'Admin',
    MANAGER:     'Manager',
    DISPATCHER:  'Dispatcher',
    KEUANGAN:    'Keuangan',
    SALES:       'Sales',
    BOD:         'BOD',
}

function formatDurasi(awal?: string | null, akhir?: string | null): string | null {
    if (!awal || !akhir) return null
    const beda = dayjs(akhir).diff(dayjs(awal), 'minute')
    if (beda < 0) return null
    const jam = Math.floor(beda / 60)
    const menit = beda % 60
    return jam > 0 ? `${jam} jam ${menit} menit` : `${menit} menit`
}

type RekapBiaya = {
    total_bbm: number
    total_uang_jalan: number
    total_uang_tol: number
    total_biaya_lain: number
    total_keseluruhan: number
    estimasi_biaya: number | null
    selisih: number | null
    jarak_tempuh_km: number | null
    items: { id_biaya_lain: string; nama_biaya: string; nominal: number }[]
}

type AksiTrip = 'mulai' | 'selesai' | 'batalkan'

const AKSI_TITLE: Record<AksiTrip, string> = {
    mulai:    'Mulai Trip',
    selesai:  'Selesaikan Trip',
    batalkan: 'Batalkan Trip',
}

const AKSI_MESSAGE: Record<AksiTrip, string> = {
    mulai:    'Mulai trip ini? Status akan berubah menjadi berjalan.',
    selesai:  'Selesaikan trip ini? Status akan berubah menjadi selesai.',
    batalkan: 'Batalkan trip ini? Tindakan ini tidak dapat dibatalkan.',
}

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [trip, setTrip]                 = useState<Trip | null>(null)
    const [statuses, setStatuses]         = useState<StatusTrip[]>([])
    const [loading, setLoading]           = useState(true)
    const [rekap, setRekap]               = useState<RekapBiaya | null>(null)
    const [rekapLoading, setRekapLoading] = useState(true)

    const [titikDropDialogOpen, setTitikDropDialogOpen] = useState(false)
    const [titikDropForm, setTitikDropForm]           = useState<string[]>([])
    const [savingTitikDrop, setSavingTitikDrop]       = useState(false)

    // aksi lifecycle trip
    const [aksiTrip, setAksiTrip]         = useState<AksiTrip | null>(null)
    const [aksiLoading, setAksiLoading]   = useState(false)
    const [selesaikanPenugasan, setSelesaikanPenugasan] = useState(false)

    const handleAksiTrip = async () => {
        if (!aksiTrip) return
        const aksi = aksiTrip
        setAksiLoading(true)
        try {
            if (aksi === 'mulai') await tripService.checkin(id)
            else if (aksi === 'selesai') await tripService.checkout(id, selesaikanPenugasan)
            else await tripService.batalkan(id)
            toast.push(<Notification type="success" title={`${AKSI_TITLE[aksi]} berhasil`} />)
            setAksiTrip(null)
            setSelesaikanPenugasan(false)
            const t = await tripService.get(id)
            setTrip(t)
            tripService.getStatus(id).then(setStatuses).catch(() => {})
            if (aksi === 'selesai' && t.status === 'selesai') {
                setTimeout(() => {
                    document.getElementById('evaluasi-penugasan-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }, 300)
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAksiLoading(false)
        }
    }

    useEffect(() => {
        tripService.get(id)
            .then(setTrip)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    useEffect(() => {
        const load = () => tripService.getStatus(id).then(setStatuses).catch(console.error)
        load()
        const interval = setInterval(load, 30_000)
        return () => clearInterval(interval)
    }, [id])

    const fetchRekap = useCallback(async () => {
        setRekapLoading(true)
        try {
            const res = await axios.get(API_ENDPOINTS.TRIP_REKAP_BIAYA(id))
            setRekap(res.data?.data ?? null)
        } catch {
            // silently fail if no data yet
        } finally {
            setRekapLoading(false)
        }
    }, [id])

    useEffect(() => { fetchRekap() }, [fetchRekap])

    const tambahTitikDrop = () => setTitikDropForm(prev => (prev.length < 10 ? [...prev, ''] : prev))
    const ubahTitikDrop   = (i: number, v: string) => setTitikDropForm(prev => prev.map((d, idx) => (idx === i ? v : d)))
    const hapusTitikDrop  = (i: number) => setTitikDropForm(prev => prev.filter((_, idx) => idx !== i))

    const openTitikDropDialog = () => {
        setTitikDropForm(trip?.titik_drop ?? [])
        setTitikDropDialogOpen(true)
    }
    const closeTitikDropDialog = () => setTitikDropDialogOpen(false)

    const handleSubmitTitikDrop = async () => {
        setSavingTitikDrop(true)
        try {
            const titikDrop = titikDropForm.map(d => d.trim()).filter(Boolean)
            await tripService.updateTitikDrop(id, titikDrop)
            toast.push(<Notification type="success" title="Titik drop berhasil diperbarui" />)
            setTitikDropDialogOpen(false)
            const t = await tripService.get(id)
            setTrip(t)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingTitikDrop(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!trip)   return <div className="p-6 text-red-500">Trip tidak ditemukan.</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => {
                        if (window.history.length > 1) router.back()
                        else router.push(ROUTES.TRIP)
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Detail Trip</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan riwayat status trip</p>
                </div>
            </div>

            <Card>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex-shrink-0 select-none">
                            <HiOutlineMap className="text-2xl" />
                        </div>
                        <div>
                            <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">
                                {trip.rute ?? (trip.waktu_checkin ? dayjs(trip.waktu_checkin).format('DD MMM YYYY HH:mm') : 'Belum Check-in')}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {trip.supir_nama || trip.armada_nopol
                                    ? [trip.supir_nama, trip.armada_nopol].filter(Boolean).join(' • ')
                                    : <span className="font-mono text-xs">#{trip.id_trip.slice(0, 8)}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {trip.sumber === 'vendor' && (
                            <Tag className="bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300 border-0">
                                Vendor
                            </Tag>
                        )}
                        <Tag className={`${STATUS_TAG[trip.status] ?? 'bg-gray-100 text-gray-700'} border-0`}>
                            {STATUS_LABEL[trip.status] ?? trip.status}
                        </Tag>
                        <Button size="sm" variant="default" onClick={() => router.push(ROUTES.TRIP)}>
                            Batal
                        </Button>
                    </div>
                </div>

                <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {(
                        [
                            ...(trip.nama_proyek
                                ? [{
                                    label: 'Proyek',
                                    value: (
                                        trip.id_proyek ? (
                                            <span
                                                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                                onClick={() => router.push(ROUTES.PROYEK_DETAIL(trip.id_proyek as string))}
                                            >
                                                {trip.nama_proyek}{trip.kode_proyek ? ` (${trip.kode_proyek})` : ''}
                                            </span>
                                        ) : trip.nama_proyek
                                    ) as React.ReactNode,
                                }]
                                : []),
                            ...(trip.nama_klien
                                ? [{ label: 'Klien', value: trip.nama_klien as React.ReactNode }]
                                : []),
                            ...(trip.rute
                                ? [{
                                    label: 'Rute',
                                    value: (
                                        trip.titik_drop?.length ? (
                                            <span className="inline-flex flex-wrap items-center gap-1">
                                                <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-0">
                                                    {trip.rute}
                                                </Tag>
                                                {trip.titik_drop.map((d, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1">
                                                        <span className="text-gray-400">→</span>
                                                        <Tag className="bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 border-0">
                                                            {d}
                                                        </Tag>
                                                    </span>
                                                ))}
                                            </span>
                                        ) : (trip.rute as React.ReactNode)
                                    ),
                                }]
                                : []),
                            ...(trip.supir_nama
                                ? [{ label: 'Supir', value: trip.supir_nama as React.ReactNode }]
                                : []),
                            ...(trip.armada_nopol
                                ? [{ label: 'Armada', value: trip.armada_nopol as React.ReactNode }]
                                : []),
                            ...(trip.sumber === 'vendor'
                                ? [{
                                    label: 'Vendor',
                                    value: (
                                        <span className="inline-flex items-center gap-2">
                                            {trip.vendor_nama ?? '—'}
                                            {trip.mekanisme && (
                                                <Tag className={`text-xs font-semibold ${MEKANISME_CLASS[trip.mekanisme] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {MEKANISME_LABEL[trip.mekanisme] ?? trip.mekanisme}
                                                </Tag>
                                            )}
                                        </span>
                                    ) as React.ReactNode,
                                }]
                                : []),
                            ...(trip.waktu_berangkat
                                ? [{ label: 'Waktu Berangkat', value: dayjs(trip.waktu_berangkat).format('DD MMM YYYY HH:mm') as React.ReactNode }]
                                : []),
                            { label: 'Status', value: STATUS_LABEL[trip.status] ?? trip.status },
                            {
                                label: 'Check-in',
                                value: trip.waktu_checkin ? dayjs(trip.waktu_checkin).format('DD MMM YYYY HH:mm') : <span className="text-gray-400">-</span>,
                            },
                            {
                                label: 'Check-out',
                                value: trip.waktu_checkout ? dayjs(trip.waktu_checkout).format('DD MMM YYYY HH:mm') : <span className="text-gray-400">-</span>,
                            },
                            ...(formatDurasi(trip.waktu_checkin, trip.waktu_checkout)
                                ? [{ label: 'Durasi', value: formatDurasi(trip.waktu_checkin, trip.waktu_checkout) as React.ReactNode }]
                                : []),
                            ...(trip.catatan
                                ? [{ label: 'Catatan', value: trip.catatan as React.ReactNode }]
                                : []),
                        ] as { label: string; value: React.ReactNode }[]
                    ).map(({ label, value }) => (
                        <div key={label}>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                                {label}
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Titik Drop</p>
                        {trip.sudah_difakturkan && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Terkunci — trip sudah masuk invoice</p>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant="solid"
                        icon={<HiOutlinePencilAlt />}
                        disabled={trip.sudah_difakturkan}
                        onClick={openTitikDropDialog}
                    >
                        Ubah Titik Drop
                    </Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(trip.status === 'belum_mulai' || trip.status === 'berjalan') && (
                <Card className="border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Aksi Trip</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Status saat ini: <span className="font-semibold">{STATUS_LABEL[trip.status]}</span>
                            </p>
                            {trip.status === 'berjalan' && !trip.punya_laporan && (
                                <p
                                    className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 cursor-pointer hover:underline"
                                    onClick={() => document.getElementById('laporan-perjalanan-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                >
                                    Isi laporan perjalanan dulu sebelum bisa diselesaikan
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {trip.status === 'belum_mulai' && (
                                <Button size="sm" variant="solid" onClick={() => setAksiTrip('mulai')} disabled={aksiLoading}>
                                    Mulai Trip
                                </Button>
                            )}
                            {trip.status === 'berjalan' && trip.punya_laporan && (
                                <Button
                                    size="sm"
                                    variant="solid"
                                    onClick={() => setAksiTrip('selesai')}
                                    disabled={aksiLoading}
                                >
                                    Selesaikan
                                </Button>
                            )}
                            <Button size="sm" variant="default"
                                className={`${STATUS_TAG['dibatalkan']} border border-current`}
                                onClick={() => setAksiTrip('batalkan')} disabled={aksiLoading}>
                                Batalkan
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            <Card id="laporan-perjalanan-card">
                <LaporanPerjalananPanel idTrip={id} onSaved={fetchRekap} />
            </Card>

                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h5>Riwayat Status</h5>
                        <span className="text-xs text-gray-400">Auto-refresh 30 detik</span>
                    </div>
                    {statuses.length === 0 ? (
                        <div className="text-gray-400 text-sm">Belum ada riwayat status.</div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {statuses.map(s => (
                                <div key={s.id_status}
                                    className={`rounded-lg border border-gray-200 dark:border-gray-600 border-l-4 ${RIWAYAT_BORDER[s.status] ?? 'border-l-gray-300'} bg-gray-50 p-3 dark:bg-gray-800`}>
                                    <div className="flex justify-between items-start">
                                        <Tag className={`${STATUS_TAG[s.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-100'} border-0`}>
                                            {STATUS_LABEL[s.status] ?? s.status}
                                        </Tag>
                                        <span className="text-xs text-gray-400">{dayjs(s.dibuat_pada).format('DD/MM/YYYY HH:mm')}</span>
                                    </div>
                                    {s.keterangan && <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">{s.keterangan}</div>}
                                    {s.dibuat_oleh_nama && (
                                        <div className="text-xs text-gray-400 mt-1">
                                            Oleh: {s.dibuat_oleh_nama}
                                            {s.dibuat_oleh_peran && ` (${PERAN_LABEL[s.dibuat_oleh_peran] ?? s.dibuat_oleh_peran})`}
                                        </div>
                                    )}
                                    {s.latitude && s.longitude && <div className="text-xs text-gray-400 mt-1">Koordinat: {s.latitude}, {s.longitude}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {trip?.pengajuan_uang_jalan && (
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h5>Status Uang Jalan (Keuangan)</h5>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {trip.pengajuan_uang_jalan.nomor_pengajuan} — {formatRupiah(trip.pengajuan_uang_jalan.nominal)}
                                </p>
                                {trip.pengajuan_uang_jalan.periode && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {formatRupiah(trip.pengajuan_uang_jalan.periode.tarif_per_hari)}/hari × {trip.pengajuan_uang_jalan.periode.jumlah_hari} hari ({dayjs(trip.pengajuan_uang_jalan.periode.dari).format('DD/MM')}–{dayjs(trip.pengajuan_uang_jalan.periode.sampai).format('DD/MM')})
                                    </p>
                                )}
                            </div>
                            <Tag className={`${PENGAJUAN_TAG[trip.pengajuan_uang_jalan.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-100'} border-0 font-semibold`}>
                                {PENGAJUAN_LABEL[trip.pengajuan_uang_jalan.status] ?? trip.pengajuan_uang_jalan.status}
                            </Tag>
                        </div>
                        <div className="flex flex-col gap-2">
                            {trip.pengajuan_uang_jalan.riwayat.map((r, i) => (
                                <div key={i}
                                    className={`rounded-lg border border-gray-200 dark:border-gray-600 border-l-4 ${PENGAJUAN_BORDER[r.status] ?? 'border-l-gray-300'} bg-gray-50 p-3 dark:bg-gray-800`}>
                                    <div className="flex justify-between items-start">
                                        <Tag className={`${PENGAJUAN_TAG[r.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-100'} border-0`}>
                                            {PENGAJUAN_LABEL[r.status] ?? r.status}
                                        </Tag>
                                        <span className="text-xs text-gray-400">{r.waktu ? dayjs(r.waktu).format('DD/MM/YYYY HH:mm') : '—'}</span>
                                    </div>
                                    {r.oleh && <div className="text-xs text-gray-400 mt-2">Oleh: {r.oleh}</div>}
                                    {r.keterangan && <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{r.keterangan}</div>}
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h5>Rekap Biaya</h5>
                    {rekapLoading && <span className="text-xs text-gray-400">Memuat...</span>}
                </div>

                {!rekapLoading && (!rekap || (rekap.total_keseluruhan === 0 && rekap.estimasi_biaya == null)) ? (
                    <div className="text-gray-400 text-sm">Belum ada data biaya untuk trip ini.</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-5">
                            {[
                                { label: 'Total BBM',         value: rekap?.total_bbm ?? 0 },
                                { label: 'Total Uang Jalan',  value: rekap?.total_uang_jalan ?? 0 },
                                { label: 'Total Uang Tol',    value: rekap?.total_uang_tol ?? 0 },
                                { label: 'Total Biaya Lain',  value: rekap?.total_biaya_lain ?? 0 },
                                { label: 'Total Keseluruhan', value: rekap?.total_keseluruhan ?? 0, highlight: true },
                            ].map(({ label, value, highlight }) => (
                                <div
                                    key={label}
                                    className={`rounded-lg p-3 ${highlight
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                        : 'bg-gray-50 dark:bg-gray-800'
                                    }`}
                                >
                                    <div className={`text-xs mb-1 ${highlight ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500'}`}>
                                        {label}
                                    </div>
                                    <div className={`font-semibold text-sm ${highlight ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                                        {formatRupiah(value)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {rekap && rekap.estimasi_biaya != null && (
                            <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2">
                                <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                                    <div className="text-xs mb-1 text-gray-500">Uang Jalan</div>
                                    <div className="font-semibold text-sm">{formatRupiah(rekap.estimasi_biaya)}</div>
                                </div>
                                <div className={`rounded-lg p-3 border ${
                                    (rekap.selisih ?? 0) >= 0
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                }`}>
                                    <div className={`text-xs mb-1 ${(rekap.selisih ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        Selisih
                                    </div>
                                    <div className={`font-semibold text-sm ${(rekap.selisih ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatRupiah(Math.abs(rekap.selisih ?? 0))} {(rekap.selisih ?? 0) >= 0 ? '(hemat)' : '(melebihi estimasi)'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {rekap && rekap.items.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-50 dark:bg-blue-500/10">
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <th className="text-left py-2 pr-4 text-gray-500 font-medium">Nama Biaya</th>
                                            <th className="text-right py-2 text-gray-500 font-medium">Nominal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {rekap.items.map(item => (
                                            <tr key={item.id_biaya_lain}>
                                                <td className="py-2 pr-4">{item.nama_biaya}</td>
                                                <td className="py-2 text-right">{formatRupiah(item.nominal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-gray-100 dark:border-gray-700">
                                            <td className="pt-2 pr-4 text-gray-500 font-medium">Total</td>
                                            <td className="pt-2 text-right font-bold text-blue-700 dark:text-blue-300">
                                                {formatRupiah(rekap.total_keseluruhan)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {trip.uang_jalan_alokasi != null && (
                    <div className="grid grid-cols-1 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 sm:grid-cols-2">
                        <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                            <div className="text-xs mb-1 text-gray-500">Uang Jalan (Alokasi)</div>
                            <div className="font-semibold text-sm">{formatRupiah(trip.uang_jalan_alokasi)}</div>
                        </div>
                        {(() => {
                            const selisihAlokasi = trip.uang_jalan_alokasi - (rekap?.total_keseluruhan ?? 0)
                            const positif = selisihAlokasi >= 0
                            return (
                                <div className={`rounded-lg p-3 border ${positif
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                                    <div className={`text-xs mb-1 ${positif ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        Selisih vs Realisasi
                                    </div>
                                    <div className={`font-semibold text-sm ${positif ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatRupiah(Math.abs(selisihAlokasi))} {positif ? '(sisa — dikembalikan supir)' : '(kurang — diganti perusahaan)'}
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                )}
            </Card>

            {trip.status === 'selesai' && trip.id_penugasan && (
                <div id="evaluasi-penugasan-card">
                    <EvaluasiPenugasanCard idPenugasan={trip.id_penugasan} sumber={trip.sumber ?? 'internal'} />
                </div>
            )}
            </div>

            <Dialog isOpen={titikDropDialogOpen} onRequestClose={closeTitikDropDialog} onClose={closeTitikDropDialog} width={520}>
                <h5 className="text-base font-semibold mb-1">Ubah Titik Drop</h5>
                <p className="text-xs text-gray-400 mb-4">Atur urutan titik drop untuk trip ini (maksimal 10 titik).</p>
                <form onSubmit={e => { e.preventDefault(); handleSubmitTitikDrop() }}>
                    <div className="max-h-[65vh] overflow-y-auto pr-1">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold">Titik Drop</p>
                            <Button type="button" size="xs" variant="plain" icon={<HiOutlinePlus />}
                                disabled={titikDropForm.length >= 10} onClick={tambahTitikDrop}>Tambah Titik</Button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {titikDropForm.length === 0 ? (
                                <p className="text-gray-400 text-xs py-2">Belum ada titik drop ditambahkan.</p>
                            ) : (
                                titikDropForm.map((lokasi, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                                        <Input size="sm" placeholder={`Titik drop ${i + 1}...`} value={lokasi}
                                            onChange={e => ubahTitikDrop(i, e.target.value)} />
                                        <button type="button" onClick={() => hapusTitikDrop(i)}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors">
                                            <HiOutlineTrash />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={closeTitikDropDialog}>Batal</Button>
                        <Button type="submit" variant="solid" loading={savingTitikDrop}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={!!aksiTrip}
                type={aksiTrip === 'batalkan' ? 'danger' : 'info'}
                title={aksiTrip ? AKSI_TITLE[aksiTrip] : ''}
                confirmText="Ya, Lanjutkan" cancelText="Batal"
                onClose={() => { setAksiTrip(null); setSelesaikanPenugasan(false) }}
                onCancel={() => { setAksiTrip(null); setSelesaikanPenugasan(false) }}
                onConfirm={handleAksiTrip}
                confirmButtonProps={{ loading: aksiLoading }}>
                <p>{aksiTrip ? AKSI_MESSAGE[aksiTrip] : ''}</p>
                {aksiTrip === 'selesai' && (
                    <div className="mt-3">
                        <Checkbox checked={selesaikanPenugasan} onChange={(checked: boolean) => setSelesaikanPenugasan(checked)}>
                            Sekalian selesaikan penugasan
                        </Checkbox>
                        <p className="text-xs text-gray-400 mt-1 ml-7">
                            Armada otomatis kembali tersedia setelah checkout. Centang bila ini rit terakhir — penugasan ikut ditutup. Biarkan kosong bila masih ada rit berikutnya.
                        </p>
                    </div>
                )}
            </ConfirmDialog>
        </div>
    )
}
