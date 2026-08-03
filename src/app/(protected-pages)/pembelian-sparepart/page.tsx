'use client'
import { useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import DaftarPembelianTab from './DaftarPembelianTab'
import LaporanPembelianTab from './LaporanPembelianTab'

export default function PembelianSparepartPage() {
    const [activeTab, setActiveTab] = useState('daftar')

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Pembelian Sparepart</h3>
                <p className="text-gray-500 text-sm mt-0.5">Pengajuan, approval, realisasi, dan laporan pembelian sparepart</p>
            </div>

            <Tabs value={activeTab} onChange={val => setActiveTab(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="daftar">Daftar Pembelian</Tabs.TabNav>
                    <Tabs.TabNav value="laporan">Laporan</Tabs.TabNav>
                </Tabs.TabList>
                <div className="mt-4">
                    <Tabs.TabContent value="daftar"><DaftarPembelianTab /></Tabs.TabContent>
                    <Tabs.TabContent value="laporan"><LaporanPembelianTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
