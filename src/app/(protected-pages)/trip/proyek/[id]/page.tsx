'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Tag, Tooltip, Pagination, Spinner, toast, Notification } from '@/components/ui'
import {
    HiArrowLeft,
    HiOutlineEye,
    HiOutlineDocumentText,
} from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { tripService, Trip } from '@/services/trip.service'
import { projectService, Project } from '@/services/project.service'
import dayjs from 'dayjs'

const STATUS_LABEL: Record<string, string> = {
    belum_mulai: 'Belum Mulai',
    berjalan:    'Berjalan',
    selesai:     'Selesai',
    dibatalkan:  'Dibatalkan',
}

const STATUS_TAG: Record<string, string> = {
    belum_mulai: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    berjalan:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:     'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    dibatalkan:  'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

export default function TripProyekDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [proyek, setProyek]               = useState<Project | null>(null)
    const [proyekLoading, setProyekLoading] = useState(true)

    const [list, setList]       = useState<Trip[]>([])
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]                    = useState(10)
    const [total, setTotal]             = useState(0)

    useEffect(() => {
        projectService.get(id)
            .then(setProyek)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setProyekLoading(false))
    }, [id])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await tripService.list({ id_proyek: id, page: currentPage, limit: pageSize })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [id, currentPage, pageSize])

    useEffect(() => { fetchData() }, [fetchData])

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
                    <h3 className="font-bold">
                        {proyekLoading ? 'Memuat...' : proyek?.nama_proyek ?? 'Proyek tidak ditemukan'}
                        {proyek?.kode_proyek && <span className="text-gray-400 font-normal text-base"> ({proyek.kode_proyek})</span>}
                    </h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftar trip untuk proyek ini</p>
                </div>
            </div>

            <Card bodyClass="p-0">
                {loading ? (
                    <div className="flex justify-center py-16"><Spinner size={40} /></div>
                ) : list.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Belum ada trip untuk proyek ini.</p>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {list.map(trip => (
                            <div
                                key={trip.id_trip}
                                className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2">
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{trip.rute ?? <span className="text-gray-400">—</span>}</p>
                                        {trip.waktu_berangkat && (
                                            <p className="text-xs text-gray-400">{dayjs(trip.waktu_berangkat).format('DD/MM/YY HH:mm')}</p>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate">{trip.supir_nama ?? <span className="text-gray-400">—</span>}</p>
                                        <p className="text-xs text-gray-400 truncate">{trip.armada_nopol ?? '—'}</p>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        <p>Check-in: {trip.waktu_checkin ? dayjs(trip.waktu_checkin).format('DD/MM/YY HH:mm') : '-'}</p>
                                        <p>Check-out: {trip.waktu_checkout ? dayjs(trip.waktu_checkout).format('DD/MM/YY HH:mm') : '-'}</p>
                                    </div>
                                    <div>
                                        <Tag className={STATUS_TAG[trip.status] ?? 'bg-gray-100 text-gray-600'}>
                                            {STATUS_LABEL[trip.status] ?? trip.status}
                                        </Tag>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                                    <Tooltip title="Detail">
                                        <span
                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                            onClick={() => router.push(ROUTES.TRIP_DETAIL(trip.id_trip))}
                                        >
                                            <HiOutlineEye className="text-lg" />
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Isi Laporan">
                                        <span
                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors"
                                            onClick={() => router.push(`${ROUTES.TRIP_DETAIL(trip.id_trip)}?laporan=1`)}
                                        >
                                            <HiOutlineDocumentText className="text-lg" />
                                        </span>
                                    </Tooltip>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {!loading && total > pageSize && (
                <div className="flex justify-end">
                    <Pagination currentPage={currentPage} total={total} pageSize={pageSize} onChange={setCurrentPage} />
                </div>
            )}
        </div>
    )
}
