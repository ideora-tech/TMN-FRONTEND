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
import { klienService, Klien } from '@/services/klien.service'

type AktifOption = { value: '' | '1' | '0'; label: string }

const AKTIF_OPTIONS: AktifOption[] = [
    { value: '',  label: 'Semua Status' },
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function KlienPage() {
    const router = useRouter()

    const [list, setList]           = useState<Klien[]>([])
    const [loading, setLoading]     = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [aktifFilter, setAktifFilter] = useState<'' | '1' | '0'>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    const [deleteTarget, setDeleteTarget] = useState<Klien | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await klienService.list(currentPage)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await klienService.delete(deleteTarget.id_klien)
            toast.push(<Notification type="success" title="Klien berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const filteredList = list.filter(k => {
        const matchSearch = !search ||
            k.nama_klien.toLowerCase().includes(search.toLowerCase()) ||
            k.kode_klien.toLowerCase().includes(search.toLowerCase())
        const matchAktif = aktifFilter === '' || String(k.aktif ? 1 : 0) === aktifFilter
        return matchSearch && matchAktif
    })

    const columns: ColumnDef<Klien>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Klien, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Kode', accessorKey: 'kode_klien', size: 120,
            cell: ({ row }: CellContext<Klien, unknown>) => (
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                    {row.original.kode_klien}
                </span>
            ),
        },
        {
            header: 'Nama Klien', accessorKey: 'nama_klien', size: 240,
            cell: ({ row }: CellContext<Klien, unknown>) => {
                const initials = row.original.nama_klien
                    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {initials}
                        </div>
                        <span className="font-semibold">{row.original.nama_klien}</span>
                    </div>
                )
            },
        },
        {
            header: 'Email', accessorKey: 'email', size: 200,
            cell: ({ row }: CellContext<Klien, unknown>) => (
                <span className="text-sm">{row.original.email ?? '-'}</span>
            ),
        },
        {
            header: 'Telepon', accessorKey: 'telepon', size: 150,
            cell: ({ row }: CellContext<Klien, unknown>) => row.original.telepon ?? '-',
        },
        {
            header: 'Kontak PIC', accessorKey: 'kontak_pic', size: 160,
            cell: ({ row }: CellContext<Klien, unknown>) => row.original.kontak_pic ?? '-',
        },
        {
            header: 'Status', accessorKey: 'aktif', size: 110,
            cell: ({ row }: CellContext<Klien, unknown>) => (
                <Tag className={row.original.aktif
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                    : 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100'
                }>
                    {row.original.aktif ? 'Aktif' : 'Nonaktif'}
                </Tag>
            ),
        },
        {
            header: '', id: 'action', size: 100,
            cell: ({ row }: CellContext<Klien, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Edit">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.KLIEN_DETAIL(row.original.id_klien))}
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
            <Card
                header={{
                    content: <h4>Klien</h4>,
                    extra: (
                        <Button
                            variant="solid"
                            size="sm"
                            customColorClass={() => 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-500'}
                            icon={<HiPlusCircle />}
                            onClick={() => router.push(ROUTES.KLIEN_BARU)}
                        >
                            Tambah Klien
                        </Button>
                    ),
                    bordered: false,
                }}
                bodyClass="p-0"
            >
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari kode atau nama klien... (tekan Enter)"
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
                        <Select<AktifOption>
                            options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === aktifFilter) ?? AKTIF_OPTIONS[0]}
                            onChange={(opt) => { setAktifFilter((opt as AktifOption).value); setCurrentPage(1) }}
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
                title="Hapus Klien?"
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
                    Klien <span className="font-semibold">&ldquo;{deleteTarget?.nama_klien}&rdquo;</span> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>
        </div>
    )
}
