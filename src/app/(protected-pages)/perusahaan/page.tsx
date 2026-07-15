'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Tag, Tooltip, toast, Notification } from '@/components/ui'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { perusahaanService, Perusahaan } from '@/services/perusahaan.service'

export default function PerusahaanPage() {
    const router = useRouter()
    const [list, setList]         = useState<Perusahaan[]>([])
    const [loading, setLoading]   = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]              = useState(15)
    const [total, setTotal]       = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<Perusahaan | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await perusahaanService.list(currentPage)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage])

    useEffect(() => { fetchData() }, [fetchData])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await perusahaanService.delete(deleteTarget.id_perusahaan)
            toast.push(<Notification type="success" title="Perusahaan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<Perusahaan>[] = [
        { header: 'No', cell: (props) => props.row.index + 1 + (currentPage - 1) * pageSize, size: 60 },
        { header: 'Nama Perusahaan', accessorKey: 'nama' },
        { header: 'Email', accessorKey: 'email', cell: ({ row }) => row.original.email ?? '-' },
        { header: 'Telepon', accessorKey: 'telepon', cell: ({ row }) => row.original.telepon ?? '-' },
        {
            header: 'Status', accessorKey: 'aktif',
            cell: ({ row }) => (
                <Tag className={row.original.aktif
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-red-100 text-red-500'}>
                    {row.original.aktif ? 'Aktif' : 'Nonaktif'}
                </Tag>
            ),
        },
        {
            header: '', id: 'aksi', size: 90,
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.PERUSAHAAN_DETAIL(row.original.id_perusahaan))}
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
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Perusahaan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Data master perusahaan</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.PERUSAHAAN_BARU)}>
                    Tambah Perusahaan
                </Button>
            </div>
            <Card>
                <DataTable columns={columns} data={list} loading={loading}
                    pagingData={{ total, pageIndex: currentPage - 1, pageSize }}
                    onPaginationChange={setCurrentPage} />
            </Card>
            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Perusahaan"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting, variant: 'solid', className: 'bg-red-600 hover:bg-red-700' }}>
                <p>Hapus perusahaan <strong>{deleteTarget?.nama}</strong>?</p>
            </ConfirmDialog>
        </div>
    )
}
