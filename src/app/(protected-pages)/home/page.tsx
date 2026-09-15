'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Tabs from '@/components/ui/Tabs'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import DashboardOperasionalTab from './DashboardOperasionalTab'
import DashboardArmadaTab from './DashboardArmadaTab'
import DashboardBiayaPerawatanTab from './DashboardBiayaPerawatanTab'
import PanelApprovalSaya from './PanelApprovalSaya'

const ARMADA_AUTHORITY = ['dispatcher', 'manager', 'superadmin', 'admin']
const TAB_ARMADA = ['armada', 'biaya-perawatan']

export default function HomePage() {
    const { session } = useCurrentSession()
    const authority = ((session?.user?.authority ?? []) as string[]).map(a => a.toLowerCase())
    const bisaLihatArmada = authority.some(a => ARMADA_AUTHORITY.includes(a))

    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const initialTab = tabParam && TAB_ARMADA.includes(tabParam) && bisaLihatArmada ? tabParam : 'operasional'
    const [activeTab, setActiveTab] = useState<string>(initialTab)

    return (
        <div className="flex flex-col gap-4 p-6">
            <div>
                <h4 className="font-bold">Dashboard</h4>
                <p className="text-sm text-gray-500 mt-0.5">Ringkasan operasional TMN Transport</p>
            </div>
            <PanelApprovalSaya />
            <Tabs value={activeTab} onChange={val => setActiveTab(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="operasional">Operasional</Tabs.TabNav>
                    {bisaLihatArmada && <Tabs.TabNav value="armada">Armada</Tabs.TabNav>}
                    {bisaLihatArmada && <Tabs.TabNav value="biaya-perawatan">Biaya Perawatan</Tabs.TabNav>}
                </Tabs.TabList>
                <div className="mt-4">
                    <Tabs.TabContent value="operasional"><DashboardOperasionalTab /></Tabs.TabContent>
                    {bisaLihatArmada && (
                        <Tabs.TabContent value="armada"><DashboardArmadaTab /></Tabs.TabContent>
                    )}
                    {bisaLihatArmada && (
                        <Tabs.TabContent value="biaya-perawatan"><DashboardBiayaPerawatanTab /></Tabs.TabContent>
                    )}
                </div>
            </Tabs>
        </div>
    )
}
