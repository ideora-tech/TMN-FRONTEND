'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { tripService, Trip, StatusTrip } from '@/services/trip.service'
import dayjs from 'dayjs'

const statusClass: Record<string, string> = {
    belum_mulai: 'bg-gray-100 text-gray-700',
    berjalan:    'bg-blue-100 text-blue-600',
    selesai:     'bg-emerald-100 text-emerald-600',
    dibatalkan:  'bg-red-100 text-red-500',
}

export default function TripDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [trip, setTrip]       = useState<Trip | null>(null)
    const [statuses, setStatuses] = useState<StatusTrip[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        tripService.get(params.id)
            .then(setTrip)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [params.id])

    useEffect(() => {
        const load = () => tripService.getStatus(params.id).then(setStatuses).catch(console.error)
        load()
        const interval = setInterval(load, 30_000)
        return () => clearInterval(interval)
    }, [params.id])

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!trip)   return <div className="p-6 text-red-500">Trip tidak ditemukan.</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.TRIP)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Detail Trip</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan riwayat status trip</p>
                </div>
            </div>

            <Card className="mb-4">
                <div className="flex justify-end mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass[trip.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {trip.status}
                    </span>
                </div>
                <div className="flex flex-col gap-0">
                    {[
                        { label: 'ID Trip',    value: <span className="font-mono text-sm">{trip.id_trip}</span> },
                        { label: 'ID Jadwal',  value: <span className="font-mono text-sm">{trip.id_jadwal}</span> },
                        { label: 'Check-in',   value: trip.waktu_checkin  ? dayjs(trip.waktu_checkin).format('DD/MM/YYYY HH:mm')  : '-' },
                        { label: 'Check-out',  value: trip.waktu_checkout ? dayjs(trip.waktu_checkout).format('DD/MM/YYYY HH:mm') : '-' },
                        ...(trip.catatan ? [{ label: 'Catatan', value: trip.catatan }] : []),
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-2 border-b last:border-b-0">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium">{value}</span>
                        </div>
                    ))}
                </div>
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
                            <div key={s.id_status} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                                <div className="flex justify-between items-start">
                                    <span className="font-medium">{s.status}</span>
                                    <span className="text-xs text-gray-400">{dayjs(s.dibuat_pada).format('DD/MM/YYYY HH:mm')}</span>
                                </div>
                                {s.keterangan && <div className="text-sm text-gray-600 mt-1">{s.keterangan}</div>}
                                {s.latitude && s.longitude && <div className="text-xs text-gray-400 mt-1">Koordinat: {s.latitude}, {s.longitude}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}
