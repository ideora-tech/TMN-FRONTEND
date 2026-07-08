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
import { menuService, MenuItem } from '@/services/menu.service'

export default function MenuAdminPage() {
    const router = useRouter()
    const [list, setList]         = useState<MenuItem[]>([])
    const [loading, setLoading]   = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]              = useState(50)
    const [total, setTotal]       = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await menuService.list(currentPage)
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
            await menuService.delete(deleteTarget.id_menu)
            toast.push(<Notification type="success" title="Menu berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<MenuItem>[] = [
        { header: '#', accessorKey: 'urutan', size: 60 },
        { header: 'Nama Menu', accessorKey: 'nama_menu' },
        { header: 'Path', accessorKey: 'path', cell: ({ row }) => <span className="font-mono text-xs">{row.original.path ?? '-'}</span> },
        { header: 'Icon', accessorKey: 'icon', cell: ({ row }) => <span className="font-mono text-xs">{row.original.icon ?? '-'}</span> },
        { header: 'Induk', accessorKey: 'id_menu_induk', cell: ({ row }) => row.original.id_menu_induk ? '✓ Sub-menu' : 'Root' },
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
                            onClick={() => router.push(ROUTES.MENU_ADMIN_DETAIL(row.original.id_menu))} />
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
                    <h3 className="font-bold">Manajemen Menu</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Konfigurasi navigasi sidebar sistem</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.MENU_ADMIN_BARU)}>
                    Tambah Menu
                </Button>
            </div>
            <Card>
                <DataTable columns={columns} data={list} loading={loading}
                    pagingData={{ total, pageIndex: currentPage - 1, pageSize }}
                    onPaginationChange={setCurrentPage} />
            </Card>
            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Menu"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting, variant: 'solid', className: 'bg-red-600 hover:bg-red-700' }}>
                <p>Hapus menu <strong>{deleteTarget?.nama_menu}</strong>?</p>
            </ConfirmDialog>
        </div>
    )
}
