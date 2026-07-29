'use client'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { HiPlusCircle } from 'react-icons/hi'
import Tabs from '@/components/ui/Tabs'
import { ROUTES } from '@/constants/route.constant'
import SparepartTab from './SparepartTab'
import KategoriTab from './KategoriTab'
import PaketTab from './PaketTab'

const TAB_VALUES = ['sparepart', 'kategori', 'paket'] as const
type TabValue = (typeof TAB_VALUES)[number]

const TAB_META: Record<TabValue, { addLabel: string; addRoute: string }> = {
    sparepart: { addLabel: 'Tambah Spare Part', addRoute: ROUTES.SPAREPART_BARU },
    kategori:  { addLabel: 'Tambah Kategori', addRoute: ROUTES.KATEGORI_SPAREPART_BARU },
    paket:     { addLabel: 'Tambah Paket', addRoute: ROUTES.PAKET_PERAWATAN_SPAREPART_BARU },
}

export default function SparepartPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const initialTab: TabValue = TAB_VALUES.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'sparepart'
    const [activeTab, setActiveTab] = useState<TabValue>(initialTab)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Spare Part</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Data master spare part, kategori, dan paket standar per servis</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(TAB_META[activeTab].addRoute)}>
                    {TAB_META[activeTab].addLabel}
                </Button>
            </div>
            <Tabs value={activeTab} onChange={val => setActiveTab(val as TabValue)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="sparepart">Spare Part</Tabs.TabNav>
                    <Tabs.TabNav value="kategori">Kategori</Tabs.TabNav>
                    <Tabs.TabNav value="paket">Paket Spare Part</Tabs.TabNav>
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="sparepart"><SparepartTab /></Tabs.TabContent>
                    <Tabs.TabContent value="kategori"><KategoriTab /></Tabs.TabContent>
                    <Tabs.TabContent value="paket"><PaketTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
