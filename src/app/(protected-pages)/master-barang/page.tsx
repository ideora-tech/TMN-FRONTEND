'use client'
import { useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import DaftarBarangTab from './DaftarBarangTab'
import KategoriBarangTab from './KategoriBarangTab'

export default function MasterBarangPage() {
    const [tab, setTab] = useState('barang')
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Master Barang</h3>
                <p className="text-gray-500 text-sm mt-0.5">Katalog barang umum (ATK, perlengkapan, dll), stok, dan pemakaian</p>
            </div>
            <Tabs value={tab} onChange={val => setTab(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="barang">Daftar Barang</Tabs.TabNav>
                    <Tabs.TabNav value="kategori">Kategori</Tabs.TabNav>
                </Tabs.TabList>
                <div className="mt-4">
                    <Tabs.TabContent value="barang"><DaftarBarangTab /></Tabs.TabContent>
                    <Tabs.TabContent value="kategori"><KategoriBarangTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
