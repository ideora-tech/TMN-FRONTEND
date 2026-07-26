'use client'
import { useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import PengajuanTab from './PengajuanTab'
import SaldoTab from './SaldoTab'
import JenisCutiTab from './JenisCutiTab'

export default function CutiPage() {
    const [activeTab, setActiveTab] = useState('pengajuan')

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Cuti &amp; Izin</h3>
                <p className="text-gray-500 text-sm mt-0.5">Pengajuan cuti karyawan &amp; supir, saldo, dan jenis cuti</p>
            </div>

            <Tabs value={activeTab} onChange={val => setActiveTab(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="pengajuan">Pengajuan</Tabs.TabNav>
                    <Tabs.TabNav value="saldo">Saldo</Tabs.TabNav>
                    <Tabs.TabNav value="jenis">Jenis Cuti</Tabs.TabNav>
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="pengajuan"><PengajuanTab /></Tabs.TabContent>
                    <Tabs.TabContent value="saldo"><SaldoTab /></Tabs.TabContent>
                    <Tabs.TabContent value="jenis"><JenisCutiTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
