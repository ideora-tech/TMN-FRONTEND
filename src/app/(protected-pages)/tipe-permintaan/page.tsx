'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { tipePermintaanService, TipePermintaan, JenisFormPermintaan, JENIS_FORM_LABEL } from '@/services/tipe-permintaan.service'

type AktifOption = { value: '' | '1' | '0'; label: string }
const AKTIF_OPTIONS: AktifOption[] = [
    { value: '',  label: 'Semua Status' },
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

const JENIS_FORM_CLASS: Record<JenisFormPermintaan, string> = {
    umum: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    sparepart: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-100',
    aset: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
}

export default function TipePermintaanPage() {
    const router = useRouter()
    const [list, setList]             = useState<TipePermintaan[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [aktifFilter, setAktifFilter] = useState<'' | '1' | '0'>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<TipePermintaan | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await tipePermintaanService.list(currentPage, pageSize, search, aktifFilter)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, aktifFilter])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await tipePermintaanService.delete(deleteTarget.id_tipe_permintaan)
            toast.push(<Notification type="success" title="Tipe permintaan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<TipePermintaan>[] = [
        { header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<TipePermintaan, unknown>) => (currentPage - 1) * pageSize + row.index + 1 },
        { header: 'Tipe Permintaan', accessorKey: 'nama_tipe', size: 280,
            cell: ({ row }: CellContext<TipePermintaan, unknown>) => {
                const initials = row.original.nama_tipe.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {initials}
                        </div>
                        <span className="font-semibold">{row.original.nama_tipe}</span>
                    </div>
                )
            },
        },
        { header: 'Jenis Form', accessorKey: 'jenis_form', size: 200,
            cell: ({ row }: CellContext<TipePermintaan, unknown>) => (
                <Tag className={JENIS_FORM_CLASS[row.original.jenis_form] ?? ''}>
                    {JENIS_FORM_LABEL[row.original.jenis_form] ?? row.original.jenis_form}
                </Tag>
            ),
        },
        { header: 'Judul', id: 'jumlah_judul', size: 90,
            cell: ({ row }: CellContext<TipePermintaan, unknown>) => row.original.jumlah_judul ?? 0 },
        { header: 'Status', accessorKey: 'aktif', size: 110,
            cell: ({ row }: CellContext<TipePermintaan, unknown>) => (
                <Tag className={row.original.aktif
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                    : 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100'}>
                    {row.original.aktif ? 'Aktif' : 'Nonaktif'}
                </Tag>
            ),
        },
        { header: '', id: 'action', size: 90,
            cell: ({ row }: CellContext<TipePermintaan, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Detail">
                        <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.TIPE_PERMINTAAN_DETAIL(row.original.id_tipe_permintaan))}>
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Tipe Permintaan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Data master tipe untuk judul permintaan — jenis form menentukan isian dan alur permintaan pembelian</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.TIPE_PERMINTAAN_BARU)}>
                    Tambah Tipe
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input className="flex-1 min-w-60" placeholder="Cari tipe permintaan... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }} />
                    <div className="w-44 shrink-0">
                        <Select<AktifOption>
                            options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === aktifFilter) ?? AKTIF_OPTIONS[0]}
                            onChange={opt => { setAktifFilter((opt as AktifOption).value); setCurrentPage(1) }} />
                    </div>
                </div>
                <DataTable columns={columns} data={list as unknown[]} loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }} />
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Tipe Permintaan?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}>
                <p className="text-sm">Tipe permintaan <span className="font-semibold">&ldquo;{deleteTarget?.nama_tipe}&rdquo;</span> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>
        </div>
    )
}
