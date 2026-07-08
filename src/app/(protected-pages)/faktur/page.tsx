'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { fakturService, Faktur } from '@/services/faktur.service'
import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

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
    const [downloading, setDownloading]   = useState<'excel' | 'pdf' | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fakturService.list(currentPage)
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

    const downloadFile = async (url: string, filename: string, type: 'excel' | 'pdf') => {
        setDownloading(type)
        try {
            const res = await axios.get(url, { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = filename
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

    const handleExcelDownload = () => downloadFile(API_ENDPOINTS.FAKTUR_EXPORT_EXCEL, `faktur-${new Date().toISOString().slice(0,10)}.xlsx`, 'excel')
    const handlePdfDownload   = () => downloadFile(API_ENDPOINTS.FAKTUR_EXPORT_PDF,   `faktur-${new Date().toISOString().slice(0,10)}.pdf`,  'pdf')

    const filteredList = list.filter(f => {
        const matchSearch = !search || f.nomor_faktur.toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || f.status === statusFilter
        return matchSearch && matchStatus
    })

    const columns: ColumnDef<Faktur>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Faktur, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Nomor Faktur', accessorKey: 'nomor_faktur', size: 200,
            cell: ({ row }: CellContext<Faktur, unknown>) => (
                <span className="font-mono font-semibold">{row.original.nomor_faktur}</span>
            ),
        },
        {
            header: 'Total', accessorKey: 'total', size: 180,
            cell: ({ row }: CellContext<Faktur, unknown>) => formatRupiah(row.original.total),
        },
        {
            header: 'Jatuh Tempo', accessorKey: 'jatuh_tempo', size: 150,
            cell: ({ row }: CellContext<Faktur, unknown>) => row.original.jatuh_tempo ?? '-',
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
            header: '', id: 'action', size: 80,
            cell: ({ row }: CellContext<Faktur, unknown>) => (
                <div className="flex items-center justify-end">
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
            <Card
                header={{
                    content: <h4>Faktur</h4>,
                    extra: (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm" variant="default"
                                loading={downloading === 'excel'}
                                onClick={handleExcelDownload}
                            >
                                Export Excel
                            </Button>
                            <Button
                                size="sm" variant="default"
                                loading={downloading === 'pdf'}
                                onClick={handlePdfDownload}
                            >
                                Export PDF
                            </Button>
                            <Button
                                variant="solid" size="sm"
                                icon={<HiPlusCircle />}
                                onClick={() => router.push(ROUTES.FAKTUR_BARU)}
                            >
                                Buat Faktur
                            </Button>
                        </div>
                    ),
                    bordered: false,
                }}
                bodyClass="p-0"
            >
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari nomor faktur... (tekan Enter)"
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
        </div>
    )
}
