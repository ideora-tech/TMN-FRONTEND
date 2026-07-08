'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { tripService, Trip, StatusTrip } from '@/services/trip.service'
import { formatRupiah } from '@/utils/formatNumber'
import axios from 'axios'
import dayjs from 'dayjs'

const statusClass: Record<string, string> = {
    belum_mulai: 'bg-gray-100 text-gray-700',
    berjalan:    'bg-blue-100 text-blue-600',
    selesai:     'bg-emerald-100 text-emerald-600',
    dibatalkan:  'bg-red-100 text-red-500',
}

type LaporanItem = {
    id_faktur_item: string
    deskripsi: string
    qty: number
    harga_satuan: number
    subtotal: number
    nomor_faktur: string
}

type RekapBiaya = {
    total_bbm: number
    total_uang_jalan: number
    total_biaya_lain: number
    total_keseluruhan: number
    items: LaporanItem[]
}

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [trip, setTrip]                 = useState<Trip | null>(null)
    const [statuses, setStatuses]         = useState<StatusTrip[]>([])
    const [loading, setLoading]           = useState(true)
    const [rekap, setRekap]               = useState<RekapBiaya | null>(null)
    const [rekapLoading, setRekapLoading] = useState(true)

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

    useEffect(() => {
        axios.get(`/api/proxy/trip/${id}/rekap-biaya`)
            .then(res => setRekap(res.data?.data ?? null))
            .catch(() => {}) // silently fail if no data yet
            .finally(() => setRekapLoading(false))
    }, [id])

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

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h5>Rekap Biaya</h5>
                    {rekapLoading && <span className="text-xs text-gray-400">Memuat...</span>}
                </div>

                {!rekapLoading && (!rekap || rekap.total_keseluruhan === 0) ? (
                    <div className="text-gray-400 text-sm">Belum ada data biaya untuk trip ini.</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
                            {[
                                { label: 'Total BBM',         value: rekap?.total_bbm ?? 0 },
                                { label: 'Total Uang Jalan',  value: rekap?.total_uang_jalan ?? 0 },
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

                        {rekap && rekap.items.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 pr-4 text-gray-500 font-medium">Deskripsi</th>
                                            <th className="text-left py-2 pr-4 text-gray-500 font-medium">No. Faktur</th>
                                            <th className="text-right py-2 pr-4 text-gray-500 font-medium">Qty</th>
                                            <th className="text-right py-2 pr-4 text-gray-500 font-medium">Harga Satuan</th>
                                            <th className="text-right py-2 text-gray-500 font-medium">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rekap.items.map(item => (
                                            <tr key={item.id_faktur_item} className="border-b last:border-b-0">
                                                <td className="py-2 pr-4">{item.deskripsi}</td>
                                                <td className="py-2 pr-4 text-gray-500 font-mono text-xs">{item.nomor_faktur}</td>
                                                <td className="py-2 pr-4 text-right">{item.qty}</td>
                                                <td className="py-2 pr-4 text-right">{formatRupiah(item.harga_satuan)}</td>
                                                <td className="py-2 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2">
                                            <td colSpan={4} className="pt-2 pr-4 text-gray-500 font-medium">Total</td>
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
            </Card>
        </div>
    )
}