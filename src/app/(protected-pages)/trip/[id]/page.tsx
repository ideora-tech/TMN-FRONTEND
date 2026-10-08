'use client'
import { use, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Checkbox, Dialog, Input, Tag, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import PanelAlurStatus, { KELAS_TOMBOL_BATAL } from '@/components/shared/PanelAlurStatus'
import LaporanPerjalananPanel from '@/components/shared/LaporanPerjalananPanel'
import { ParameterTagihanCard } from '@/components/shared/ParameterTagihanTrip'
import { HiPlusCircle, HiArrowLeft, HiOutlineMap, HiOutlineTrash, HiOutlineBan, HiOutlinePlay, HiOutlineCheckCircle, HiOutlineClock, HiOutlineCheck, HiOutlineX, HiOutlinePaperAirplane, HiOutlineClipboardCheck, HiOutlineCash } from 'react-icons/hi'
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

const TAHAP_TRIP = [
    { status: 'belum_mulai', label: 'Belum Mulai' },
    { status: 'berjalan',    label: 'Berjalan' },
    { status: 'selesai',     label: 'Selesai' },
]

const LANGKAH_TRIP: Record<string, { judul: string; keterangan: string }> = {
    belum_mulai: { judul: 'Trip belum dimulai',    keterangan: 'Mulai trip saat armada berangkat dari titik jemput.' },
    berjalan:    { judul: 'Trip sedang berjalan',  keterangan: 'Selesaikan trip setelah armada tiba dan laporan perjalanan terisi.' },
    selesai:     { judul: 'Trip selesai',          keterangan: 'Data trip siap dipakai untuk penagihan ke klien.' },
    dibatalkan:  { judul: 'Trip dibatalkan',       keterangan: 'Tidak ada aksi lanjutan untuk trip ini.' },
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

const KELAS_IKON_NETRAL = 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-100'

const IKON_STATUS: Record<string, ReactNode> = {
    belum_mulai: <HiOutlineClock />,
    berjalan:    <HiOutlinePlay />,
    selesai:     <HiOutlineCheck />,
    dibatalkan:  <HiOutlineBan />,
}

const IKON_PENGAJUAN: Record<string, ReactNode> = {
    diajukan:          <HiOutlinePaperAirplane />,
    dicek:             <HiOutlineClipboardCheck />,
    menunggu_approval: <HiOutlineClock />,
    disetujui:         <HiOutlineCheck />,
    ditolak:           <HiOutlineX />,
    ditransfer:        <HiOutlineCash />,
}

function BarisRiwayat({ waktu, ikon, kelasIkon, judul, terakhir, children }: {
    waktu: string | null
    ikon: ReactNode
    kelasIkon: string
    judul: string
    terakhir: boolean
    children?: ReactNode
}) {
    return (
        <div className="flex gap-3">
            <div className="w-16 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400 leading-tight pt-1 tabular-nums">
                {waktu ? (
                    <>
                        {dayjs(waktu).format('DD MMM YYYY')}
                        <br />
                        {dayjs(waktu).format('HH:mm')}
                    </>
                ) : '—'}
            </div>
            <div className="flex flex-col items-center">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${kelasIkon}`}>
                    {ikon}
                </span>
                {!terakhir && <span className="flex-1 w-px bg-gray-200 dark:bg-gray-600 my-1" />}
            </div>
            <div className={`flex-1 min-w-0 ${terakhir ? '' : 'pb-6'}`}>
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 pt-1">{judul}</p>
                {children}
            </div>
        </div>
    )
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

    // Dikomen sementara bersamaan dengan tombol Ubah Titik Drop di bawah (25 Agu 2026)
    // const openTitikDropDialog = () => {
    //     setTitikDropForm(trip?.titik_drop ?? [])
    //     setTitikDropDialogOpen(true)
    // }
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

    const totalRealisasi = rekap?.total_keseluruhan ?? 0
    const rekapKosong = !rekapLoading && (!rekap || (rekap.total_keseluruhan === 0 && rekap.estimasi_biaya == null))
    const pembanding = [
        ...(rekap?.estimasi_biaya != null ? [{
            label: 'Estimasi Uang Jalan',
            nilai: rekap.estimasi_biaya,
            selisih: rekap.selisih ?? 0,
            teksPositif: 'Hemat',
            teksNegatif: 'Melebihi estimasi',
        }] : []),
        ...(trip.uang_jalan_alokasi != null ? [{
            label: 'Uang Jalan Diberikan',
            nilai: trip.uang_jalan_alokasi,
            selisih: trip.uang_jalan_alokasi - totalRealisasi,
            teksPositif: 'Sisa dikembalikan supir',
            teksNegatif: 'Kurang, diganti perusahaan',
        }] : []),
    ]

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

            <PanelAlurStatus
                judul="Alur Trip"
                tahap={TAHAP_TRIP}
                status={trip.status}
                statusLabel={STATUS_LABEL[trip.status] ?? trip.status}
                kelasIkon={STATUS_TAG[trip.status] ?? 'bg-gray-100 text-gray-600'}
                selesai={trip.status === 'selesai'}
                gagal={trip.status === 'dibatalkan' ? 'Trip ini telah dibatalkan dan tidak bisa diproses lebih lanjut.' : undefined}
                langkah={trip.status === 'dibatalkan' ? undefined : {
                    judul: LANGKAH_TRIP[trip.status]?.judul,
                    keterangan: trip.status === 'berjalan' && !trip.punya_laporan
                        ? (
                            <span
                                className="text-amber-600 dark:text-amber-400 cursor-pointer hover:underline"
                                onClick={() => document.getElementById('laporan-perjalanan-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            >
                                Isi laporan perjalanan dulu sebelum trip bisa diselesaikan.
                            </span>
                        )
                        : LANGKAH_TRIP[trip.status]?.keterangan,
                }}
                aksi={(trip.status === 'belum_mulai' || trip.status === 'berjalan') && (
                    <>
                        <Button size="sm" variant="plain" icon={<HiOutlineBan />} className={KELAS_TOMBOL_BATAL}
                            onClick={() => setAksiTrip('batalkan')} disabled={aksiLoading}>
                            Batalkan Trip
                        </Button>
                        {trip.status === 'belum_mulai' && (
                            <Button size="sm" variant="solid" icon={<HiOutlinePlay />} onClick={() => setAksiTrip('mulai')} disabled={aksiLoading}>
                                Mulai Trip
                            </Button>
                        )}
                        {trip.status === 'berjalan' && trip.punya_laporan && (
                            <Button size="sm" variant="solid" icon={<HiOutlineCheckCircle />} onClick={() => setAksiTrip('selesai')} disabled={aksiLoading}>
                                Selesaikan Trip
                            </Button>
                        )}
                    </>
                )}
            />

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
                        <Button size="sm" variant="default" onClick={() => router.push(ROUTES.TRIP)}>
                            Kembali
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

                {/* Ubah Titik Drop — dikomen sementara atas permintaan user (25 Agu 2026)
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
                */}
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="flex flex-col gap-4 min-w-0">
                    <Card className="flex-1">
                        <div className="flex justify-between items-start gap-3 mb-4">
                            <div>
                                <h5>Rekap Biaya</h5>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Biaya dari laporan perjalanan, dibandingkan dengan uang jalan trip ini</p>
                            </div>
                            {rekapLoading && <span className="text-xs text-gray-500 dark:text-gray-400">Memuat...</span>}
                        </div>

                        {rekapKosong && (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Belum ada data biaya untuk trip ini.</p>
                        )}

                        {pembanding.length > 0 && (
                            <div className={`grid grid-cols-1 gap-3 ${rekapKosong ? 'mt-4' : ''} ${pembanding.length === 1 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                                <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs text-blue-600 dark:text-blue-400">Total Realisasi</p>
                                    <p className="font-semibold text-base text-blue-700 dark:text-blue-300 mt-1 tabular-nums">{formatRupiah(totalRealisasi)}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Semua biaya di laporan</p>
                                </div>
                                {pembanding.map(b => {
                                    const positif = b.selisih >= 0
                                    return (
                                        <div key={b.label} className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{b.label}</p>
                                            <p className="font-semibold text-base text-gray-800 dark:text-gray-100 mt-1 tabular-nums">{formatRupiah(b.nilai)}</p>
                                            <p className={`text-xs font-medium mt-1 ${positif ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {positif ? b.teksPositif : b.teksNegatif} {formatRupiah(Math.abs(b.selisih))}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {!rekapKosong && (
                            <div className={pembanding.length > 0 ? 'mt-5' : ''}>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Rincian Biaya</p>
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {[
                                            { label: 'BBM',        nilai: rekap?.total_bbm ?? 0 },
                                            { label: 'Uang Jalan', nilai: rekap?.total_uang_jalan ?? 0 },
                                            { label: 'Uang Tol',   nilai: rekap?.total_uang_tol ?? 0 },
                                            { label: 'Biaya Lain', nilai: rekap?.total_biaya_lain ?? 0 },
                                        ].map(baris => (
                                            <tr key={baris.label}>
                                                <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{baris.label}</td>
                                                <td className="py-2 text-right text-gray-800 dark:text-gray-100 tabular-nums whitespace-nowrap">{formatRupiah(baris.nilai)}</td>
                                            </tr>
                                        ))}
                                        {rekap?.items.map(item => (
                                            <tr key={item.id_biaya_lain}>
                                                <td className="py-1.5 pr-4 pl-4 text-xs text-gray-500 dark:text-gray-400">{item.nama_biaya}</td>
                                                <td className="py-1.5 text-right text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">{formatRupiah(item.nominal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-gray-200 dark:border-gray-600">
                                            <td className="pt-2.5 pr-4 font-semibold text-gray-800 dark:text-gray-100">Total Realisasi</td>
                                            <td className="pt-2.5 text-right font-bold text-blue-700 dark:text-blue-300 tabular-nums whitespace-nowrap">{formatRupiah(totalRealisasi)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="flex flex-col gap-4 min-w-0">
                    <Card className={trip.pengajuan_uang_jalan ? undefined : 'flex-1'}>
                        <div className="flex justify-between items-start gap-3 mb-4">
                            <div>
                                <h5>Riwayat Status</h5>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Jejak perubahan status trip: kapan dan oleh siapa</p>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Diperbarui otomatis</span>
                        </div>
                        {statuses.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Belum ada riwayat status.</p>
                        ) : (
                            <div>
                                {statuses.map((s, i) => (
                                    <BarisRiwayat key={s.id_status}
                                        waktu={s.dibuat_pada}
                                        ikon={IKON_STATUS[s.status] ?? <HiOutlineClock />}
                                        kelasIkon={STATUS_TAG[s.status] ?? KELAS_IKON_NETRAL}
                                        judul={STATUS_LABEL[s.status] ?? s.status}
                                        terakhir={i === statuses.length - 1}>
                                        {s.keterangan && <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{s.keterangan}</p>}
                                        {s.dibuat_oleh_nama && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Oleh {s.dibuat_oleh_nama}
                                                {s.dibuat_oleh_peran && ` (${PERAN_LABEL[s.dibuat_oleh_peran] ?? s.dibuat_oleh_peran})`}
                                            </p>
                                        )}
                                        {s.latitude && s.longitude && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 tabular-nums">Koordinat: {s.latitude}, {s.longitude}</p>
                                        )}
                                    </BarisRiwayat>
                                ))}
                            </div>
                        )}
                    </Card>

                    {trip.pengajuan_uang_jalan && (
                        <Card className="flex-1">
                            <div className="flex justify-between items-start gap-3 mb-4">
                                <div className="min-w-0">
                                    <h5>Status Uang Jalan (Keuangan)</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
                                        {trip.pengajuan_uang_jalan.nomor_pengajuan} · {formatRupiah(trip.pengajuan_uang_jalan.nominal)}
                                    </p>
                                    {trip.pengajuan_uang_jalan.periode && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
                                            {formatRupiah(trip.pengajuan_uang_jalan.periode.tarif_per_hari)}/hari × {trip.pengajuan_uang_jalan.periode.jumlah_hari} hari ({dayjs(trip.pengajuan_uang_jalan.periode.dari).format('DD/MM')}–{dayjs(trip.pengajuan_uang_jalan.periode.sampai).format('DD/MM')})
                                        </p>
                                    )}
                                </div>
                                <Tag className={`${PENGAJUAN_TAG[trip.pengajuan_uang_jalan.status] ?? KELAS_IKON_NETRAL} border-0 font-semibold whitespace-nowrap`}>
                                    {PENGAJUAN_LABEL[trip.pengajuan_uang_jalan.status] ?? trip.pengajuan_uang_jalan.status}
                                </Tag>
                            </div>
                            <div>
                                {trip.pengajuan_uang_jalan.riwayat.map((r, i, semua) => (
                                    <BarisRiwayat key={i}
                                        waktu={r.waktu}
                                        ikon={IKON_PENGAJUAN[r.status] ?? <HiOutlineClock />}
                                        kelasIkon={PENGAJUAN_TAG[r.status] ?? KELAS_IKON_NETRAL}
                                        judul={PENGAJUAN_LABEL[r.status] ?? r.status}
                                        terakhir={i === semua.length - 1}>
                                        {r.keterangan && <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{r.keterangan}</p>}
                                        {r.oleh && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Oleh {r.oleh}</p>}
                                    </BarisRiwayat>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            <ParameterTagihanCard idTrip={id} statusTrip={trip.status} />

            <Card id="laporan-perjalanan-card">
                <LaporanPerjalananPanel idTrip={id} onSaved={fetchRekap} />
            </Card>

            <div className="flex justify-end">
                <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Kembali</Button>
            </div>

            <Dialog isOpen={titikDropDialogOpen} onRequestClose={closeTitikDropDialog} onClose={closeTitikDropDialog} width={520}>
                <h5 className="text-base font-semibold mb-1">Ubah Titik Drop</h5>
                <p className="text-xs text-gray-400 mb-4">Atur urutan titik drop untuk trip ini (maksimal 10 titik).</p>
                <form onSubmit={e => { e.preventDefault(); handleSubmitTitikDrop() }}>
                    <div className="max-h-[65vh] overflow-y-auto pr-1">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold">Titik Drop</p>
                            <Button type="button" size="xs" variant="solid" icon={<HiPlusCircle />}
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
                        <Button type="button" variant="plain" onClick={closeTitikDropDialog}>Kembali</Button>
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
