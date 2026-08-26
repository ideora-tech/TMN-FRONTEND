'use client'
import { useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import EvaluasiVendorTab from '../vendor/EvaluasiVendorTab'
import PenilaianVendorTab from './PenilaianVendorTab'

export default function EvaluasiVendorPage() {
    const [activeTab, setActiveTab] = useState('penilaian')

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Evaluasi Vendor</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                    Nilai kinerja vendor dari penugasan yang sudah selesai — rekap per vendor ada di tab Rekap
                </p>
            </div>

            <Tabs value={activeTab} onChange={val => setActiveTab(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="penilaian">Penilaian</Tabs.TabNav>
                    <Tabs.TabNav value="rekap">Rekap Vendor</Tabs.TabNav>
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="penilaian"><PenilaianVendorTab /></Tabs.TabContent>
                    <Tabs.TabContent value="rekap"><EvaluasiVendorTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
