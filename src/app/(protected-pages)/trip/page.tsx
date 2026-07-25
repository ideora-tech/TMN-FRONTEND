'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlinePlus } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { tripService, RingkasanProyekTrip } from '@/services/trip.service'
import MulaiTripDialog from './MulaiTripDialog'

type StatusOption = { value: string; label: string }

const STATUS_OPTIONS: StatusOption[] = [
    { value: '',           label: 'Semua Status' },
    { value: 'belum_mulai', label: 'Belum Mulai' },
    { value: 'berjalan',   label: 'Berjalan' },
    { value: 'selesai',    label: 'Selesai' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
]

export default function TripPage() {
    const router = useRouter()

    const [list, setList]       = useState<RingkasanProyekTrip[]>([])
    const [loading, setLoading] = useState(false)

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const [showMulai, setShowMulai]               = useState(false)
    const [proyekUntukMulai, setProyekUntukMulai]  = useState<string | undefined>(undefined)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await tripService.ringkasanProyek({
                page: currentPage,
                limit: pageSize,
                search: search || undefined,
                status: statusFilter || undefined,
            })
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

    const handleTambah = (idProyek: string) => {
        setProyekUntukMulai(idProyek)
        setShowMulai(true)
    }

    const columns: ColumnDef<RingkasanProyekTrip>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<RingkasanProyekTrip, unknown>) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Proyek', accessorKey: 'nama_proyek', size: 260,
            cell: ({ row }: CellContext<RingkasanProyekTrip, unknown>) => (
                <p className="font-semibold">
                    {row.original.nama_proyek}
                    {row.original.kode_proyek && <span className="text-gray-400 font-normal"> ({row.original.kode_proyek})</span>}
                </p>
            ),
        },
        {
            header: 'Klien', accessorKey: 'nama_klien', size: 200,
            cell: ({ row }: CellContext<RingkasanProyekTrip, unknown>) =>
                row.original.nama_klien ?? <span className="text-gray-400">—</span>,
        },
        {
            header: 'Jumlah Trip', accessorKey: 'jumlah_trip', size: 130,
            cell: ({ row }: CellContext<RingkasanProyekTrip, unknown>) => (
                <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {row.original.jumlah_trip} trip
                </Tag>
            ),
        },
        {
            header: '', id: 'action', size: 90,
            cell: ({ row }: CellContext<RingkasanProyekTrip, unknown>) => (
                <div className="flex items-center justify-end gap-1">
                    <Tooltip title="Tambah">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors"
                            onClick={() => handleTambah(row.original.id_proyek)}
                        >
                            <HiOutlinePlus className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Lihat">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.TRIP_PROYEK_DETAIL(row.original.id_proyek))}
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
            <div>
                <h3 className="font-bold">Trip</h3>
                <p className="text-gray-500 text-sm mt-0.5">Monitor seluruh trip, dikelompokkan per proyek</p>
            </div>

            <Card bodyClass="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari nama proyek, kode, atau klien... (tekan Enter)"
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

            <MulaiTripDialog
                isOpen={showMulai}
                onClose={() => setShowMulai(false)}
                onSukses={fetchData}
                idProyekTerkunci={proyekUntukMulai}
            />
        </div>
    )
}
