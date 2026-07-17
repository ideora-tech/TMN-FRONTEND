'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Tooltip, Tag, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlinePencilAlt, HiOutlineTrash, HiPlusCircle } from 'react-icons/hi'
import { parameterBokService, ParameterBok } from '@/services/parameterBok.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'

export default function ParameterBokPage() {
    const router = useRouter()
    const [list, setList] = useState<ParameterBok[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [total, setTotal] = useState(0)
    const pageSize = 10

    const [deleteTarget, setDeleteTarget] = useState<ParameterBok | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await parameterBokService.list(currentPage, pageSize)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage])

    useEffect(() => { fetchData() }, [fetchData])

    const filteredList = list.filter(l => {
        if (!search) return true
        const q = search.toLowerCase()
        return (l.nama_jenis ?? '').toLowerCase().includes(q) || (l.nama_bbm ?? '').toLowerCase().includes(q)
    })

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await parameterBokService.delete(deleteTarget.id_parameter_bok)
            toast.push(<Notification type="success" title="Parameter BOK berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<ParameterBok>[] = [
        {
            header: 'No',
            id: 'no',
            size: 60,
            cell: (props: CellContext<ParameterBok, unknown>) =>
                (currentPage - 1) * pageSize + props.row.index + 1,
        },
        {
            header: 'Jenis Kendaraan',
            accessorKey: 'nama_jenis',
            cell: (props: CellContext<ParameterBok, unknown>) => {
                const row = props.row.original
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-sm flex-shrink-0 select-none">
                            {(row.nama_jenis ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight">{row.nama_jenis ?? '—'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">BBM: {row.nama_bbm ?? '—'}</p>
                        </div>
                    </div>
                )
            },
        },
        {
            header: 'Konsumsi',
            accessorKey: 'konsumsi_km_per_liter',
            cell: (props: CellContext<ParameterBok, unknown>) =>
                `${formatNum(props.row.original.konsumsi_km_per_liter, 1)} km/L`,
        },
        {
            header: 'Biaya Tetap/Bulan',
            accessorKey: 'biaya_tetap_bulanan',
            cell: (props: CellContext<ParameterBok, unknown>) =>
                formatRupiah(props.row.original.biaya_tetap_bulanan),
        },
        {
            header: 'Utilisasi',
            accessorKey: 'utilisasi_km_per_bulan',
            cell: (props: CellContext<ParameterBok, unknown>) =>
                `${formatNum(props.row.original.utilisasi_km_per_bulan)} km/bln`,
        },
        {
            header: 'Margin',
            accessorKey: 'margin_persen',
            cell: (props: CellContext<ParameterBok, unknown>) => (
                <Tag className="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-0">
                    {formatNum(props.row.original.margin_persen, 1)}%
                </Tag>
            ),
        },
        {
            header: '',
            accessorKey: 'id_parameter_bok',
            cell: (props: CellContext<ParameterBok, unknown>) => {
                const row = props.row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Edit">
                            <span
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 cursor-pointer transition-colors"
                                onClick={() => router.push(ROUTES.PARAMETER_BOK_DETAIL(row.id_parameter_bok))}
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
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Parameter BOK</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Parameter biaya operasional kendaraan per jenis kendaraan — dasar estimasi harga pokok rute</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.PARAMETER_BOK_BARU)}>
                    Tambah Parameter
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex-1">
                        <Input
                            placeholder="Cari jenis kendaraan atau BBM..."
                            suffix={<HiOutlineSearch className="text-gray-400" />}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <DataTable
                    columns={columns as ColumnDef<unknown>[]}
                    data={filteredList as unknown[]}
                    loading={loading}
                    noData={!loading && filteredList.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSort={() => {}}
                    onSelectChange={() => {}}
                    selectable={false}
                />
            </Card>
            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Parameter BOK?"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: submitting }}
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">
                    Parameter BOK untuk <span className="font-semibold">&ldquo;{deleteTarget?.nama_jenis}&rdquo;</span> akan dihapus. Estimasi BOK jenis kendaraan ini tidak akan tersedia lagi. Lanjutkan?
                </p>
            </ConfirmDialog>
        </div>
    )
}
