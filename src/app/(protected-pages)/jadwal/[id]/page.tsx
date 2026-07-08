'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Card, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { jadwalService, Jadwal } from '@/services/jadwal.service'

interface TripStatus {
    id_status: string
    status: string
    keterangan?: string
    latitude?: number
    longitude?: number
    dibuat_pada: string
}

const statusClass: Record<string, string> = {
    terjadwal:  'bg-blue-100 text-blue-600',
    berjalan:   'bg-emerald-100 text-emerald-600',
    selesai:    'bg-emerald-200 text-emerald-800',
    dibatalkan: 'bg-red-100 text-red-500',
}

export default function JadwalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [jadwal, setJadwal]       = useState<Jadwal | null>(null)
    const [tripStatuses, setTripStatuses] = useState<TripStatus[]>([])
    const [loading, setLoading]     = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const j = await jadwalService.get(id)
                setJadwal(j)
                try {
                    const tripRes = await axios.get(API_ENDPOINTS.TRIP, { params: { id_jadwal: id } })
                    const trips = tripRes.data?.data
                    if (trips && trips.length > 0) {
                        const statusRes = await axios.get(API_ENDPOINTS.TRIP_STATUS(trips[0].id_trip))
                        setTripStatuses(statusRes.data?.data ?? [])
                    }
                } catch { /* no trip for this jadwal */ }
            } catch (err) {
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!jadwal) return <div className="p-6 text-red-500">Jadwal tidak ditemukan.</div>

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

            <Card className="mb-4">
                <div className="flex justify-end mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass[jadwal.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {jadwal.status}
                    </span>
                </div>
                <div className="flex flex-col gap-0">
                    {[
                        { label: 'Tgl Keberangkatan', value: jadwal.tgl_keberangkatan ?? '-' },
                        { label: 'Rute',              value: jadwal.rute ?? '-' },
                        { label: 'ID Penugasan',      value: <span className="font-mono text-sm">{jadwal.id_penugasan}</span> },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-2 border-b last:border-b-0">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium">{value}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {tripStatuses.length > 0 && (
                <Card>
                    <h5 className="mb-4">Riwayat Status Trip</h5>
                    <div className="flex flex-col gap-2">
                        {tripStatuses.map(s => (
                            <div key={s.id_status} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                                <div className="flex justify-between items-start">
                                    <span className="font-medium">{s.status}</span>
                                    <span className="text-xs text-gray-400">{new Date(s.dibuat_pada).toLocaleString()}</span>
                                </div>
                                {s.keterangan && <div className="text-sm text-gray-600 mt-1">{s.keterangan}</div>}
                                {s.latitude && s.longitude && <div className="text-xs text-gray-400 mt-1">{s.latitude}, {s.longitude}</div>}
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}
