'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import Tabs from '@/components/ui/Tabs'
import { ROUTES } from '@/constants/route.constant'
import VendorTab from './VendorTab'
import KontrakVendorTab from './KontrakVendorTab'
import ArmadaVendorTab from './ArmadaVendorTab'
import SupirVendorTab from './SupirVendorTab'
import PenugasanVendorTab from './PenugasanVendorTab'
import EvaluasiVendorTab from './EvaluasiVendorTab'

const TAB_VALUES = ['vendor', 'kontrak', 'armada', 'supir', 'penugasan', 'evaluasi']

export default function VendorPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab') ?? 'vendor'
    const activeTab = TAB_VALUES.includes(tabParam) ? tabParam : 'vendor'

    const handleTabChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', val)
        router.replace(`${ROUTES.VENDOR}?${params.toString()}`)
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Vendor</h3>
                <p className="text-gray-500 text-sm mt-0.5">Master vendor, kontrak, armada &amp; supir vendor, penugasan, dan evaluasi vendor</p>
            </div>

            <Tabs value={activeTab} onChange={val => handleTabChange(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="vendor">Data Vendor</Tabs.TabNav>
                    <Tabs.TabNav value="kontrak">Kontrak</Tabs.TabNav>
                    <Tabs.TabNav value="armada">Armada</Tabs.TabNav>
                    <Tabs.TabNav value="supir">Supir</Tabs.TabNav>
                    <Tabs.TabNav value="penugasan">Penugasan</Tabs.TabNav>
                    <Tabs.TabNav value="evaluasi">Evaluasi</Tabs.TabNav>
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="vendor"><VendorTab /></Tabs.TabContent>
                    <Tabs.TabContent value="kontrak"><KontrakVendorTab /></Tabs.TabContent>
                    <Tabs.TabContent value="armada"><ArmadaVendorTab /></Tabs.TabContent>
                    <Tabs.TabContent value="supir"><SupirVendorTab /></Tabs.TabContent>
                    <Tabs.TabContent value="penugasan"><PenugasanVendorTab /></Tabs.TabContent>
                    <Tabs.TabContent value="evaluasi"><EvaluasiVendorTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
