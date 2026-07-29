'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { tripService, Trip } from '@/services/trip.service'

type Option = { value: string; label: string }

const STATUS_RIWAYAT = 'selesai,dibatalkan'

const STATUS_OPTIONS: Option[] = [
    { value: '',           label: 'Semua Riwayat' },
    { value: 'selesai',    label: 'Selesai' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
]

const STATUS_TAG: Record<string, string> = {
    selesai:    'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    dibatalkan: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

const STATUS_LABEL: Record<string, string> = {
    selesai:    'Selesai',
    dibatalkan: 'Dibatalkan',
}

export default function RiwayatTripTab() {
    const router = useRouter()

    const [list, setList]       = useState<Trip[]>([])
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [dari, setDari]     = useState<Date | null>(dayjs().subtract(30, 'day').toDate())
    const [sampai, setSampai] = useState<Date | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await tripService.list({
                page: currentPage,
                limit: pageSize,
                search: search || undefined,
                status: statusFilter || STATUS_RIWAYAT,
                tanggal_dari: dari ? dayjs(dari).format('YYYY-MM-DD') : undefined,
                tanggal_sampai: sampai ? dayjs(sampai).format('YYYY-MM-DD') : undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter, dari, sampai])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const columns: ColumnDef<Trip>[] = [
        {
            header: 'Proyek', accessorKey: 'nama_proyek', size: 200,
            cell: ({ row }: CellContext<Trip, unknown>) => (
                <div>
                    <p className="font-medium">{row.original.nama_proyek ?? '—'}</p>
                    {row.original.kode_proyek && (
                        <p className="text-xs text-gray-400">{row.original.kode_proyek}</p>
                    )}
                </div>
            ),
        },
        {
            header: 'Rute', accessorKey: 'rute', size: 150,
            cell: ({ row }: CellContext<Trip, unknown>) =>
                row.original.rute ?? <span className="text-gray-400">—</span>,
        },
        {
            header: 'Supir & Armada', accessorKey: 'supir_nama', size: 180,
            cell: ({ row }: CellContext<Trip, unknown>) => (
                <div>
                    <p>{row.original.supir_nama ?? <span className="text-gray-400">Tanpa supir</span>}</p>
                    <p className="text-xs text-gray-400 font-mono">{row.original.armada_nopol ?? '—'}</p>
                </div>
            ),
        },
        {
            header: 'Berangkat', accessorKey: 'waktu_berangkat', size: 130,
            cell: ({ row }: CellContext<Trip, unknown>) =>
                row.original.waktu_berangkat
                    ? dayjs(row.original.waktu_berangkat).format('DD/MM/YY HH:mm')
                    : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Selesai', accessorKey: 'waktu_checkout', size: 130,
            cell: ({ row }: CellContext<Trip, unknown>) =>
                row.original.waktu_checkout
                    ? <span className="text-emerald-600 dark:text-emerald-400">{dayjs(row.original.waktu_checkout).format('DD/MM/YY HH:mm')}</span>
                    : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Status', accessorKey: 'status', size: 100,
            cell: ({ row }: CellContext<Trip, unknown>) => (
                <Tag className={STATUS_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {STATUS_LABEL[row.original.status] ?? row.original.status}
                </Tag>
            ),
        },
        {
            header: '', id: 'action', size: 60,
            cell: ({ row }: CellContext<Trip, unknown>) => (
                <div className="flex justify-end">
                    <Tooltip title="Detail Trip">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.TRIP_DETAIL(row.original.id_trip))}>
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
    ]

    return (
        <Card bodyClass="p-0">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Input
                    className="flex-1 min-w-60"
                    placeholder="Cari proyek, rute, supir, atau nopol... (tekan Enter)"
                    suffix={searchInput
                        ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                        : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                />
                <div className="w-full sm:w-40 shrink-0">
                    <DatePicker inputFormat="DD/MM/YYYY" placeholder="Dari tanggal"
                        value={dari}
                        onChange={date => { setDari(date); setCurrentPage(1) }} />
                </div>
                <div className="w-full sm:w-40 shrink-0">
                    <DatePicker inputFormat="DD/MM/YYYY" placeholder="Sampai tanggal"
                        value={sampai}
                        onChange={date => { setSampai(date); setCurrentPage(1) }} />
                </div>
                <div className="w-full sm:w-40 shrink-0">
                    <Select<Option>
                        isSearchable={false}
                        options={STATUS_OPTIONS}
                        value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                        onChange={(opt) => { setStatusFilter((opt as Option).value); setCurrentPage(1) }}
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
    )
}
