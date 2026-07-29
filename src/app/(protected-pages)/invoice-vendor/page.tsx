'use client'
import { useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import DaftarInvoiceTab from './DaftarInvoiceTab'
import MonitoringPembayaranTab from './MonitoringPembayaranTab'

export default function InvoiceVendorPage() {
    const [activeTab, setActiveTab] = useState('daftar')

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Invoice Vendor</h3>
                <p className="text-gray-500 text-sm mt-0.5">Kelola tagihan vendor, verifikasi, dan monitoring pembayaran</p>
            </div>

            <Tabs value={activeTab} onChange={val => setActiveTab(val as string)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="daftar">Daftar Invoice</Tabs.TabNav>
                    <Tabs.TabNav value="monitoring">Monitoring Pembayaran</Tabs.TabNav>
                </Tabs.TabList>
                <div className="mt-4">
                    <Tabs.TabContent value="daftar"><DaftarInvoiceTab /></Tabs.TabContent>
                    <Tabs.TabContent value="monitoring"><MonitoringPembayaranTab /></Tabs.TabContent>
                </div>
            </Tabs>
        </div>
    )
}
