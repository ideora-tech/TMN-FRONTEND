'use client'
import { useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import InputHarianTab from './InputHarianTab'
import RekapBulananTab from './RekapBulananTab'

export default function AbsensiPage() {
    const [activeTab, setActiveTab] = useState('harian')

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Absensi</h3>
                <p className="text-gray-500 text-sm mt-0.5">Input kehadiran harian karyawan &amp; rekap bulanan — supir tercatat otomatis dari trip</p>
            </div>

            <Tabs value={activeTab} onChange={val => setActiveTab(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="harian">Input Harian</Tabs.TabNav>
                    <Tabs.TabNav value="rekap">Rekap Bulanan</Tabs.TabNav>
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="harian"><InputHarianTab /></Tabs.TabContent>
                    <Tabs.TabContent value="rekap"><RekapBulananTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
