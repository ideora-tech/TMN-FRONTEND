'use client'
import { useState } from 'react'
import axios from 'axios'
import { Button, Dialog, Upload, toast, Notification } from '@/components/ui'
import { HiOutlineDownload, HiOutlineUpload, HiOutlineDocumentDownload } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { unduhDariApi } from '@/utils/unduhBerkas'

type ImportGagal = { baris: number; kunci: string; alasan: string }
type ImportResult = { berhasil: number; gagal: ImportGagal[] }

type Props = {
    templateUrl: string
    importUrl: string
    templateFilename: string
    exportUrl?: string
    exportFilename?: string
    /** Label entitas untuk judul dialog & toast, mis. "vendor", "armada vendor". */
    entityLabel: string
    /** Label kolom kunci di tabel hasil gagal, mis. "Kode", "Nopol", "Nama". */
    kunciLabel?: string
    /** Dipanggil setelah dialog hasil ditutup bila ada baris yang berhasil masuk. */
    onImported?: () => void
}

export default function ImportExcelButtons({
    templateUrl, importUrl, templateFilename, exportUrl, exportFilename, entityLabel, kunciLabel = 'Data', onImported,
}: Props) {
    const [downloadingTemplate, setDownloadingTemplate] = useState(false)
    const [importing, setImporting]                     = useState(false)
    const [exporting, setExporting]                     = useState(false)
    const [importResult, setImportResult]               = useState<ImportResult | null>(null)

    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true)
        try {
            await unduhDariApi(templateUrl, {}, templateFilename)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingTemplate(false)
        }
    }

    const handleExport = async () => {
        if (!exportUrl || exporting) return
        setExporting(true)
        try {
            await unduhDariApi(exportUrl, {}, exportFilename ?? `data-${entityLabel.replace(/\s+/g, '-')}.xlsx`)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setExporting(false)
        }
    }

    const handleImportFile = async (files: File[]) => {
        const file = files[0]
        if (!file) return
        setImporting(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const { data } = await axios.post(importUrl, fd)
            const result = data?.data as ImportResult | undefined
            if (!result || typeof result.berhasil !== 'number' || !Array.isArray(result.gagal)) {
                throw new Error('Sesi berakhir atau jawaban server tidak dikenali — masuk lagi lalu ulangi import')
            }
            setImportResult(result)
            if (result.berhasil > 0 && result.gagal.length === 0) {
                toast.push(<Notification type="success" title={`${result.berhasil} ${entityLabel} berhasil diimport`} />)
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
        if (berhasil > 0) onImported?.()
    }

    return (
        <>
            {exportUrl && (
                <Button
                    type="button" size="sm" variant="default"
                    icon={<HiOutlineDocumentDownload />}
                    loading={exporting}
                    onClick={handleExport}
                >
                    Export Excel
                </Button>
            )}
            <Button
                type="button" size="sm" variant="default"
                icon={<HiOutlineDownload />}
                loading={downloadingTemplate}
                onClick={handleDownloadTemplate}
            >
                Unduh Template
            </Button>
            <Upload accept=".xlsx,.xls" showList={false} uploadLimit={1} disabled={importing} onChange={handleImportFile}>
                <Button
                    type="button" size="sm" variant="default"
                    icon={<HiOutlineUpload />}
                    loading={importing}
                >
                    Import Excel
                </Button>
            </Upload>

            <Dialog isOpen={!!importResult} onRequestClose={handleCloseImportResult} onClose={handleCloseImportResult} width={560}>
                <h5 className="text-base font-semibold mb-4">Hasil Import {entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)}</h5>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {importResult?.berhasil ?? 0} {entityLabel} berhasil diimport
                </p>
                {importResult && importResult.gagal.length > 0 && (
                    <div className="overflow-x-auto mt-4 max-h-80 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Baris</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">{kunciLabel}</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Alasan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {importResult.gagal.map((g, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{g.baris}</td>
                                        <td className="py-2.5 px-3 font-mono text-xs text-gray-800 dark:text-gray-200">{g.kunci || '-'}</td>
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
        </>
    )
}
