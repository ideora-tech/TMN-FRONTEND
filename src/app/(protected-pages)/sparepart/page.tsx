'use client'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button, Dialog, Upload, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineDownload, HiOutlineUpload } from 'react-icons/hi'
import Tabs from '@/components/ui/Tabs'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { sparepartService, ImportSparepartHasil } from '@/services/sparepart.service'
import SparepartTab from './SparepartTab'
import KategoriTab from './KategoriTab'

const TAB_VALUES = ['sparepart', 'kategori'] as const
type TabValue = (typeof TAB_VALUES)[number]

export default function SparepartPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const initialTab: TabValue = TAB_VALUES.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'sparepart'
    const [activeTab, setActiveTab] = useState<TabValue>(initialTab)

    const [downloadingTemplate, setDownloadingTemplate] = useState(false)
    const [importing, setImporting]                     = useState(false)
    const [importResult, setImportResult]               = useState<ImportSparepartHasil | null>(null)
    const [refreshKey, setRefreshKey]                   = useState(0)

    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true)
        try {
            await sparepartService.downloadTemplate()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingTemplate(false)
        }
    }

    const handleImportFile = async (files: File[]) => {
        const file = files[0]
        if (!file) return
        setImporting(true)
        try {
            const result = await sparepartService.importExcel(file)
            setImportResult(result)
            if (result.berhasil > 0 && result.gagal.length === 0) {
                toast.push(<Notification type="success" title={`${result.berhasil} spare part berhasil diimport`} />)
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setImporting(false)
        }
    }

    const handleCloseImportResult = () => {
        const berhasil = importResult?.berhasil ?? 0
        setImportResult(null)
        if (berhasil > 0) setRefreshKey(k => k + 1)
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Spare Part</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Data master spare part, kategori, dan paket standar per servis</p>
                </div>
                {activeTab === 'sparepart' ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm" variant="default"
                            icon={<HiOutlineDownload />}
                            loading={downloadingTemplate}
                            onClick={handleDownloadTemplate}
                        >
                            Unduh Template
                        </Button>
                        <Upload accept=".xlsx,.xls" showList={false} uploadLimit={1} onChange={handleImportFile}>
                            <Button
                                type="button" size="sm" variant="default"
                                icon={<HiOutlineUpload />}
                                loading={importing}
                            >
                                Import Excel
                            </Button>
                        </Upload>
                        <Button
                            variant="solid" size="sm"
                            icon={<HiPlusCircle />}
                            onClick={() => router.push(ROUTES.SPAREPART_BARU)}
                        >
                            Tambah Spare Part
                        </Button>
                    </div>
                ) : (
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                        onClick={() => router.push(ROUTES.KATEGORI_SPAREPART_BARU)}>
                        Tambah Kategori
                    </Button>
                )}
            </div>
            <Tabs value={activeTab} onChange={val => setActiveTab(val as TabValue)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="sparepart">Spare Part</Tabs.TabNav>
                    <Tabs.TabNav value="kategori">Kategori</Tabs.TabNav>
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="sparepart"><SparepartTab refreshKey={refreshKey} /></Tabs.TabContent>
                    <Tabs.TabContent value="kategori"><KategoriTab /></Tabs.TabContent>
                </div>
            </Tabs>

            <Dialog isOpen={!!importResult} onRequestClose={handleCloseImportResult} onClose={handleCloseImportResult} width={560}>
                <h5 className="text-base font-semibold mb-4">Hasil Import Spare Part</h5>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {importResult?.berhasil ?? 0} spare part berhasil diimport
                </p>
                {importResult && importResult.gagal.length > 0 && (
                    <div className="overflow-x-auto mt-4 max-h-80 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Baris</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Nama</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Alasan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {importResult.gagal.map((g, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{g.baris}</td>
                                        <td className="py-2.5 px-3 text-xs text-gray-800 dark:text-gray-200">{g.nama || '-'}</td>
                                        <td className="py-2.5 px-3 text-red-500">{g.alasan}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex justify-end mt-6">
                    <Button variant="solid" onClick={handleCloseImportResult}>Tutup</Button>
                </div>
            </Dialog>
        </div>
    )
}
