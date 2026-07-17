'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { sparepartService, Sparepart } from '@/services/sparepart.service'

export default function SparepartPage() {
    const router = useRouter()
    const [list, setList]             = useState<Sparepart[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(15)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<Sparepart | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await sparepartService.list({ page: currentPage, limit: pageSize, search: search || undefined })
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
            await sparepartService.delete(deleteTarget.id_sparepart)
            toast.push(<Notification type="success" title="Spare part berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<Sparepart>[] = [
        { header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Sparepart, unknown>) => (currentPage - 1) * pageSize + row.index + 1 },
        { header: 'Kode', accessorKey: 'kode', size: 130,
            cell: ({ row }: CellContext<Sparepart, unknown>) => (
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{row.original.kode}</span>
            ),
        },
        { header: 'Nama', accessorKey: 'nama', size: 220,
            cell: ({ row }: CellContext<Sparepart, unknown>) => (
                <span className="font-semibold">{row.original.nama}</span>
            ),
        },
        { header: 'Satuan', accessorKey: 'satuan', size: 100,
            cell: ({ row }: CellContext<Sparepart, unknown>) => row.original.satuan,
        },
        { header: 'Harga Standar', accessorKey: 'harga_standar', size: 150,
            cell: ({ row }: CellContext<Sparepart, unknown>) => formatRupiah(row.original.harga_standar),
        },
        { header: 'Stok', accessorKey: 'stok', size: 130,
            cell: ({ row }: CellContext<Sparepart, unknown>) => {
                const stok = row.original.stok
                const cls = stok === 0
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                    : stok < 5
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                return (
                    <Tag className={cls}>
                        {formatNum(stok)} {row.original.satuan}
                    </Tag>
                )
            },
        },
        { header: 'Aktif', accessorKey: 'aktif', size: 110,
            cell: ({ row }: CellContext<Sparepart, unknown>) => (
                <Tag className={row.original.aktif
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                    : 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100'}>
                    {row.original.aktif ? 'Aktif' : 'Nonaktif'}
                </Tag>
            ),
        },
        { header: '', id: 'action', size: 90,
            cell: ({ row }: CellContext<Sparepart, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Detail">
                        <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.SPAREPART_DETAIL(row.original.id_sparepart))}>
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                            onClick={() => setDeleteTarget(row.original)}>
                            <HiOutlineTrash className="text-lg" />
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
                    <h3 className="font-bold">Spare Part</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Data master spare part dan stok</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.SPAREPART_BARU)}>
                    Tambah Spare Part
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input className="flex-1" placeholder="Cari kode atau nama spare part... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }} />
                </div>
                <DataTable columns={columns} data={list as unknown[]} loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }} />
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Spare Part?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}>
                <p className="text-sm">Spare part <span className="font-semibold">&ldquo;{deleteTarget?.nama}&rdquo;</span> akan dihapus secara permanen. Riwayat mutasi dan pemakaian servis lama tetap tersimpan.</p>
            </ConfirmDialog>
        </div>
    )
}
