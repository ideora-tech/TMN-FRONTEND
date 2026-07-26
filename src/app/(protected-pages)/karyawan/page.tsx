'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { karyawanService, Karyawan } from '@/services/karyawan.service'

type StatusOption = { value: string; label: string }
const STATUS_OPTIONS: StatusOption[] = [
    { value: '',        label: 'Semua Status' },
    { value: 'tetap',   label: 'Tetap' },
    { value: 'kontrak', label: 'Kontrak' },
    { value: 'magang',  label: 'Magang' },
]

const STATUS_TAG: Record<string, string> = {
    tetap:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    kontrak: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    magang:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-200',
}

export default function KaryawanPage() {
    const router = useRouter()
    const [list, setList]               = useState<Karyawan[]>([])
    const [loading, setLoading]         = useState(false)
    const [submitting, setSubmitting]   = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<Karyawan | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await karyawanService.list(currentPage, pageSize, search, statusFilter)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await karyawanService.delete(deleteTarget.id_karyawan)
            toast.push(<Notification type="success" title="Karyawan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<Karyawan>[] = [
        {
            header: 'No', id: 'no', size: 50,
            cell: ({ row }: CellContext<Karyawan, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'NIK', accessorKey: 'nik', size: 130,
            cell: ({ row }: CellContext<Karyawan, unknown>) => (
                <span className="font-mono text-xs font-semibold">{row.original.nik}</span>
            ),
        },
        {
            header: 'Nama', accessorKey: 'nama_karyawan', size: 210,
            cell: ({ row }: CellContext<Karyawan, unknown>) => (
                <div>
                    <p
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        onClick={() => router.push(ROUTES.KARYAWAN_DETAIL(row.original.id_karyawan))}
                    >
                        {row.original.nama_karyawan}
                    </p>
                    {row.original.email && <p className="text-xs text-gray-400">{row.original.email}</p>}
                </div>
            ),
        },
        {
            header: 'Jabatan', id: 'jabatan', size: 150,
            cell: ({ row }: CellContext<Karyawan, unknown>) =>
                row.original.jabatan?.nama_jabatan ?? <span className="text-gray-400">—</span>,
        },
        {
            header: 'Kepegawaian', accessorKey: 'status_kepegawaian', size: 120,
            cell: ({ row }: CellContext<Karyawan, unknown>) =>
                row.original.status_kepegawaian ? (
                    <Tag className={STATUS_TAG[row.original.status_kepegawaian] ?? 'bg-gray-100 text-gray-600'}>
                        {row.original.status_kepegawaian.charAt(0).toUpperCase() + row.original.status_kepegawaian.slice(1)}
                    </Tag>
                ) : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Status', accessorKey: 'aktif', size: 100,
            cell: ({ row }: CellContext<Karyawan, unknown>) => (
                <Tag className={row.original.aktif
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                    : 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100'}>
                    {row.original.aktif ? 'Aktif' : 'Nonaktif'}
                </Tag>
            ),
        },
        {
            header: '', id: 'action', size: 90,
            cell: ({ row }: CellContext<Karyawan, unknown>) => (
                <div className="flex items-center justify-end gap-1">
                    <Tooltip title="Edit">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.KARYAWAN_DETAIL(row.original.id_karyawan))}>
                            <HiOutlinePencilAlt className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
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
                    <h3 className="font-bold">Karyawan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Data master karyawan</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.KARYAWAN_BARU)}>
                    Tambah Karyawan
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input className="flex-1" placeholder="Cari NIK atau nama karyawan... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }} />
                    <div className="w-44 shrink-0">
                        <Select<StatusOption>
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={opt => { setStatusFilter((opt as StatusOption).value); setCurrentPage(1) }} />
                    </div>
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

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Karyawan?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting }}
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}>
                <p className="text-sm">Karyawan <span className="font-semibold">&ldquo;{deleteTarget?.nama_karyawan}&rdquo;</span> akan dihapus secara permanen.</p>
            </ConfirmDialog>
        </div>
    )
}
