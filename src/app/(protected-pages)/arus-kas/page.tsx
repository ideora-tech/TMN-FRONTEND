'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui'
import { HiPlusCircle } from 'react-icons/hi'
import Tabs from '@/components/ui/Tabs'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import RekapTab from './RekapTab'
import PengeluaranTab from './PengeluaranTab'
import PemasukanTab from './PemasukanTab'

const TAB_VALUES = ['pemasukan', 'pengeluaran', 'rekap'] as const
type TabValue = (typeof TAB_VALUES)[number]

export default function ArusKasPage() {
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const initialTab: TabValue = TAB_VALUES.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'rekap'
    const [activeTab, setActiveTab] = useState<TabValue>(initialTab)
    const [tambahTick, setTambahTick] = useState(0)

    const { session } = useCurrentSession()
    const authority = ((session?.user?.authority ?? []) as string[]).map(a => a.toLowerCase())
    const bolehKelolaPemasukan = ['keuangan', 'superadmin'].some(r => authority.includes(r))

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-bold">Arus Kas</h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Rekap pemasukan &amp; pengeluaran perusahaan
                    </p>
                </div>
                {activeTab === 'pemasukan' && bolehKelolaPemasukan && (
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => setTambahTick(t => t + 1)}>
                        Tambah Pemasukan
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onChange={val => { setActiveTab(val as TabValue); setTambahTick(0) }}>
                <Tabs.TabList>
                    <Tabs.TabNav value="pemasukan">Pemasukan</Tabs.TabNav>
                    <Tabs.TabNav value="pengeluaran">Pengeluaran</Tabs.TabNav>
                    <Tabs.TabNav value="rekap">Arus Kas</Tabs.TabNav>
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="pemasukan"><PemasukanTab tambahTrigger={tambahTick} /></Tabs.TabContent>
                    <Tabs.TabContent value="pengeluaran"><PengeluaranTab /></Tabs.TabContent>
                    <Tabs.TabContent value="rekap"><RekapTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
