'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui'
import Tabs from '@/components/ui/Tabs'
import { HiPlusCircle } from 'react-icons/hi'
import { ROUTES } from '@/constants/route.constant'
import KontrakVendorTab from '../vendor/KontrakVendorTab'
import PermintaanSiapKontrakTab from '../vendor/PermintaanSiapKontrakTab'

const TAB_VALUES = ['kontrak', 'permintaan'] as const
type TabValue = (typeof TAB_VALUES)[number]

export default function KontrakVendorPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const initialTab: TabValue = TAB_VALUES.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'kontrak'
    const [activeTab, setActiveTab] = useState<TabValue>(initialTab)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Kontrak Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola kontrak kerja sama dengan vendor</p>
                </div>
                {activeTab === 'kontrak' && (
                    <Button
                        variant="solid" size="sm"
                        icon={<HiPlusCircle />}
                        onClick={() => router.push(ROUTES.KONTRAK_VENDOR_BARU)}
                    >
                        Tambah Kontrak
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onChange={val => setActiveTab(val as TabValue)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="kontrak">Kontrak Vendor</Tabs.TabNav>
                    <Tabs.TabNav value="permintaan">Permintaan dari Sales</Tabs.TabNav>
                </Tabs.TabList>
                <div className="mt-4">
                    <Tabs.TabContent value="kontrak"><KontrakVendorTab /></Tabs.TabContent>
                    <Tabs.TabContent value="permintaan"><PermintaanSiapKontrakTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
