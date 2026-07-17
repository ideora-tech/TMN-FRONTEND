'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import dayjs from 'dayjs'
import { Card, Button, Tag, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlineCalendar } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { jadwalService, Jadwal } from '@/services/jadwal.service'
import { tripService, Trip } from '@/services/trip.service'

interface TripStatus {
    id_status: string
    status: string
    keterangan?: string
    latitude?: number
    longitude?: number
    dibuat_pada: string
}

const STATUS_TAG: Record<string, string> = {
    terjadwal:  'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    berjalan:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:    'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    dibatalkan: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

const STATUS_LABEL: Record<string, string> = {
    terjadwal:  'Terjadwal',
    berjalan:   'Berjalan',
    selesai:    'Selesai',
    dibatalkan: 'Dibatalkan',
}

type PendingAction = 'mulai' | 'selesai' | 'batalkan'

const ACTION_TITLE: Record<PendingAction, string> = {
    mulai:     'Mulai Trip',
    selesai:   'Selesaikan Trip',
    batalkan:  'Batalkan Trip',
}

const ACTION_MESSAGE: Record<PendingAction, string> = {
    mulai:    'Mulai trip untuk jadwal ini? Status akan berubah menjadi berjalan.',
    selesai:  'Selesaikan trip ini? Status akan berubah menjadi selesai.',
    batalkan: 'Batalkan trip ini? Tindakan ini tidak dapat dibatalkan.',
}

export default function JadwalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [jadwal, setJadwal]       = useState<Jadwal | null>(null)
    const [trip, setTrip]           = useState<Trip | null>(null)
    const [tripStatuses, setTripStatuses] = useState<TripStatus[]>([])
    const [loading, setLoading]     = useState(true)

    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    const fetchTrip = useCallback(async () => {
        try {
            const tripRes = await axios.get(API_ENDPOINTS.TRIP, { params: { id_jadwal: id } })
            const trips = tripRes.data?.data as Trip[] | undefined
            const found = trips?.find((t) => t.id_jadwal === id) ?? null
            setTrip(found)
            if (found) {
                const statusRes = await axios.get(API_ENDPOINTS.TRIP_STATUS(found.id_trip))
                setTripStatuses(statusRes.data?.data ?? [])
            } else {
                setTripStatuses([])
            }
        } catch {
            setTrip(null)
            setTripStatuses([])
        }
    }, [id])

    useEffect(() => {
        const load = async () => {
            try {
                const j = await jadwalService.get(id)
                setJadwal(j)
                await fetchTrip()
            } catch (err) {
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id, fetchTrip])

    const handleConfirmAction = async () => {
        if (!pendingAction) return
        setActionLoading(true)
        try {
            let currentTrip = trip
            if (!currentTrip) {
                currentTrip = await tripService.create({ id_jadwal: id })
            }
            if (pendingAction === 'mulai') {
                await tripService.checkin(currentTrip.id_trip)
            } else if (pendingAction === 'selesai') {
                await tripService.checkout(currentTrip.id_trip)
            } else {
                await tripService.batalkan(currentTrip.id_trip)
            }
            toast.push(<Notification type="success" title={`${ACTION_TITLE[pendingAction]} berhasil`} />)
            setPendingAction(null)
            await fetchTrip()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            await fetchTrip()
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!jadwal) return <div className="p-6 text-red-500">Jadwal tidak ditemukan.</div>

    const effectiveStatus: Jadwal['status'] = trip
        ? (trip.status === 'belum_mulai' ? 'terjadwal' : trip.status)
        : 'terjadwal'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.JADWAL)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Detail Jadwal</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi jadwal dan riwayat trip</p>
                </div>
            </div>

            <Card>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex-shrink-0 select-none">
                            <HiOutlineCalendar className="text-2xl" />
                        </div>
                        <div>
                            <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">
                                {jadwal.rute ?? 'Jadwal Keberangkatan'}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {jadwal.tgl_keberangkatan ? dayjs(jadwal.tgl_keberangkatan).format('DD MMM YYYY HH:mm') : '-'}
                            </p>
                        </div>
                    </div>
                    <Tag className={`${STATUS_TAG[effectiveStatus] ?? 'bg-gray-100 text-gray-700'} border-0 flex-shrink-0`}>
                        {STATUS_LABEL[effectiveStatus] ?? effectiveStatus}
                    </Tag>
                </div>

                <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {(
                        [
                            {
                                label: 'Tanggal Keberangkatan',
                                value: jadwal.tgl_keberangkatan
                                    ? dayjs(jadwal.tgl_keberangkatan).format('DD MMM YYYY HH:mm')
                                    : <span className="text-gray-400">-</span>,
                            },
                            {
                                label: 'Estimasi Tiba',
                                value: jadwal.estimasi_tiba
                                    ? dayjs(jadwal.estimasi_tiba).format('DD MMM YYYY HH:mm')
                                    : <span className="text-gray-400">-</span>,
                            },
                            {
                                label: 'Rute',
                                value: jadwal.rute ?? <span className="text-gray-400">-</span>,
                            },
                            {
                                label: 'ID Penugasan',
                                value: <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{jadwal.id_penugasan}</span>,
                            },
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
            </Card>

            {(effectiveStatus === 'terjadwal' || effectiveStatus === 'berjalan') && (
                <Card className="border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Aksi Trip
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Status saat ini: <span className="font-semibold">{effectiveStatus}</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {effectiveStatus === 'terjadwal' && (
                                <Button size="sm" variant="solid" onClick={() => setPendingAction('mulai')} disabled={actionLoading}>
                                    Mulai Trip
                                </Button>
                            )}
                            {effectiveStatus === 'berjalan' && (
                                <Button size="sm" variant="solid" onClick={() => setPendingAction('selesai')} disabled={actionLoading}>
                                    Selesaikan
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="default"
                                className={`${STATUS_TAG['dibatalkan']} border border-current`}
                                onClick={() => setPendingAction('batalkan')}
                                disabled={actionLoading}
                            >
                                Batalkan
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {tripStatuses.length > 0 && (
                <Card>
                    <h5 className="mb-4">Riwayat Status Trip</h5>
                    <div className="flex flex-col gap-2">
                        {tripStatuses.map(s => (
                            <div key={s.id_status} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                                <div className="flex justify-between items-start">
                                    <span className="font-medium">{s.status}</span>
                                    <span className="text-xs text-gray-400">{dayjs(s.dibuat_pada).format('DD/MM/YYYY HH:mm')}</span>
                                </div>
                                {s.keterangan && <div className="text-sm text-gray-600 mt-1">{s.keterangan}</div>}
                                {s.latitude && s.longitude && <div className="text-xs text-gray-400 mt-1">{s.latitude}, {s.longitude}</div>}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <ConfirmDialog
                isOpen={!!pendingAction}
                type={pendingAction === 'batalkan' ? 'danger' : 'info'}
                title={pendingAction ? ACTION_TITLE[pendingAction] : ''}
                confirmText="Ya, Lanjutkan"
                cancelText="Batal"
                onClose={() => setPendingAction(null)}
                onCancel={() => setPendingAction(null)}
                onConfirm={handleConfirmAction}
                confirmButtonProps={{ loading: actionLoading }}
            >
                <p>{pendingAction ? ACTION_MESSAGE[pendingAction] : ''}</p>
            </ConfirmDialog>
        </div>
    )
}
