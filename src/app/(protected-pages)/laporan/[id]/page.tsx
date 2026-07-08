'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { laporanService, Laporan } from '@/services/laporan.service'
import dayjs from 'dayjs'

export default function LaporanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [laporan, setLaporan] = useState<Laporan | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        laporanService.get(id)
            .then(setLaporan)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!laporan) return <div className="p-6 text-red-500">Laporan tidak ditemukan.</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.LAPORAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Detail Laporan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi laporan perjalanan</p>
                </div>
            </div>
            <Card>
                <div className="flex flex-col gap-0">
                    {[
                        { label: 'ID Laporan',  value: <span className="font-mono text-sm">{laporan.id_laporan}</span> },
                        { label: 'ID Proyek',   value: <span className="font-mono text-sm">{laporan.id_proyek}</span> },
                        { label: 'Total Trip',  value: <span className="font-semibold">{laporan.total_trip}</span> },
                        { label: 'Diserahkan',  value: laporan.diserahkan_pada ? dayjs(laporan.diserahkan_pada).format('DD/MM/YYYY HH:mm') : '-' },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-2 border-b last:border-b-0">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium">{value}</span>
                        </div>
                    ))}
                    {laporan.ringkasan && (
                        <div className="pt-3">
                            <div className="text-gray-500 mb-2">Ringkasan</div>
                            <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">{laporan.ringkasan}</div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
