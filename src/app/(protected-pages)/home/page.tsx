'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Tabs from '@/components/ui/Tabs'
import useAksesMenu from '@/utils/hooks/useAksesMenu'
import DashboardOperasionalTab from './DashboardOperasionalTab'
import DashboardArmadaTab from './DashboardArmadaTab'
import DashboardBiayaPerawatanTab from './DashboardBiayaPerawatanTab'
import DashboardKeuanganTab from './DashboardKeuanganTab'
import PanelApprovalSaya from './PanelApprovalSaya'

export default function HomePage() {
    const bolehMenu = useAksesMenu()
    const bisaLihatArmada = bolehMenu('/armada')
    const bisaLihatBiayaPerawatan = bolehMenu('/perawatan-armada', '/armada')
    const bisaLihatKeuangan = bolehMenu('/piutang')
    const tabBoleh: Record<string, boolean> = {
        armada: bisaLihatArmada,
        'biaya-perawatan': bisaLihatBiayaPerawatan,
        keuangan: bisaLihatKeuangan,
    }

    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const initialTab = tabParam && tabBoleh[tabParam] ? tabParam : 'operasional'
    const [tabDipilih, setActiveTab] = useState<string>(initialTab)
    const activeTab = tabDipilih === 'operasional' || tabBoleh[tabDipilih] ? tabDipilih : 'operasional'

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
                    {bisaLihatBiayaPerawatan && <Tabs.TabNav value="biaya-perawatan">Biaya Perawatan</Tabs.TabNav>}
                    {bisaLihatKeuangan && <Tabs.TabNav value="keuangan">Keuangan</Tabs.TabNav>}
                </Tabs.TabList>
                <div className="mt-4">
                    <Tabs.TabContent value="operasional"><DashboardOperasionalTab /></Tabs.TabContent>
                    {bisaLihatArmada && (
                        <Tabs.TabContent value="armada"><DashboardArmadaTab /></Tabs.TabContent>
                    )}
                    {bisaLihatBiayaPerawatan && (
                        <Tabs.TabContent value="biaya-perawatan"><DashboardBiayaPerawatanTab /></Tabs.TabContent>
                    )}
                    {bisaLihatKeuangan && (
                        <Tabs.TabContent value="keuangan"><DashboardKeuanganTab tampilHutang={bolehMenu('/invoice-vendor')} /></Tabs.TabContent>
                    )}
                </div>
            </Tabs>
        </div>
    )
}
