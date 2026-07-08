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
import { modulService, Modul } from '@/services/modul.service'

export default function ModulPage() {
    const router = useRouter()
    const [list, setList]         = useState<Modul[]>([])
    const [loading, setLoading]   = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]              = useState(50)
    const [total, setTotal]       = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<Modul | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await modulService.list(currentPage)
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
            await modulService.delete(deleteTarget.id_modul)
            toast.push(<Notification type="success" title="Modul berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<Modul>[] = [
        { header: 'Urutan', accessorKey: 'urutan', size: 80 },
        { header: 'Kode', accessorKey: 'kode_modul' },
        { header: 'Nama Modul', accessorKey: 'nama_modul' },
        {
            header: 'Status', accessorKey: 'aktif',
            cell: ({ row }) => (
                <Tag className={row.original.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}>
                    {row.original.aktif ? 'Aktif' : 'Nonaktif'}
                </Tag>
            ),
        },
        {
            header: 'Aksi', id: 'aksi',
            cell: ({ row }) => (
                <div className="flex gap-1">
                    <Tooltip title="Detail">
                        <Button size="xs" variant="plain" icon={<HiOutlineEye />}
                            onClick={() => router.push(ROUTES.MODUL_DETAIL(row.original.id_modul))} />
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <Button size="xs" variant="plain" icon={<HiOutlineTrash />}
                            onClick={() => setDeleteTarget(row.original)} />
                    </Tooltip>
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Modul</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Manajemen modul sistem</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.MODUL_BARU)}>
                    Tambah Modul
                </Button>
            </div>
            <Card>
                <DataTable columns={columns} data={list} loading={loading}
                    pagingData={{ total, pageIndex: currentPage - 1, pageSize }}
                    onPaginationChange={setCurrentPage} />
            </Card>
            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Modul"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting, variant: 'solid', className: 'bg-red-600 hover:bg-red-700' }}>
                <p>Hapus modul <strong>{deleteTarget?.nama_modul}</strong>?</p>
            </ConfirmDialog>
        </div>
    )
}
