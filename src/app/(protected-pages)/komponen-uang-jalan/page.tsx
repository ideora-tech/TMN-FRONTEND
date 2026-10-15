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
import { komponenUangJalanService, KomponenUangJalan } from '@/services/komponenUangJalan.service'

type AktifOption = { value: '' | '1' | '0'; label: string }
const AKTIF_OPTIONS: AktifOption[] = [
    { value: '',  label: 'Semua Status' },
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function KomponenUangJalanPage() {
    const router = useRouter()
    const [list, setList]             = useState<KomponenUangJalan[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [aktifFilter, setAktifFilter] = useState<'' | '1' | '0'>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<KomponenUangJalan | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await komponenUangJalanService.list(currentPage, pageSize, search, aktifFilter)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, aktifFilter])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput.trim()); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await komponenUangJalanService.delete(deleteTarget.id_komponen_uang_jalan)
            toast.push(<Notification type="success" title="Komponen uang jalan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<KomponenUangJalan>[] = [
        { header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<KomponenUangJalan, unknown>) => (currentPage - 1) * pageSize + row.index + 1 },
        { header: 'Nama Komponen', accessorKey: 'nama', size: 280,
            cell: ({ row }: CellContext<KomponenUangJalan, unknown>) => {
                const initials = row.original.nama.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {initials}
                        </div>
                        <span className="font-semibold">{row.original.nama}</span>
                    </div>
                )
            },
        },
        { header: 'Urutan Tampil', accessorKey: 'urutan', size: 130,
            cell: ({ row }: CellContext<KomponenUangJalan, unknown>) => (
                <span className="tabular-nums text-gray-600 dark:text-gray-400">{row.original.urutan}</span>
            ),
        },
        { header: 'Status', accessorKey: 'aktif', size: 110,
            cell: ({ row }: CellContext<KomponenUangJalan, unknown>) => (
                <Tag className={row.original.aktif
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                    : 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100'}>
                    {row.original.aktif ? 'Aktif' : 'Nonaktif'}
                </Tag>
            ),
        },
        { header: '', id: 'action', size: 90,
            cell: ({ row }: CellContext<KomponenUangJalan, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Detail">
                        <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.KOMPONEN_UANG_JALAN_DETAIL(row.original.id_komponen_uang_jalan))}>
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
                    <h3 className="font-bold">Komponen Uang Jalan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Rincian biaya uang jalan per trip, dipakai di tarif rute proyek dan pengajuan Uang Jalan</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.KOMPONEN_UANG_JALAN_BARU)}>
                    Tambah Komponen
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input className="flex-1 min-w-60" placeholder="Cari nama komponen... (tekan Enter)" maxLength={100}
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

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Komponen Uang Jalan?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}>
                <p className="text-sm">
                    Komponen <span className="font-semibold">&ldquo;{deleteTarget?.nama}&rdquo;</span> akan dihapus.
                    Komponen yang sudah dipakai di tarif rute atau pengajuan Uang Jalan tidak bisa dihapus — nonaktifkan saja.
                </p>
            </ConfirmDialog>
        </div>
    )
}
