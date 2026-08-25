'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi'
import { PiFileXlsDuotone, PiFilePdfDuotone } from 'react-icons/pi'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { fakturService, Faktur } from '@/services/faktur.service'
import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import dayjs from 'dayjs'

type StatusOption = { value: string; label: string }

const STATUS_OPTIONS: StatusOption[] = [
    { value: '',         label: 'Semua Status' },
    { value: 'draft',    label: 'Draft' },
    { value: 'terkirim', label: 'Terkirim' },
    { value: 'lunas',    label: 'Lunas' },
    { value: 'batal',    label: 'Batal' },
]

const STATUS_TAG: Record<string, string> = {
    draft:    'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    terkirim: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    lunas:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    batal:    'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

export default function FakturPage() {
    const router = useRouter()

    const [list, setList]       = useState<Faktur[]>([])
    const [loading, setLoading] = useState(false)

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)
    const [downloading, setDownloading]   = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fakturService.list(currentPage, pageSize, search, statusFilter)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const downloadFaktur = async (faktur: Faktur, type: 'excel' | 'pdf') => {
        const key = `${faktur.id_faktur}-${type}`
        if (downloading) return
        setDownloading(key)
        try {
            const url = type === 'excel'
                ? API_ENDPOINTS.FAKTUR_EXPORT_EXCEL(faktur.id_faktur)
                : API_ENDPOINTS.FAKTUR_EXPORT_PDF(faktur.id_faktur)
            const res = await axios.get(url, { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = `faktur-${faktur.nomor_faktur}.${type === 'excel' ? 'xlsx' : 'pdf'}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloading(null)
        }
    }

    const columns: ColumnDef<Faktur>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Faktur, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Nomor Invoice', accessorKey: 'nomor_faktur', size: 200,
            cell: ({ row }: CellContext<Faktur, unknown>) => (
                <span className="font-mono font-semibold">{row.original.nomor_faktur}</span>
            ),
        },
        {
            header: 'Klien', accessorKey: 'nama_klien', size: 180,
            cell: ({ row }: CellContext<Faktur, unknown>) => row.original.nama_klien ?? '-',
        },
        {
            header: 'Proyek', accessorKey: 'nama_proyek', size: 180,
            cell: ({ row }: CellContext<Faktur, unknown>) => row.original.nama_proyek ?? '-',
        },
        {
            header: 'Total', accessorKey: 'total', size: 150,
            cell: ({ row }: CellContext<Faktur, unknown>) => formatRupiah(row.original.total),
        },
        {
            header: 'Tanggal Invoice', accessorKey: 'tanggal_faktur', size: 130,
            cell: ({ row }: CellContext<Faktur, unknown>) =>
                row.original.tanggal_faktur ? dayjs(row.original.tanggal_faktur).format('DD/MM/YYYY') : '-',
        },
        {
            header: 'Jatuh Tempo', accessorKey: 'jatuh_tempo', size: 130,
            cell: ({ row }: CellContext<Faktur, unknown>) =>
                row.original.jatuh_tempo ? dayjs(row.original.jatuh_tempo).format('DD/MM/YYYY') : '-',
        },
        {
            header: 'Dibuat Oleh', accessorKey: 'dibuat_oleh_nama', size: 170,
            cell: ({ row }: CellContext<Faktur, unknown>) => (
                <div>
                    <div className="text-gray-800 dark:text-gray-200">{row.original.dibuat_oleh_nama ?? '-'}</div>
                    {row.original.dibuat_pada && (
                        <div className="text-xs text-gray-400">{dayjs(row.original.dibuat_pada).format('DD/MM/YY HH:mm')}</div>
                    )}
                </div>
            ),
        },
        {
            header: 'Status', accessorKey: 'status', size: 130,
            cell: ({ row }: CellContext<Faktur, unknown>) => (
                <Tag className={STATUS_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {row.original.status}
                </Tag>
            ),
        },
        {
            header: '', id: 'action', size: 150,
            cell: ({ row }: CellContext<Faktur, unknown>) => (
                <div className="flex items-center justify-end gap-1.5">
                    <Tooltip title="Cetak Excel">
                        <span
                            className={`cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors ${downloading === `${row.original.id_faktur}-excel` ? 'opacity-50 pointer-events-none' : ''}`}
                            onClick={() => downloadFaktur(row.original, 'excel')}
                        >
                            <PiFileXlsDuotone className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Cetak PDF">
                        <span
                            className={`cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30 transition-colors ${downloading === `${row.original.id_faktur}-pdf` ? 'opacity-50 pointer-events-none' : ''}`}
                            onClick={() => downloadFaktur(row.original, 'pdf')}
                        >
                            <PiFilePdfDuotone className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.FAKTUR_DETAIL(row.original.id_faktur))}
                        >
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Invoice</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola invoice dan penagihan klien</p>
                </div>
                <Button
                    variant="solid" size="sm"
                    icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.FAKTUR_BARU)}
                >
                    Buat Invoice
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nomor invoice... (tekan Enter)"
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
                    data={list as unknown[]}
                    loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>
        </div>
    )
}
