'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { tripService, Trip } from '@/services/trip.service'
import dayjs from 'dayjs'

type StatusOption = { value: string; label: string }

const STATUS_OPTIONS: StatusOption[] = [
    { value: '',           label: 'Semua Status' },
    { value: 'belum_mulai', label: 'Belum Mulai' },
    { value: 'berjalan',   label: 'Berjalan' },
    { value: 'selesai',    label: 'Selesai' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
]

const STATUS_TAG: Record<string, string> = {
    belum_mulai: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    berjalan:    'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    selesai:     'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    dibatalkan:  'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

export default function TripPage() {
    const router = useRouter()

    const [list, setList]       = useState<Trip[]>([])
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
            const res = await tripService.list(currentPage)
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

    const filteredList = list.filter(t => {
        const matchSearch = !search || t.id_trip.toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || t.status === statusFilter
        return matchSearch && matchStatus
    })

    const columns: ColumnDef<Trip>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Trip, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'ID Trip', accessorKey: 'id_trip', size: 200,
            cell: ({ row }: CellContext<Trip, unknown>) => (
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{row.original.id_trip}</span>
            ),
        },
        {
            header: 'Check-in', accessorKey: 'waktu_checkin', size: 160,
            cell: ({ row }: CellContext<Trip, unknown>) =>
                row.original.waktu_checkin ? dayjs(row.original.waktu_checkin).format('DD/MM/YY HH:mm') : '-',
        },
        {
            header: 'Check-out', accessorKey: 'waktu_checkout', size: 160,
            cell: ({ row }: CellContext<Trip, unknown>) =>
                row.original.waktu_checkout ? dayjs(row.original.waktu_checkout).format('DD/MM/YY HH:mm') : '-',
        },
        {
            header: 'Status', accessorKey: 'status', size: 130,
            cell: ({ row }: CellContext<Trip, unknown>) => (
                <Tag className={STATUS_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {row.original.status}
                </Tag>
            ),
        },
        {
            header: '', id: 'action', size: 80,
            cell: ({ row }: CellContext<Trip, unknown>) => (
                <div className="flex items-center justify-end">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.TRIP_DETAIL(row.original.id_trip))}
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
                    <h3 className="font-bold">Trip</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Monitor seluruh trip</p>
                </div>
            </div>
            <Card bodyClass="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari ID trip... (tekan Enter)"
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
