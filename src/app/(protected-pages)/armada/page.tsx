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
import { armadaService, Armada, ArmadaServisJatuhTempo } from '@/services/armada.service'
import axios from 'axios'

type StatusOption = { value: string; label: string }

const STATUS_OPTIONS: StatusOption[] = [
    { value: '',            label: 'Semua Status' },
    { value: 'tersedia',    label: 'Tersedia' },
    { value: 'digunakan',   label: 'Digunakan' },
    { value: 'perawatan',   label: 'Perawatan' },
    { value: 'tidak_aktif', label: 'Tidak Aktif' },
]

const STATUS_LABEL: Record<string, string> = {
    tersedia:    'Tersedia',
    digunakan:   'Digunakan',
    perawatan:   'Perawatan',
    tidak_aktif: 'Tidak Aktif',
}

const STATUS_TAG: Record<string, string> = {
    tersedia:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    digunakan:   'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    perawatan:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
    tidak_aktif: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

type ImportGagal = { baris: number; nopol: string; alasan: string }
type ImportResult = { berhasil: number; gagal: ImportGagal[] }

export default function ArmadaPage() {
    const router = useRouter()

    const [list, setList]             = useState<Armada[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [servisJatuhTempo, setServisJatuhTempo] = useState<ArmadaServisJatuhTempo[]>([])

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const [deleteTarget, setDeleteTarget] = useState<Armada | null>(null)

    const [downloadingTemplate, setDownloadingTemplate] = useState(false)
    const [importing, setImporting]                     = useState(false)
    const [importResult, setImportResult]                 = useState<ImportResult | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await armadaService.list(currentPage)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        armadaService.servisJatuhTempo().then(setServisJatuhTempo).catch(() => {})
    }, [])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await armadaService.delete(deleteTarget.id_armada)
            toast.push(<Notification type="success" title="Armada berhasil dihapus" />)
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
            const res = await axios.get(API_ENDPOINTS.ARMADA_IMPORT_TEMPLATE, { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = 'template-import-armada.xlsx'
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
            const { data } = await axios.post(API_ENDPOINTS.ARMADA_IMPORT, fd)
            const result = data.data as ImportResult
            setImportResult(result)
            if (result.berhasil > 0 && result.gagal.length === 0) {
                toast.push(<Notification type="success" title={`${result.berhasil} armada berhasil diimport`} />)
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

    const filteredList = list.filter(a => {
        const matchSearch = !search ||
            a.nopol.toLowerCase().includes(search.toLowerCase()) ||
            (a.merk ?? '').toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || a.status === statusFilter
        return matchSearch && matchStatus
    })

    const columns: ColumnDef<Armada>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Armada, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Nopol', accessorKey: 'nopol', size: 160,
            cell: ({ row }: CellContext<Armada, unknown>) => (
                <span className="font-mono font-semibold">{row.original.nopol}</span>
            ),
        },
        { header: 'Merk / Tipe', accessorKey: 'merk', size: 260,
            cell: ({ row }: CellContext<Armada, unknown>) => {
                const label = row.original.merk ?? '-'
                const initials = label.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {initials}
                        </div>
                        <span className="font-semibold">{label}</span>
                    </div>
                )
            },
        },
        { header: 'Tahun', accessorKey: 'tahun', size: 90 },
        {
            header: 'Status', accessorKey: 'status', size: 120,
            cell: ({ row }: CellContext<Armada, unknown>) => (
                <Tag className={STATUS_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {STATUS_LABEL[row.original.status] ?? row.original.status}
                </Tag>
            ),
        },
        {
            header: 'Servis',
            id: 'servis',
            size: 130,
            cell: ({ row }: CellContext<Armada, unknown>) => {
                const servis = servisJatuhTempo.find(s => s.id_armada === row.original.id_armada)
                if (!servis) return <span className="text-gray-300 text-xs">—</span>
                const days = Math.ceil((new Date(servis.jadwal_servis_berikutnya).getTime() - Date.now()) / 86400000)
                const className = days < 0
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                    : days <= 7
                        ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                return (
                    <Tag className={`text-xs font-semibold ${className}`}>
                        {days < 0 ? 'Lewat jadwal' : `${days} hari lagi`}
                    </Tag>
                )
            },
        },
        {
            header: '', id: 'action', size: 100,
            cell: ({ row }: CellContext<Armada, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Edit">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.ARMADA_DETAIL(row.original.id_armada))}
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
                    <h3 className="font-bold">Armada</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Data master armada</p>
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
                        onClick={() => router.push(ROUTES.ARMADA_BARU)}
                    >
                        Tambah Armada
                    </Button>
                </div>
            </div>
            <Card bodyClass="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari nopol atau merk... (tekan Enter)"
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
                title="Hapus Armada?"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">
                    Armada <span className="font-semibold">&ldquo;{deleteTarget?.nopol}&rdquo;</span> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

            <Dialog isOpen={!!importResult} onRequestClose={handleCloseImportResult} width={560}>
                <h5 className="text-base font-semibold mb-4">Hasil Import Armada</h5>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {importResult?.berhasil ?? 0} armada berhasil diimport
                </p>
                {importResult && importResult.gagal.length > 0 && (
                    <div className="overflow-x-auto mt-4 max-h-80 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Baris</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Nopol</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Alasan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {importResult.gagal.map((g, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{g.baris}</td>
                                        <td className="py-2.5 px-3 font-mono text-xs text-gray-800 dark:text-gray-200">{g.nopol || '-'}</td>
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
