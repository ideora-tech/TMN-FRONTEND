'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card } from '@/components/ui'
import { PiTruckDuotone, PiBriefcaseDuotone, PiMapPinDuotone, PiReceiptDuotone } from 'react-icons/pi'

interface Stats {
    tripBerjalan: number
    armadaAktif: number
    proyekBerjalan: number
    fakturDraft: number
}

const statCards = (stats: Stats) => [
    { label: 'Trip Berjalan',   value: stats.tripBerjalan,   icon: <PiMapPinDuotone className="text-3xl text-blue-500" />,   bg: 'bg-blue-50' },
    { label: 'Armada Aktif',    value: stats.armadaAktif,    icon: <PiTruckDuotone className="text-3xl text-emerald-500" />, bg: 'bg-emerald-50' },
    { label: 'Proyek Berjalan', value: stats.proyekBerjalan, icon: <PiBriefcaseDuotone className="text-3xl text-violet-500" />, bg: 'bg-violet-50' },
    { label: 'Faktur Draft',    value: stats.fakturDraft,    icon: <PiReceiptDuotone className="text-3xl text-amber-500" />,  bg: 'bg-amber-50' },
]

export default function HomePage() {
    const [stats, setStats] = useState<Stats>({ tripBerjalan: 0, armadaAktif: 0, proyekBerjalan: 0, fakturDraft: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            axios.get('/api/proxy/trip?status=berjalan&limit=1'),
            axios.get('/api/proxy/armada?status=aktif&limit=1'),
            axios.get('/api/proxy/proyek?status=berjalan&limit=1'),
            axios.get('/api/proxy/faktur?status=draft&limit=1'),
        ])
            .then(([trip, armada, proyek, faktur]) => {
                setStats({
                    tripBerjalan:   trip.data?.meta?.total ?? 0,
                    armadaAktif:    armada.data?.meta?.total ?? 0,
                    proyekBerjalan: proyek.data?.meta?.total ?? 0,
                    fakturDraft:    faktur.data?.meta?.total ?? 0,
                })
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="p-6">
            <h4 className="mb-6">Dashboard TMN Transport</h4>
            {loading ? (
                <div className="text-gray-500">Memuat...</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {statCards(stats).map((card) => (
                        <Card key={card.label} className={card.bg}>
                            <div className="flex flex-col gap-2">
                                {card.icon}
                                <div className="text-3xl font-bold">{card.value}</div>
                                <div className="text-sm text-gray-600">{card.label}</div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
