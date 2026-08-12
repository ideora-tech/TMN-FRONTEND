'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiOutlineSearch, HiOutlineX, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kontrakVendorService, KontrakVendor } from '@/services/kontrak-vendor.service'
import dayjs from 'dayjs'

const MEKANISME_LABEL: Record<string, string> = {
    unit_only:   'Unit Only',
    unit_driver: 'Unit + Driver',
    full:        'Full',
}

export default function KontrakVendorTab() {
    const router = useRouter()
    const [list, setList]             = useState<KontrakVendor[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<KontrakVendor | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await kontrakVendorService.list(currentPage, { limit: String(pageSize) }, search)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await kontrakVendorService.delete(deleteTarget.id_kontrak_vendor)
            toast.push(<Notification type="success" title="Kontrak berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<KontrakVendor>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: (props: CellContext<KontrakVendor, unknown>) =>
                props.row.index + 1 + (currentPage - 1) * pageSize,
        },
        {
            header: 'Vendor', accessorKey: 'vendor',
            cell: ({ row }) => (
                <span className="font-semibold">
                    {row.original.vendor?.nama_vendor ?? row.original.id_vendor}
                </span>
            ),
        },
        {
            header: 'No. Kontrak', accessorKey: 'nomor_kontrak', size: 160,
            cell: ({ row }) => row.original.nomor_kontrak
                ? <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{row.original.nomor_kontrak}</span>
                : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Mekanisme', accessorKey: 'mekanisme', size: 160,
            cell: ({ row }) => (
                <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    {MEKANISME_LABEL[row.original.mekanisme] ?? row.original.mekanisme}
                </Tag>
            ),
        },
        {
            header: 'Nilai Kontrak', accessorKey: 'nilai_kontrak', size: 180,
            cell: ({ row }) => row.original.nilai_kontrak
                ? <span className="font-semibold tabular-nums">{formatRupiah(row.original.nilai_kontrak)}</span>
                : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Mulai', accessorKey: 'tanggal_mulai', size: 140,
            cell: ({ row }) => row.original.tanggal_mulai
                ? dayjs(row.original.tanggal_mulai).format('DD MMM YYYY')
                : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Selesai', accessorKey: 'tanggal_selesai', size: 140,
            cell: ({ row }) => {
                const tgl = row.original.tanggal_selesai
                if (!tgl) return <span className="text-gray-400">—</span>
                const expired = dayjs(tgl).isBefore(dayjs(), 'day')
                return (
                    <span className={expired ? 'text-red-500 font-medium' : ''}>
                        {dayjs(tgl).format('DD MMM YYYY')}
                    </span>
                )
            },
        },
        {
            header: 'Status', accessorKey: 'status', size: 120,
            cell: ({ row }) => {
                const tgl = row.original.tanggal_selesai
                const expired = tgl ? dayjs(tgl).isBefore(dayjs(), 'day') : false
                if (!tgl) return <Tag className="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Tidak berbatas</Tag>
                if (expired) return <Tag className="bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400">Kadaluarsa</Tag>
                return <Tag className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Aktif</Tag>
            },
        },
        {
            header: '', id: 'aksi', size: 90,
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.KONTRAK_VENDOR_DETAIL(row.original.id_kontrak_vendor))}
                        >
                            <HiOutlineEye className="text-lg" />
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
            <Card bodyClass="p-0">
                <div className="px-4 py-3">
                    <Input
                        className="w-full sm:w-80"
                        placeholder="Cari nama vendor / mekanisme..."
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
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

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Kontrak"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus kontrak ini? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>
        </div>
    )
}
