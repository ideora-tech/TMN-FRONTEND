'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { jadwalService, Jadwal } from '@/services/jadwal.service'

type StatusOption = { value: string; label: string }

const STATUS_OPTIONS: StatusOption[] = [
    { value: '',           label: 'Semua Status' },
    { value: 'terjadwal',  label: 'Terjadwal' },
    { value: 'berjalan',   label: 'Berjalan' },
    { value: 'selesai',    label: 'Selesai' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
]

const STATUS_TAG: Record<string, string> = {
    terjadwal:  'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    berjalan:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:    'bg-emerald-200 text-emerald-800 dark:bg-emerald-600/20 dark:text-emerald-200',
    dibatalkan: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

export default function JadwalPage() {
    const router = useRouter()

    const [list, setList]       = useState<Jadwal[]>([])
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
            const res = await jadwalService.list(currentPage)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const filteredList = list.filter(j => {
        const matchSearch = !search || (j.rute ?? '').toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || j.status === statusFilter
        return matchSearch && matchStatus
    })

    const columns: ColumnDef<Jadwal>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Jadwal, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Tgl Keberangkatan', accessorKey: 'tgl_keberangkatan', size: 180,
            cell: ({ row }: CellContext<Jadwal, unknown>) => row.original.tgl_keberangkatan ?? '-',
        },
        {
            header: 'Rute', accessorKey: 'rute', size: 300,
            cell: ({ row }: CellContext<Jadwal, unknown>) => (
                <span className="font-medium">{row.original.rute ?? '-'}</span>
            ),
        },
        {
            header: 'Status', accessorKey: 'status', size: 130,
            cell: ({ row }: CellContext<Jadwal, unknown>) => (
                <Tag className={STATUS_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {row.original.status}
                </Tag>
            ),
        },
        {
            header: '', id: 'action', size: 80,
            cell: ({ row }: CellContext<Jadwal, unknown>) => (
                <div className="flex items-center justify-end">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.JADWAL_DETAIL(row.original.id_jadwal))}
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
                header={{ content: <h4>Jadwal</h4>, bordered: false }}
                bodyClass="p-0"
            >
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari rute... (tekan Enter)"
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
