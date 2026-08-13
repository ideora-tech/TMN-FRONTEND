'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import Tabs from '@/components/ui/Tabs'
import { HiPlusCircle } from 'react-icons/hi'
import { ROUTES } from '@/constants/route.constant'
import DaftarInvoiceTab from './DaftarInvoiceTab'
import MonitoringPembayaranTab from './MonitoringPembayaranTab'

export default function InvoiceVendorPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('daftar')

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Invoice Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola tagihan vendor, verifikasi, dan monitoring pembayaran</p>
                </div>
                {activeTab === 'daftar' && (
                    <Button
                        variant="solid" size="sm"
                        icon={<HiPlusCircle />}
                        onClick={() => router.push(ROUTES.INVOICE_VENDOR_BARU)}
                    >
                        Tambah Invoice
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onChange={val => setActiveTab(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="daftar">Daftar Invoice</Tabs.TabNav>
                    <Tabs.TabNav value="monitoring">Monitoring Pembayaran</Tabs.TabNav>
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="daftar"><DaftarInvoiceTab /></Tabs.TabContent>
                    <Tabs.TabContent value="monitoring"><MonitoringPembayaranTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
