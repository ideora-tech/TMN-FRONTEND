'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { rekonsiliasiService, Rekonsiliasi } from '@/services/rekonsiliasi.service'
import dayjs from 'dayjs'

type StatusOption = { value: string; label: string }

const STATUS_OPTIONS: StatusOption[] = [
    { value: '',        label: 'Semua Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'selesai', label: 'Selesai' },
]

const STATUS_TAG: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-200',
    selesai: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
}

export default function RekonsiliasiPage() {
    const router = useRouter()

    const [list, setList]       = useState<Rekonsiliasi[]>([])
    const [loading, setLoading] = useState(false)

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await rekonsiliasiService.list(currentPage)
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

    const filteredList = list.filter(r => {
        const matchSearch = !search || r.id_faktur.toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || r.status === statusFilter
        return matchSearch && matchStatus
    })

    const columns: ColumnDef<Rekonsiliasi>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Rekonsiliasi, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'ID Faktur', accessorKey: 'id_faktur', size: 260,
            cell: ({ row }: CellContext<Rekonsiliasi, unknown>) => (
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{row.original.id_faktur}</span>
            ),
        },
        {
            header: 'Status', accessorKey: 'status', size: 130,
            cell: ({ row }: CellContext<Rekonsiliasi, unknown>) => (
                <Tag className={STATUS_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {row.original.status}
                </Tag>
            ),
        },
        {
            header: 'Diselesaikan', accessorKey: 'diselesaikan_pada', size: 160,
            cell: ({ row }: CellContext<Rekonsiliasi, unknown>) =>
                row.original.diselesaikan_pada
                    ? dayjs(row.original.diselesaikan_pada).format('DD/MM/YYYY')
                    : '-',
        },
        {
            header: '', id: 'action', size: 80,
            cell: ({ row }: CellContext<Rekonsiliasi, unknown>) => (
                <div className="flex items-center justify-end">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.REKONSILIASI_DETAIL(row.original.id_rekonsiliasi))}
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
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Rekonsiliasi</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Rekonsiliasi pembayaran faktur</p>
                </div>
                <Button
                    variant="solid" size="sm"
                    icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.REKONSILIASI_BARU)}
                >
                    Buat Rekonsiliasi
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari ID faktur... (tekan Enter)"
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
