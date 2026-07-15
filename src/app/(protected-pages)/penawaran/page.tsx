'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import { penawaranService, Penawaran, PenawaranStatus } from '@/services/penawaran.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'

type StatusOption = { value: '' | PenawaranStatus; label: string }
const STATUS_OPTIONS: StatusOption[] = [
    { value: '',           label: 'Semua Status' },
    { value: 'draft',      label: 'Draft' },
    { value: 'terkirim',   label: 'Terkirim' },
    { value: 'negosiasi',  label: 'Negosiasi' },
    { value: 'disetujui',  label: 'Disetujui' },
    { value: 'ditolak',    label: 'Ditolak' },
]

const STATUS_CLASS: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
    terkirim:  'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    negosiasi: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    disetujui: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    ditolak:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', terkirim: 'Terkirim', negosiasi: 'Negosiasi', disetujui: 'Disetujui', ditolak: 'Ditolak',
}

export default function PenawaranPage() {
    const router = useRouter()
    const [data, setData]               = useState<Penawaran[]>([])
    const [loading, setLoading]         = useState(true)
    const [search, setSearch]           = useState('')
    const [status, setStatus]           = useState<'' | PenawaranStatus>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [total, setTotal]             = useState(0)
    const pageSize = 10

    const [deleteId, setDeleteId]           = useState<string | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        const params: Record<string, unknown> = { page: currentPage, limit: pageSize }
        if (search) params.search = search
        if (status) params.status = status
        penawaranService.list(params)
            .then(res => { setData(res.data ?? []); setTotal(res.meta?.total ?? 0) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [currentPage, search, status])

    useEffect(() => { load() }, [load])

    const handleDelete = async () => {
        if (!deleteId) return
        setDeleteLoading(true)
        try {
            await penawaranService.delete(deleteId)
            toast.push(<Notification type="success" title="Penawaran berhasil dihapus" />)
            setDeleteId(null)
            load()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeleteLoading(false)
        }
    }

    const columns: ColumnDef<Penawaran>[] = [
        {
            header: 'Penawaran',
            accessorKey: 'nomor_penawaran',
            cell: (props: CellContext<Penawaran, unknown>) => {
                const row = props.row.original
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold text-sm flex-shrink-0 select-none">
                            {row.nomor_penawaran.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight">{row.nomor_penawaran}</p>
                            <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">{row.judul}</p>
                        </div>
                    </div>
                )
            },
        },
        {
            header: 'Nilai',
            accessorKey: 'nilai_penawaran',
            cell: (props: CellContext<Penawaran, unknown>) => {
                const v = props.row.original.nilai_penawaran
                return v != null
                    ? <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatRupiah(v)}</span>
                    : <span className="text-gray-400">—</span>
            },
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (props: CellContext<Penawaran, unknown>) => {
                const s = props.row.original.status
                return <Tag className={`${STATUS_CLASS[s] ?? ''} border-0`}>{STATUS_LABEL[s] ?? s}</Tag>
            },
        },
        {
            header: 'Berlaku Hingga',
            accessorKey: 'tanggal_berlaku',
            cell: (props: CellContext<Penawaran, unknown>) => {
                const v = props.row.original.tanggal_berlaku
                return v
                    ? <span className="text-sm text-gray-600 dark:text-gray-300">{v}</span>
                    : <span className="text-gray-400">—</span>
            },
        },
        {
            header: '',
            accessorKey: 'id_penawaran',
            cell: (props: CellContext<Penawaran, unknown>) => {
                const row = props.row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Detail / Edit">
                            <span
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 cursor-pointer transition-colors"
                                onClick={() => router.push(ROUTES.PENAWARAN_DETAIL(row.id_penawaran))}
                            >
                                <HiOutlinePencilAlt className="text-base" />
                            </span>
                        </Tooltip>
                        {row.status === 'draft' && (
                            <Tooltip title="Hapus">
                                <span
                                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-200 cursor-pointer transition-colors"
                                    onClick={() => setDeleteId(row.id_penawaran)}
                                >
                                    <HiOutlineTrash className="text-base" />
                                </span>
                            </Tooltip>
                        )}
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Penawaran</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftar penawaran ke klien</p>
                </div>
                <Button variant="solid" size="sm" onClick={() => router.push(ROUTES.PENAWARAN_BARU)}>
                    + Buat Penawaran
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex-1">
                        <Input
                            placeholder="Cari nomor atau judul penawaran..."
                            suffix={<HiOutlineSearch className="text-gray-400" />}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select<StatusOption>
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === status) ?? STATUS_OPTIONS[0]}
                            onChange={opt => { setStatus(opt?.value ?? ''); setCurrentPage(1) }}
                        />
                    </div>
                </div>
                <DataTable<Penawaran>
                    columns={columns}
                    data={data}
                    loading={loading}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={() => {}}
                />
            </Card>

            <ConfirmDialog
                isOpen={!!deleteId}
                type="danger"
                title="Hapus Penawaran"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => setDeleteId(null)}
                onCancel={() => setDeleteId(null)}
                onConfirm={handleDelete}
                confirmButtonProps={{ loading: deleteLoading }}
            >
                <p>Penawaran draft ini akan dihapus. Lanjutkan?</p>
            </ConfirmDialog>
        </div>
    )
}