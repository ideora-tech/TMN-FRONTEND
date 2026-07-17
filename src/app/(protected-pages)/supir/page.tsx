'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification, Dialog, Upload } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineDownload, HiOutlineUpload } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { supirService, Supir } from '@/services/supir.service'
import axios from 'axios'

type StatusOption = { value: string; label: string }

const STATUS_OPTIONS: StatusOption[] = [
    { value: '',         label: 'Semua Status' },
    { value: 'aktif',    label: 'Aktif' },
    { value: 'nonaktif', label: 'Nonaktif' },
]

const STATUS_TAG: Record<string, string> = {
    aktif:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    nonaktif: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

type ImportGagal = { baris: number; nama: string; alasan: string }
type ImportResult = { berhasil: number; gagal: ImportGagal[] }

export default function SupirPage() {
    const router = useRouter()

    const [list, setList]             = useState<Supir[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const [deleteTarget, setDeleteTarget] = useState<Supir | null>(null)

    const [downloadingTemplate, setDownloadingTemplate] = useState(false)
    const [importing, setImporting]                     = useState(false)
    const [importResult, setImportResult]                 = useState<ImportResult | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await supirService.list(currentPage)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await supirService.delete(deleteTarget.id_supir)
            toast.push(<Notification type="success" title="Supir berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true)
        try {
            const res = await axios.get(API_ENDPOINTS.SUPIR_IMPORT_TEMPLATE, { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = 'template-import-supir.xlsx'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
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
            const fd = new FormData()
            fd.append('file', file)
            const { data } = await axios.post(API_ENDPOINTS.SUPIR_IMPORT, fd)
            const result = data.data as ImportResult
            setImportResult(result)
            if (result.berhasil > 0 && result.gagal.length === 0) {
                toast.push(<Notification type="success" title={`${result.berhasil} supir berhasil diimport`} />)
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
        if (berhasil > 0) fetchData()
    }

    const filteredList = list.filter(s => {
        const matchSearch = !search ||
            s.nama.toLowerCase().includes(search.toLowerCase()) ||
            (s.no_sim ?? '').toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || s.status === statusFilter
        return matchSearch && matchStatus
    })

    const columns: ColumnDef<Supir>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Supir, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Nama', accessorKey: 'nama', size: 240,
            cell: ({ row }: CellContext<Supir, unknown>) => {
                const initials = row.original.nama.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {initials}
                        </div>
                        <span className="font-semibold">{row.original.nama}</span>
                    </div>
                )
            },
        },
        {
            header: 'No SIM', accessorKey: 'no_sim', size: 160,
            cell: ({ row }: CellContext<Supir, unknown>) => (
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{row.original.no_sim ?? '-'}</span>
            ),
        },
        { header: 'Jenis SIM', accessorKey: 'jenis_sim', size: 110 },
        {
            header: 'Kadaluarsa SIM', accessorKey: 'tgl_kadaluarsa_sim', size: 170,
            cell: ({ row }: CellContext<Supir, unknown>) => {
                const tgl = row.original.tgl_kadaluarsa_sim
                if (!tgl) return '-'
                const daysLeft = Math.ceil((new Date(tgl).getTime() - Date.now()) / 86400000)
                const warn = daysLeft < 30
                return (
                    <span className={warn ? 'text-red-500 font-medium' : ''}>
                        {tgl}{warn ? ` (${daysLeft}h)` : ''}
                    </span>
                )
            },
        },
        {
            header: 'Status', accessorKey: 'status', size: 120,
            cell: ({ row }: CellContext<Supir, unknown>) => (
                <Tag className={STATUS_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {row.original.status}
                </Tag>
            ),
        },
        {
            header: '', id: 'action', size: 100,
            cell: ({ row }: CellContext<Supir, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Edit">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.SUPIR_DETAIL(row.original.id_supir))}
                        >
                            <HiOutlinePencilAlt className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                            onClick={() => setDeleteTarget(row.original)}
                        >
                            <HiOutlineTrash className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Supir</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Data master supir</p>
                </div>
                <div className="flex items-center gap-2">
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
                        onClick={() => router.push(ROUTES.SUPIR_BARU)}
                    >
                        Tambah Supir
                    </Button>
                </div>
            </div>
            <Card bodyClass="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari nama atau no SIM... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-44 shrink-0">
                        <Select<StatusOption>
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={(opt) => { setStatusFilter((opt as StatusOption).value); setCurrentPage(1) }}
                        />
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={filteredList as unknown[]}
                    loading={loading}
                    noData={!loading && filteredList.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Supir?"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">
                    Supir <span className="font-semibold">&ldquo;{deleteTarget?.nama}&rdquo;</span> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

            <Dialog isOpen={!!importResult} onRequestClose={handleCloseImportResult} width={560}>
                <h5 className="text-base font-semibold mb-4">Hasil Import Supir</h5>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {importResult?.berhasil ?? 0} supir berhasil diimport
                </p>
                {importResult && importResult.gagal.length > 0 && (
                    <div className="overflow-x-auto mt-4 max-h-80 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Baris</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Nama</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Alasan</th>
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
