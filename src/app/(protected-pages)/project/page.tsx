'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { projectService, Project } from '@/services/project.service'

type StatusOption = { value: string; label: string }

const STATUS_OPTIONS: StatusOption[] = [
    { value: '',       label: 'Semua Status' },
    { value: 'draft',  label: 'Draft' },
    { value: 'aktif',  label: 'Aktif' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'batal',  label: 'Batal' },
]

const STATUS_TAG: Record<string, string> = {
    draft:   'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    aktif:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    batal:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

export default function ProjectPage() {
    const router = useRouter()

    const [list, setList]             = useState<Project[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await projectService.list(currentPage)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await projectService.delete(deleteTarget.id_proyek)
            toast.push(<Notification type="success" title="Proyek berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const filteredList = list.filter(p => {
        const matchSearch = !search ||
            p.nama_proyek.toLowerCase().includes(search.toLowerCase()) ||
            p.kode_proyek.toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || p.status === statusFilter
        return matchSearch && matchStatus
    })

    const columns: ColumnDef<Project>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Project, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Kode Proyek', accessorKey: 'kode_proyek', size: 150,
            cell: ({ row }: CellContext<Project, unknown>) => (
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                    {row.original.kode_proyek}
                </span>
            ),
        },
        {
            header: 'Nama Proyek', accessorKey: 'nama_proyek', size: 260,
            cell: ({ row }: CellContext<Project, unknown>) => {
                const initials = row.original.nama_proyek
                    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {initials}
                        </div>
                        <span className="font-semibold">{row.original.nama_proyek}</span>
                    </div>
                )
            },
        },
        {
            header: 'Status', accessorKey: 'status', size: 120,
            cell: ({ row }: CellContext<Project, unknown>) => (
                <Tag className={STATUS_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {row.original.status}
                </Tag>
            ),
        },
        {
            header: 'Tgl Mulai', accessorKey: 'tanggal_mulai', size: 130,
            cell: ({ row }: CellContext<Project, unknown>) => row.original.tanggal_mulai ?? '-',
        },
        {
            header: 'Tgl Selesai', accessorKey: 'tanggal_selesai', size: 130,
            cell: ({ row }: CellContext<Project, unknown>) => row.original.tanggal_selesai ?? '-',
        },
        {
            header: '', id: 'action', size: 100,
            cell: ({ row }: CellContext<Project, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.PROYEK_DETAIL(row.original.id_proyek))}
                        >
                            <HiOutlinePencilAlt className="text-lg" />
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
                    <h3 className="font-bold">Proyek</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola proyek klien</p>
                </div>
                <Button
                    variant="solid"
                    size="sm"
                    icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.PROYEK_BARU)}
                >
                    Tambah Proyek
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari kode atau nama proyek... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-44 shrink-0">
                        <Select<StatusOption>
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={(opt) => { setStatusFilter((opt as StatusOption).value); setCurrentPage(1) }}
                        />
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={filteredList as unknown[]}
                    loading={loading}
                    noData={!loading && filteredList.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Proyek?"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{
                    loading: submitting,
                    customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500',
                }}
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">
                    Proyek <span className="font-semibold">&ldquo;{deleteTarget?.nama_proyek}&rdquo;</span> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>
        </div>
    )
}
