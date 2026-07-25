'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Tooltip, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import { intervalPerawatanService, IntervalPerawatan } from '@/services/intervalPerawatan.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'

export default function IntervalPerawatanTab() {
    const router = useRouter()
    const [list, setList] = useState<IntervalPerawatan[]>([])
    const [loading, setLoading] = useState(true)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [pageSize, setPageSize] = useState(10)

    const [deleteTarget, setDeleteTarget] = useState<IntervalPerawatan | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await intervalPerawatanService.list({ page: currentPage, limit: pageSize, search })
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
    const handleSearchClear = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await intervalPerawatanService.delete(deleteTarget.id_interval_perawatan)
            toast.push(<Notification type="success" title="Interval perawatan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<IntervalPerawatan>[] = [
        {
            header: 'No',
            id: 'no',
            size: 60,
            cell: (props: CellContext<IntervalPerawatan, unknown>) =>
                (currentPage - 1) * pageSize + props.row.index + 1,
        },
        {
            header: 'Jenis Perawatan',
            accessorKey: 'nama_jenis_perawatan',
            cell: (props: CellContext<IntervalPerawatan, unknown>) => props.row.original.nama_jenis_perawatan ?? '—',
        },
        {
            header: 'Jenis Kendaraan',
            accessorKey: 'nama_jenis_kendaraan',
            cell: (props: CellContext<IntervalPerawatan, unknown>) => props.row.original.nama_jenis_kendaraan ?? '—',
        },
        {
            header: 'Interval',
            accessorKey: 'interval_hari',
            cell: (props: CellContext<IntervalPerawatan, unknown>) =>
                `${formatNum(props.row.original.interval_hari)} hari`,
        },
        {
            header: '',
            accessorKey: 'id_interval_perawatan',
            cell: (props: CellContext<IntervalPerawatan, unknown>) => {
                const row = props.row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Edit">
                            <span
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 cursor-pointer transition-colors"
                                onClick={() => router.push(ROUTES.INTERVAL_PERAWATAN_DETAIL(row.id_interval_perawatan))}
                            ><HiOutlinePencilAlt className="text-base" /></span>
                        </Tooltip>
                        <Tooltip title="Hapus">
                            <span
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-200 cursor-pointer transition-colors"
                                onClick={() => setDeleteTarget(row)}
                            ><HiOutlineTrash className="text-base" /></span>
                        </Tooltip>
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex-1">
                        <Input
                            placeholder="Cari jenis perawatan atau jenis kendaraan... (tekan Enter)"
                            suffix={
                                searchInput
                                    ? <HiOutlineX className="text-gray-400 cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                    : <HiOutlineSearch className="text-gray-400 cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                            }
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                        />
                    </div>
                </div>
                <DataTable
                    columns={columns as ColumnDef<unknown>[]}
                    data={list as unknown[]}
                    loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSort={() => {}}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }}
                    selectable={false}
                />
            </Card>
            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Interval Perawatan?"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: submitting }}
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">
                    Interval untuk <span className="font-semibold">&ldquo;{deleteTarget?.nama_jenis_perawatan}&rdquo;</span> ({deleteTarget?.nama_jenis_kendaraan}) akan dihapus. Reminder servis untuk kombinasi ini tidak akan terhitung otomatis lagi. Lanjutkan?
                </p>
            </ConfirmDialog>
        </div>
    )
}
