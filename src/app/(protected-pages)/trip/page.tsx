'use client'
import { useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import TripAktifTab from './TripAktifTab'
import RiwayatTripTab from './RiwayatTripTab'
import AlokasiArmadaTab from './AlokasiArmadaTab'

export default function TripPage() {
    const [activeTab, setActiveTab] = useState('aktif')

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Trip</h3>
                <p className="text-gray-500 text-sm mt-0.5">Monitor trip aktif per proyek — riwayat trip selesai ada di tab Riwayat</p>
            </div>

            <Tabs value={activeTab} onChange={val => setActiveTab(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="aktif">Trip Aktif</Tabs.TabNav>
                    <Tabs.TabNav value="riwayat">Riwayat</Tabs.TabNav>
                    <Tabs.TabNav value="alokasi">Alokasi Armada</Tabs.TabNav>
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="aktif"><TripAktifTab /></Tabs.TabContent>
                    <Tabs.TabContent value="riwayat"><RiwayatTripTab /></Tabs.TabContent>
                    <Tabs.TabContent value="alokasi"><AlokasiArmadaTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
