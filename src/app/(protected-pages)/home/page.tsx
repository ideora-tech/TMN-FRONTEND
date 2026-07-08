'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card } from '@/components/ui'
import { PiTruckDuotone, PiBriefcaseDuotone, PiMapPinDuotone, PiReceiptDuotone, PiCurrencyCircleDollarDuotone, PiClockCountdownDuotone } from 'react-icons/pi'
import { formatRupiah } from '@/utils/formatNumber'

interface DashboardStats {
    tripBerjalan: number
    armadaAktif: number
    proyekBerjalan: number
    fakturDraft: number
    pendapatanBulanIni: number
    piutangBeredar: number
}

const EMPTY: DashboardStats = { tripBerjalan: 0, armadaAktif: 0, proyekBerjalan: 0, fakturDraft: 0, pendapatanBulanIni: 0, piutangBeredar: 0 }

export default function HomePage() {
    const [stats, setStats] = useState<DashboardStats>(EMPTY)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        axios.get('/api/proxy/dashboard/stats')
            .then(res => setStats(res.data?.data ?? EMPTY))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const cards = [
        { label: 'Trip Berjalan',        value: stats.tripBerjalan,                        icon: <PiMapPinDuotone className="text-3xl text-blue-500" />,    bg: 'bg-blue-50 dark:bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400' },
        { label: 'Armada Aktif',          value: stats.armadaAktif,                         icon: <PiTruckDuotone className="text-3xl text-emerald-500" />,  bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Proyek Berjalan',       value: stats.proyekBerjalan,                      icon: <PiBriefcaseDuotone className="text-3xl text-violet-500" />, bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
        { label: 'Faktur Draft',          value: stats.fakturDraft,                         icon: <PiReceiptDuotone className="text-3xl text-amber-500" />,   bg: 'bg-amber-50 dark:bg-amber-500/10',  text: 'text-amber-600 dark:text-amber-400' },
        { label: 'Pendapatan Bulan Ini',  value: formatRupiah(stats.pendapatanBulanIni),    icon: <PiCurrencyCircleDollarDuotone className="text-3xl text-green-500" />, bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400', isRupiah: true },
        { label: 'Piutang Beredar',       value: stats.piutangBeredar,                      icon: <PiClockCountdownDuotone className="text-3xl text-red-500" />, bg: 'bg-red-50 dark:bg-red-500/10',    text: 'text-red-600 dark:text-red-400' },
    ]

    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h4 className="font-bold">Dashboard</h4>
                <p className="text-sm text-gray-500 mt-0.5">Ringkasan operasional TMN Transport</p>
            </div>
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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