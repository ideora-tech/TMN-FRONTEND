'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineEye, HiOutlineTrash, HiOutlineSearch, HiOutlineX, HiOutlineChevronUp, HiOutlineChevronDown } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { menuService, MenuItem } from '@/services/menu.service'

type FilterOption = { value: string; label: string }

const STATUS_OPTIONS: FilterOption[] = [
    { value: '',        label: 'Semua Status' },
    { value: 'aktif',   label: 'Aktif' },
    { value: 'nonaktif', label: 'Nonaktif' },
]

const INDUK_OPTIONS: FilterOption[] = [
    { value: '',    label: 'Semua Induk' },
    { value: 'root', label: 'Root' },
    { value: 'sub',  label: 'Sub-menu' },
]

export default function MenuAdminPage() {
    const router = useRouter()
    const [list, setList]         = useState<MenuItem[]>([])
    const [loading, setLoading]   = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]              = useState(50)
    const [total, setTotal]       = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null)
    const [movingId, setMovingId] = useState<string | null>(null)

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [indukFilter, setIndukFilter]   = useState('')

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

    const handleSearchSubmit = () => setSearch(searchInput)
    const handleSearchClear  = () => { setSearchInput(''); setSearch('') }

    const filteredList = list.filter(m => {
        const matchSearch = !search ||
            m.nama_menu.toLowerCase().includes(search.toLowerCase()) ||
            (m.path ?? '').toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || (statusFilter === 'aktif' ? m.aktif : !m.aktif)
        const matchInduk = !indukFilter || (indukFilter === 'root' ? !m.id_menu_induk : !!m.id_menu_induk)
        return matchSearch && matchStatus && matchInduk
    })

    const siblingsOf = (menu: MenuItem) =>
        list
            .filter(m => (m.id_menu_induk ?? null) === (menu.id_menu_induk ?? null))
            .sort((a, b) => a.urutan - b.urutan || a.nama_menu.localeCompare(b.nama_menu))

    const handleMove = async (menu: MenuItem, arah: 'naik' | 'turun') => {
        const siblings = siblingsOf(menu)
        const idx = siblings.findIndex(m => m.id_menu === menu.id_menu)
        const targetIdx = arah === 'naik' ? idx - 1 : idx + 1
        if (idx < 0 || targetIdx < 0 || targetIdx >= siblings.length) return
        const reordered = [...siblings]
        ;[reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]]
        setMovingId(menu.id_menu)
        try {
            const changed = reordered
                .map((m, i) => ({ m, urutanBaru: i + 1 }))
                .filter(({ m, urutanBaru }) => m.urutan !== urutanBaru)
            await Promise.all(changed.map(({ m, urutanBaru }) => menuService.update(m.id_menu, { urutan: urutanBaru })))
            await fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMovingId(null)
        }
    }

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
            header: '', id: 'aksi', size: 150,
            cell: ({ row }) => {
                const sibs = siblingsOf(row.original)
                const idx = sibs.findIndex(m => m.id_menu === row.original.id_menu)
                const isFirst = idx <= 0
                const isLast = idx === sibs.length - 1
                const busy = movingId !== null
                const btnBase = 'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors'
                const btnOn = 'cursor-pointer bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                const btnOff = 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                return (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Naik">
                        <span
                            className={`${btnBase} ${isFirst || busy ? btnOff : btnOn}`}
                            onClick={() => { if (!isFirst && !busy) handleMove(row.original, 'naik') }}
                        >
                            <HiOutlineChevronUp className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Turun">
                        <span
                            className={`${btnBase} ${isLast || busy ? btnOff : btnOn}`}
                            onClick={() => { if (!isLast && !busy) handleMove(row.original, 'turun') }}
                        >
                            <HiOutlineChevronDown className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.MENU_ADMIN_DETAIL(row.original.id_menu))}
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
                )
            },
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
            <Card bodyClass="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari nama menu atau path... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-40 shrink-0">
                        <Select<FilterOption>
                            options={INDUK_OPTIONS}
                            value={INDUK_OPTIONS.find(o => o.value === indukFilter) ?? INDUK_OPTIONS[0]}
                            onChange={(opt) => setIndukFilter((opt as FilterOption).value)}
                        />
                    </div>
                    <div className="w-44 shrink-0">
                        <Select<FilterOption>
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={(opt) => setStatusFilter((opt as FilterOption).value)}
                        />
                    </div>
                </div>
                <DataTable columns={columns} data={filteredList} loading={loading}
                    noData={!loading && filteredList.length === 0}
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
