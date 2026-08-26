'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Button, Tag, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { PiMapPinDuotone, PiTruckDuotone, PiCurrencyCircleDollarDuotone } from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { laporanService, LaporanDetail } from '@/services/laporan.service'
import { tripService, Trip } from '@/services/trip.service'

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

const STATUS_TAG: Record<string, string> = {
    belum_mulai: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    berjalan:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:     'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    dibatalkan:  'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

const STATUS_LABEL: Record<string, string> = {
    belum_mulai: 'Belum Mulai', berjalan: 'Berjalan', selesai: 'Selesai', dibatalkan: 'Dibatalkan',
}

export default function LaporanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [laporan, setLaporan] = useState<LaporanDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [trips, setTrips]     = useState<Trip[]>([])
    const [totalTrips, setTotalTrips] = useState(0)

    useEffect(() => {
        laporanService.get(id)
            .then(setLaporan)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    useEffect(() => {
        if (!laporan?.id_proyek) return
        tripService.list({ id_proyek: laporan.id_proyek, limit: 100 })
            .then(res => { setTrips(res.data); setTotalTrips(res.meta.total) })
            .catch(() => {})
    }, [laporan?.id_proyek])

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!laporan) return <div className="p-6 text-red-500">Laporan tidak ditemukan.</div>

    const stats = [
        { label: 'Total Trip Selesai', value: `${formatNum(laporan.statistik.total_trip)} trip`, isRupiah: false, icon: <PiMapPinDuotone className="text-3xl text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
        { label: 'Total Jarak', value: `${formatNum(laporan.statistik.total_jarak_km)} km`, isRupiah: false, icon: <PiTruckDuotone className="text-3xl text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Total Biaya Operasional', value: formatRupiah(laporan.statistik.total_biaya), isRupiah: true, icon: <PiCurrencyCircleDollarDuotone className="text-3xl text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
    ]

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
                    <h3 className="font-bold">{laporan.kode_proyek} — {laporan.nama_proyek}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{laporan.nama_klien ?? 'Tanpa klien'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map(card => (
                    <Card key={card.label} className={card.bg}>
                        <div className="flex flex-col gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                                {card.icon}
                            </div>
                            <div className={`font-bold ${card.isRupiah ? 'text-lg' : 'text-3xl'} ${card.text}`}>{card.value}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Informasi Laporan</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Diserahkan Oleh</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{laporan.diserahkan_oleh ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Diserahkan Pada</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {laporan.diserahkan_pada ? dayjs(laporan.diserahkan_pada).format('DD MMM YYYY HH:mm') : '—'}
                        </p>
                    </div>
                </div>

                {laporan.ringkasan && (
                    <div className="mt-5">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Ringkasan</p>
                        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-700 dark:text-gray-300">{laporan.ringkasan}</div>
                    </div>
                )}

                <Link href={ROUTES.PROYEK_DETAIL(laporan.id_proyek)} className="inline-block text-blue-500 hover:underline text-xs mt-5">
                    Lihat Proyek
                </Link>
            </Card>

            <Card bodyClass="p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Trip dalam Proyek</p>
                    {totalTrips > trips.length && (
                        <p className="text-xs text-gray-400">Menampilkan {trips.length} dari {formatNum(totalTrips)} trip</p>
                    )}
                </div>
                {trips.length === 0 ? (
                    <p className="text-gray-400 text-sm py-8 text-center">Belum ada trip di proyek ini</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className={TH_CLASS}>Tanggal</th>
                                    <th className={TH_CLASS}>Rute</th>
                                    <th className={TH_CLASS}>Nopol</th>
                                    <th className={TH_CLASS}>Supir</th>
                                    <th className={TH_CLASS}>Sumber</th>
                                    <th className={TH_CLASS}>Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {trips.map(t => (
                                    <tr
                                        key={t.id_trip}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                        onClick={() => router.push(ROUTES.TRIP_DETAIL(t.id_trip))}
                                    >
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                            {t.waktu_berangkat ? dayjs(t.waktu_berangkat).format('DD MMM YYYY HH:mm') : '—'}
                                        </td>
                                        <td className="py-2.5 px-3">{t.rute ?? '—'}</td>
                                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs">{t.armada_nopol ?? '—'}</td>
                                        <td className="py-2.5 px-3">{t.supir_nama ?? '—'}</td>
                                        <td className="py-2.5 px-3">
                                            <Tag className={`text-xs ${t.sumber === 'vendor'
                                                ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'}`}>
                                                {t.sumber === 'vendor' ? 'Vendor' : 'Internal'}
                                            </Tag>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <Tag className={`text-xs font-semibold ${STATUS_TAG[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {STATUS_LABEL[t.status] ?? t.status}
                                            </Tag>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Batal</Button>
                </div>
            </Card>

        </div>
    )
}
