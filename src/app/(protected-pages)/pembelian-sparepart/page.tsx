'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import Tabs from '@/components/ui/Tabs'
import { HiPlusCircle } from 'react-icons/hi'
import { ROUTES } from '@/constants/route.constant'
import DaftarPembelianTab from './DaftarPembelianTab'
import LaporanPembelianTab from './LaporanPembelianTab'

export default function PembelianSparepartPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('daftar')

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Pembelian Sparepart</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Pengajuan, approval, realisasi, dan laporan pembelian sparepart</p>
                </div>
                {activeTab === 'daftar' && (
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                        onClick={() => router.push(ROUTES.PEMBELIAN_SPAREPART_BARU)}>
                        Tambah Pengajuan
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onChange={val => setActiveTab(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="daftar">Daftar Pembelian</Tabs.TabNav>
                    <Tabs.TabNav value="laporan">Laporan</Tabs.TabNav>
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="daftar"><DaftarPembelianTab /></Tabs.TabContent>
                    <Tabs.TabContent value="laporan"><LaporanPembelianTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
