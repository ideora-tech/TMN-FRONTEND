'use client'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { HiPlusCircle } from 'react-icons/hi'
import Tabs from '@/components/ui/Tabs'
import { ROUTES } from '@/constants/route.constant'
import PerawatanArmadaTab from './PerawatanArmadaTab'
import IntervalPerawatanTab from './IntervalPerawatanTab'
import JenisPerawatanTab from './JenisPerawatanTab'

const TAB_VALUES = ['armada', 'interval', 'jenis'] as const
type TabValue = (typeof TAB_VALUES)[number]

const TAB_META: Record<TabValue, { addLabel: string; addRoute: string }> = {
    armada:   { addLabel: 'Catat Perawatan', addRoute: ROUTES.PERAWATAN_ARMADA_BARU },
    interval: { addLabel: 'Tambah Interval', addRoute: ROUTES.INTERVAL_PERAWATAN_BARU },
    jenis:    { addLabel: 'Tambah Jenis Perawatan', addRoute: ROUTES.JENIS_PERAWATAN_BARU },
}

export default function PerawatanArmadaPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const initialTab: TabValue = TAB_VALUES.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'armada'
    const [activeTab, setActiveTab] = useState<TabValue>(initialTab)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Perawatan Armada</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Riwayat perawatan seluruh armada</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(TAB_META[activeTab].addRoute)}>
                    {TAB_META[activeTab].addLabel}
                </Button>
            </div>
            <Tabs value={activeTab} onChange={val => setActiveTab(val as TabValue)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="armada">Perawatan Armada</Tabs.TabNav>
                    <Tabs.TabNav value="interval">Interval Perawatan</Tabs.TabNav>
                    <Tabs.TabNav value="jenis">Jenis Perawatan</Tabs.TabNav>
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="armada"><PerawatanArmadaTab /></Tabs.TabContent>
                    <Tabs.TabContent value="interval"><IntervalPerawatanTab /></Tabs.TabContent>
                    <Tabs.TabContent value="jenis"><JenisPerawatanTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
