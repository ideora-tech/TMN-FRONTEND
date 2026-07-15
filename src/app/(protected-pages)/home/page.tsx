'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import dayjs from 'dayjs'
import { Card, toast, Notification } from '@/components/ui'
import {
    PiTruckDuotone,
    PiGarageDuotone,
    PiBriefcaseDuotone,
    PiMapPinDuotone,
    PiReceiptDuotone,
    PiCurrencyCircleDollarDuotone,
    PiClockCountdownDuotone,
} from 'react-icons/pi'
import { HiOutlineExclamationCircle } from 'react-icons/hi'
import { formatRupiah } from '@/utils/formatNumber'
import { parseApiError } from '@/utils/error.util'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { ROUTES } from '@/constants/route.constant'

interface DashboardStats {
    tripBerjalan: number
    armadaTersedia: number
    armadaBeroperasi: number
    proyekBerjalan: number
    fakturDraft: number
    pendapatanBulanIni: number
    piutangBeredar: number
    alerts?: {
        dokumenExpiring: {
            total: number
            items: { jenis_dokumen: string; pemilik: string; berlaku_sampai: string; tipe: 'armada' | 'vendor' }[]
        }
        tripTerlambat: {
            total: number
            items: { id_trip: string; nama_proyek: string; jam_berjalan: number }[]
        }
    }
}

const EMPTY: DashboardStats = {
    tripBerjalan: 0,
    armadaTersedia: 0,
    armadaBeroperasi: 0,
    proyekBerjalan: 0,
    fakturDraft: 0,
    pendapatanBulanIni: 0,
    piutangBeredar: 0,
}

export default function HomePage() {
    const [stats, setStats] = useState<DashboardStats>(EMPTY)
    const [loading, setLoading] = useState(true)
    const [showAllDokumen, setShowAllDokumen] = useState(false)

    useEffect(() => {
        axios.get(API_ENDPOINTS.DASHBOARD_STATS)
            .then(res => setStats(res.data?.data ?? EMPTY))
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [])

    const dokumenExpiring = stats.alerts?.dokumenExpiring
    const tripTerlambat   = stats.alerts?.tripTerlambat

    const cards = [
        { label: 'Trip Berjalan',        value: stats.tripBerjalan,                        icon: <PiMapPinDuotone className="text-3xl text-blue-500" />,    bg: 'bg-blue-50 dark:bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400' },
        { label: 'Armada Tersedia',      value: stats.armadaTersedia,                      icon: <PiGarageDuotone className="text-3xl text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Armada Beroperasi',    value: stats.armadaBeroperasi,                    icon: <PiTruckDuotone className="text-3xl text-blue-500" />,     bg: 'bg-blue-50 dark:bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400' },
        { label: 'Proyek Berjalan',      value: stats.proyekBerjalan,                      icon: <PiBriefcaseDuotone className="text-3xl text-violet-500" />, bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
        { label: 'Faktur Draft',         value: stats.fakturDraft,                         icon: <PiReceiptDuotone className="text-3xl text-amber-500" />,   bg: 'bg-amber-50 dark:bg-amber-500/10',  text: 'text-amber-600 dark:text-amber-400' },
        { label: 'Pendapatan Bulan Ini', value: formatRupiah(stats.pendapatanBulanIni),    icon: <PiCurrencyCircleDollarDuotone className="text-3xl text-green-500" />, bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400', isRupiah: true },
        { label: 'Piutang Beredar',      value: stats.piutangBeredar,                      icon: <PiClockCountdownDuotone className="text-3xl text-red-500" />, bg: 'bg-red-50 dark:bg-red-500/10',    text: 'text-red-600 dark:text-red-400' },
    ]

    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h4 className="font-bold">Dashboard</h4>
                <p className="text-sm text-gray-500 mt-0.5">Ringkasan operasional TMN Transport</p>
            </div>

            {!loading && dokumenExpiring && dokumenExpiring.total > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                    <div className="flex items-center gap-3">
                        <HiOutlineExclamationCircle className="text-lg flex-shrink-0" />
                        <span><strong>{dokumenExpiring.total} dokumen</strong> kadaluarsa ≤30 hari</span>
                    </div>
                    <ul className="mt-2 ml-8 list-disc space-y-1">
                        {(showAllDokumen ? dokumenExpiring.items : dokumenExpiring.items.slice(0, 3)).map((item, idx) => (
                            <li key={idx}>
                                {item.pemilik} — {item.jenis_dokumen}, {dayjs(item.berlaku_sampai).format('DD MMM YYYY')}
                            </li>
                        ))}
                    </ul>
                    {dokumenExpiring.items.length > 3 && (
                        <button
                            type="button"
                            onClick={() => setShowAllDokumen((v) => !v)}
                            className="mt-2 ml-8 text-xs font-semibold underline text-amber-700 dark:text-amber-400"
                        >
                            {showAllDokumen ? 'Sembunyikan' : `Lihat semua (${dokumenExpiring.items.length})`}
                        </button>
                    )}
                </div>
            )}

            {!loading && tripTerlambat && tripTerlambat.total > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    <div className="flex items-center gap-3">
                        <HiOutlineExclamationCircle className="text-lg flex-shrink-0" />
                        <span><strong>{tripTerlambat.total} trip</strong> terlambat</span>
                    </div>
                    <ul className="mt-2 ml-8 list-disc space-y-1">
                        {tripTerlambat.items.map((item) => (
                            <li key={item.id_trip}>
                                <Link href={ROUTES.TRIP_DETAIL(item.id_trip)} className="font-medium hover:underline">
                                    {item.nama_proyek}
                                </Link>
                                {' '}— berjalan {item.jam_berjalan} jam
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <div className="flex flex-col gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
                                <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                    {cards.map((card) => (
                        <Card key={card.label} className={card.bg}>
                            <div className="flex flex-col gap-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                                    {card.icon}
                                </div>
                                <div className={`font-bold ${card.isRupiah ? 'text-lg' : 'text-3xl'} ${card.text}`}>
                                    {card.value}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
