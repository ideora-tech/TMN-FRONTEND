'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Card, toast, Notification } from '@/components/ui'
import {
    PiTruckDuotone,
    PiGarageDuotone,
    PiSteeringWheelDuotone,
    PiWrenchDuotone,
    PiCalendarCheckDuotone,
    PiWarningCircleDuotone,
} from 'react-icons/pi'
import { formatNum } from '@/utils/formatNumber'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { armadaService, type DashboardArmada } from '@/services/armada.service'

const EMPTY: DashboardArmada = {
    statistik: {
        total: 0, tersedia: 0, digunakan: 0, perawatan: 0, tidak_aktif: 0,
        dalamPerawatan: 0, terjadwal: 0, harusServis: 0,
    },
    harusServis: [],
    perawatanAktif: [],
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    dalam_proses: { label: 'Dalam Proses', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
    terjadwal:    { label: 'Terjadwal',    className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
}

const TH_CLASS = 'px-4 py-2 text-left font-semibold'
const TD_CLASS = 'px-4 py-2.5'

export default function DashboardArmadaPage() {
    const router = useRouter()
    const [data, setData] = useState<DashboardArmada>(EMPTY)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        armadaService.dashboard()
            .then(setData)
            .catch((err) => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [])

    const { statistik } = data
    const keDetail = (id: string) => router.push(ROUTES.ARMADA_DETAIL(id))

    const cards = [
        { label: 'Total Armada',     value: statistik.total,          icon: <PiTruckDuotone className="text-3xl text-blue-500" />,          bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400' },
        { label: 'Tersedia',         value: statistik.tersedia,       icon: <PiGarageDuotone className="text-3xl text-emerald-500" />,      bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Digunakan',        value: statistik.digunakan,      icon: <PiSteeringWheelDuotone className="text-3xl text-violet-500" />, bg: 'bg-violet-50 dark:bg-violet-500/10',  text: 'text-violet-600 dark:text-violet-400' },
        { label: 'Dalam Perawatan',  value: statistik.dalamPerawatan, icon: <PiWrenchDuotone className="text-3xl text-amber-500" />,        bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400' },
        { label: 'Terjadwal Servis', value: statistik.terjadwal,      icon: <PiCalendarCheckDuotone className="text-3xl text-blue-500" />,  bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400' },
        { label: 'Harus Diservis',   value: statistik.harusServis,    icon: <PiWarningCircleDuotone className="text-3xl text-red-500" />,   bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-400' },
    ]

    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h4 className="font-bold">Dashboard Armada</h4>
                <p className="text-sm text-gray-500 mt-0.5">
                    Pantau armada yang harus diservis dan yang sedang dalam perawatan
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                    {cards.map((card) => (
                        <Card key={card.label} className={card.bg}>
                            <div className="flex flex-col gap-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                                    {card.icon}
                                </div>
                                <div className={`font-bold text-3xl ${card.text}`}>{formatNum(card.value)}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Card>
                <h5 className="font-semibold mb-4">Harus Diservis</h5>
                {!loading && data.harusServis.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">Tidak ada armada yang harus diservis 🎉</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr>
                                    <th className={TH_CLASS}>Nopol</th>
                                    <th className={TH_CLASS}>Jenis Perawatan</th>
                                    <th className={TH_CLASS}>Jatuh Tempo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.harusServis.map((item, idx) => {
                                    const lewat = item.basis === 'km'
                                        ? (item.sisa_km ?? 0) <= 0
                                        : dayjs(item.jadwal_servis_berikutnya).isBefore(dayjs(), 'day')
                                    return (
                                        <tr
                                            key={`${item.id_armada}-${idx}`}
                                            className="border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                            onClick={() => keDetail(item.id_armada)}
                                        >
                                            <td className={`${TD_CLASS} font-semibold`}>{item.nopol}</td>
                                            <td className={TD_CLASS}>{item.jenis_perawatan}</td>
                                            <td className={TD_CLASS}>
                                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    lewat
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                                }`}>
                                                    {item.basis === 'km'
                                                        ? `KM — sisa ${formatNum(item.sisa_km ?? 0)} km`
                                                        : `Hari — ${dayjs(item.jadwal_servis_berikutnya).format('DD MMM YYYY')}`}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card>
                <h5 className="font-semibold mb-4">Sedang Dalam Perawatan</h5>
                {!loading && data.perawatanAktif.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">Tidak ada perawatan yang sedang berjalan</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr>
                                    <th className={TH_CLASS}>Nopol</th>
                                    <th className={TH_CLASS}>Jenis Perawatan</th>
                                    <th className={TH_CLASS}>Tanggal</th>
                                    <th className={TH_CLASS}>KM Odometer</th>
                                    <th className={TH_CLASS}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.perawatanAktif.map((item) => {
                                    const badge = STATUS_BADGE[item.status]
                                    return (
                                        <tr
                                            key={item.id_perawatan}
                                            className="border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                            onClick={() => keDetail(item.id_armada)}
                                        >
                                            <td className={`${TD_CLASS} font-semibold`}>{item.nopol}</td>
                                            <td className={TD_CLASS}>{item.jenis_perawatan}</td>
                                            <td className={TD_CLASS}>{dayjs(item.tanggal).format('DD MMM YYYY')}</td>
                                            <td className={TD_CLASS}>{item.km_odometer !== null ? `${formatNum(item.km_odometer)} km` : '—'}</td>
                                            <td className={TD_CLASS}>
                                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
