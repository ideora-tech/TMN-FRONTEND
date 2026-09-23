'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { vendorService, Vendor } from '@/services/vendor.service'

export default function VendorTab() {
    const router = useRouter()

    const [list, setList]             = useState<Vendor[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await vendorService.list(currentPage, pageSize, search)
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
            await vendorService.delete(deleteTarget.id_vendor)
            toast.push(<Notification type="success" title="Vendor berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<Vendor>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Vendor, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Nama Vendor', accessorKey: 'nama_vendor', size: 260,
            cell: ({ row }: CellContext<Vendor, unknown>) => {
                const initials = row.original.nama_vendor.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold truncate">{row.original.nama_vendor}</p>
                            <p className="text-xs text-gray-400 truncate">
                                {[row.original.jenis_vendor, row.original.pic_nama ? `PIC: ${row.original.pic_nama}` : null].filter(Boolean).join(' · ') || '—'}
                            </p>
                        </div>
                    </div>
                )
            },
        },
        {
            header: 'Kontak', accessorKey: 'telepon', size: 220,
            cell: ({ row }: CellContext<Vendor, unknown>) => (
                <div className="min-w-0">
                    <p className="text-sm">{row.original.telepon || '—'}</p>
                    <p className="text-xs text-gray-400 truncate">{row.original.email || '—'}</p>
                </div>
            ),
        },
        {
            header: 'Unit / Driver', id: 'unit_driver', size: 130,
            cell: ({ row }: CellContext<Vendor, unknown>) => (
                <div className="flex items-center gap-1.5">
                    <Tooltip title="Unit terdaftar">
                        <Tag className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-0 text-xs font-semibold">
                            {formatNum(row.original.jumlah_unit ?? 0)} unit
                        </Tag>
                    </Tooltip>
                    <Tooltip title="Driver terdaftar">
                        <Tag className="bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border-0 text-xs font-semibold">
                            {formatNum(row.original.jumlah_driver ?? 0)} driver
                        </Tag>
                    </Tooltip>
                </div>
            ),
        },
        {
            header: 'Kontrak Aktif', id: 'kontrak_aktif', size: 170,
            cell: ({ row }: CellContext<Vendor, unknown>) => {
                const jumlah = row.original.jumlah_kontrak_aktif ?? 0
                if (jumlah === 0) return <span className="text-gray-400">Belum ada</span>
                return (
                    <div>
                        <p className="text-sm font-semibold">{formatNum(jumlah)} kontrak</p>
                        <p className="text-xs text-gray-400 whitespace-nowrap">{formatRupiah(row.original.nilai_kontrak_aktif ?? 0)}</p>
                    </div>
                )
            },
        },
        {
            header: 'Kontrak Berakhir', id: 'kontrak_berakhir', size: 160,
            cell: ({ row }: CellContext<Vendor, unknown>) => {
                const tgl = row.original.kontrak_berakhir_terdekat
                if (!tgl) return <span className="text-gray-400">—</span>
                const sisa = dayjs(tgl).startOf('day').diff(dayjs().startOf('day'), 'day')
                const kelas = sisa <= 7
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300'
                    : sisa <= 30
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                return (
                    <div>
                        <p className="text-sm whitespace-nowrap">{dayjs(tgl).format('DD MMM YYYY')}</p>
                        <Tag className={`${kelas} border-0 text-xs font-semibold mt-0.5`}>{sisa === 0 ? 'Hari ini' : `${formatNum(sisa)} hari lagi`}</Tag>
                    </div>
                )
            },
        },
        {
            header: 'Status', accessorKey: 'aktif', size: 100,
            cell: ({ row }: CellContext<Vendor, unknown>) => (
                <Tag className={`border-0 text-xs font-semibold ${row.original.aktif
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-300'}`}>
                    {row.original.aktif ? 'Aktif' : 'Nonaktif'}
                </Tag>
            ),
        },
        {
            header: '', id: 'action', size: 100,
            cell: ({ row }: CellContext<Vendor, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.VENDOR_DETAIL(row.original.id_vendor))}
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
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nama atau telepon vendor... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
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

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Vendor?"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">
                    Vendor <span className="font-semibold">&ldquo;{deleteTarget?.nama_vendor}&rdquo;</span> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>
        </div>
    )
}
