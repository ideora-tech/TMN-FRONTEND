'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import { ruteService, Rute } from '@/services/rute.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'

type AktifOption = { value: '' | '1' | '0'; label: string }
const AKTIF_OPTIONS: AktifOption[] = [
    { value: '', label: 'Semua Status' },
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function RutePage() {
    const router = useRouter()
    const [data, setData]               = useState<Rute[]>([])
    const [loading, setLoading]         = useState(true)
    const [search, setSearch]           = useState('')
    const [aktif, setAktif]             = useState<'' | '1' | '0'>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [total, setTotal]             = useState(0)
    const pageSize = 10

    const [deleteId, setDeleteId]           = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        const params: Record<string, unknown> = { page: currentPage, limit: pageSize }
        if (search) params.search = search
        if (aktif !== '') params.aktif = aktif
        ruteService.list(params)
            .then(res => { setData(res.data ?? []); setTotal(res.meta?.total ?? 0) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [currentPage, search, aktif])

    useEffect(() => { load() }, [load])

    const handleDelete = async () => {
        if (!deleteId) return
        setDeleteLoading(true)
        try {
            await ruteService.delete(deleteId)
            toast.push(<Notification type="success" title="Rute berhasil dihapus" />)
            setDeleteId(null)
            load()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeleteLoading(false)
        }
    }

    const columns: ColumnDef<Rute>[] = [
        {
            header: 'Rute',
            accessorKey: 'nama_rute',
            cell: (props: CellContext<Rute, unknown>) => {
                const row = props.row.original
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-sm flex-shrink-0 select-none">
                            {row.nama_rute.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight">{row.nama_rute}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{row.kode_rute}</p>
                        </div>
                    </div>
                )
            },
        },
        {
            header: 'Asal → Tujuan',
            accessorKey: 'asal',
            cell: (props: CellContext<Rute, unknown>) => {
                const row = props.row.original
                if (!row.asal && !row.tujuan) return <span className="text-gray-400">—</span>
                return (
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        {row.asal ?? '—'} → {row.tujuan ?? '—'}
                    </span>
                )
            },
        },
        {
            header: 'Jarak / Durasi',
            accessorKey: 'estimasi_jarak_km',
            cell: (props: CellContext<Rute, unknown>) => {
                const row = props.row.original
                const parts: string[] = []
                if (row.estimasi_jarak_km != null) parts.push(`${formatNum(row.estimasi_jarak_km)} km`)
                if (row.estimasi_durasi_menit != null) parts.push(`${row.estimasi_durasi_menit} mnt`)
                return parts.length ? <span className="text-sm text-gray-600 dark:text-gray-300">{parts.join(' / ')}</span> : <span className="text-gray-400">—</span>
            },
        },
        {
            header: 'Status',
            accessorKey: 'aktif',
            cell: (props: CellContext<Rute, unknown>) => (
                props.row.original.aktif
                    ? <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-0">Aktif</Tag>
                    : <Tag className="bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400 border-0">Nonaktif</Tag>
            ),
        },
        {
            header: '',
            accessorKey: 'id_rute',
            cell: (props: CellContext<Rute, unknown>) => {
                const id = props.row.original.id_rute
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Edit">
                            <span
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 cursor-pointer transition-colors"
                                onClick={() => router.push(ROUTES.RUTE_DETAIL(id))}
                            ><HiOutlinePencilAlt className="text-base" /></span>
                        </Tooltip>
                        <Tooltip title="Hapus">
                            <span
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-200 cursor-pointer transition-colors"
                                onClick={() => setDeleteId(id)}
                            ><HiOutlineTrash className="text-base" /></span>
                        </Tooltip>
                    </div>
                )
            },
        },
    ]

    return (
        <>
            <Card
                header={{ content: <h4 className="font-bold">Manajemen Rute</h4>, extra: <Button variant="solid" size="sm" onClick={() => router.push(ROUTES.RUTE_BARU)}>+ Tambah Rute</Button>, bordered: false }}
                bodyClass="p-0"
            >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex-1">
                        <Input
                            placeholder="Cari nama rute, kode, asal, atau tujuan..."
                            suffix={<HiOutlineSearch className="text-gray-400" />}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-44">
                        <Select<AktifOption>
                            isSearchable={false}
                            options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === aktif) ?? AKTIF_OPTIONS[0]}
                            onChange={opt => { setAktif(opt?.value ?? ''); setCurrentPage(1) }}
                        />
                    </div>
                </div>
                <DataTable<Rute>
                    columns={columns}
                    data={data}
                    loading={loading}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSort={() => {}}
                    onSelectChange={() => {}}
                    selectable={false}
                />
            </Card>
            <ConfirmDialog
                isOpen={!!deleteId}
                type="danger"
                title="Hapus Rute"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => setDeleteId(null)}
                onCancel={() => setDeleteId(null)}
                onConfirm={handleDelete}
                confirmButtonProps={{ loading: deleteLoading }}
            >
                <p>Rute ini akan dihapus secara permanen. Lanjutkan?</p>
            </ConfirmDialog>
        </>
    )
}