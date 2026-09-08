'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi'
import { paketPerawatanSparepartService, PaketPerawatanSparepart } from '@/services/paketPerawatanSparepart.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'

type PaketGroup = {
    key: string
    nama_jenis_perawatan: string | null
    nama_jenis_kendaraan: string | null
    rows: PaketPerawatanSparepart[]
}

const MAKS_PART_TAMPIL = 4

export default function PaketTab() {
    const router = useRouter()
    const [list, setList] = useState<PaketPerawatanSparepart[]>([])
    const [loading, setLoading] = useState(true)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const [deleteTarget, setDeleteTarget] = useState<PaketGroup | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await paketPerawatanSparepartService.list({ page: 1, limit: 500, search })
            setList(res.data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [search])

    useEffect(() => { fetchData() }, [fetchData])

    const groups = useMemo(() => {
        const map = new Map<string, PaketGroup>()
        for (const r of list) {
            const key = `${r.id_jenis_perawatan}|${r.id_jenis_kendaraan}`
            let g = map.get(key)
            if (!g) {
                g = { key, nama_jenis_perawatan: r.nama_jenis_perawatan, nama_jenis_kendaraan: r.nama_jenis_kendaraan, rows: [] }
                map.set(key, g)
            }
            g.rows.push(r)
        }
        return [...map.values()]
    }, [list])

    const groupsHalaman = groups.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        let sukses = 0
        const gagal: string[] = []
        for (const r of deleteTarget.rows) {
            try {
                await paketPerawatanSparepartService.delete(r.id_paket_perawatan_sparepart)
                sukses += 1
            } catch (err) {
                gagal.push(parseApiError(err))
            }
        }
        setSubmitting(false)
        setDeleteTarget(null)
        if (sukses > 0) toast.push(<Notification type="success" title={`Paket terhapus (${sukses} part)`} />)
        if (gagal.length > 0) toast.push(<Notification type="danger" title={`${gagal.length} part gagal dihapus`}>{gagal[0]}</Notification>)
        fetchData()
    }

    const columns: ColumnDef<PaketGroup>[] = [
        { header: 'No', id: 'no', size: 60,
            cell: (props: CellContext<PaketGroup, unknown>) => (currentPage - 1) * pageSize + props.row.index + 1 },
        { header: 'Jenis Perawatan', accessorKey: 'nama_jenis_perawatan',
            cell: (props: CellContext<PaketGroup, unknown>) => props.row.original.nama_jenis_perawatan ?? '—' },
        { header: 'Jenis Kendaraan', accessorKey: 'nama_jenis_kendaraan',
            cell: (props: CellContext<PaketGroup, unknown>) => props.row.original.nama_jenis_kendaraan ?? '—' },
        { header: 'Sparepart', id: 'sparepart',
            cell: (props: CellContext<PaketGroup, unknown>) => {
                const rows = props.row.original.rows
                const tampil = rows.slice(0, MAKS_PART_TAMPIL)
                return (
                    <div className="flex flex-col gap-0.5">
                        {tampil.map(r => (
                            <span key={r.id_paket_perawatan_sparepart} className="text-gray-700 dark:text-gray-300">
                                {r.nama_sparepart ?? '—'}
                                <span className="text-gray-400"> × {formatNum(r.qty_standar)} {r.satuan_sparepart ?? ''}</span>
                            </span>
                        ))}
                        {rows.length > MAKS_PART_TAMPIL && (
                            <span className="text-xs text-gray-400">+{rows.length - MAKS_PART_TAMPIL} part lainnya</span>
                        )}
                    </div>
                )
            } },
        { header: 'Jumlah Part', id: 'jumlah', size: 120,
            cell: (props: CellContext<PaketGroup, unknown>) => (
                <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    {props.row.original.rows.length} part
                </Tag>
            ) },
        { header: '', id: 'aksi',
            cell: (props: CellContext<PaketGroup, unknown>) => {
                const g = props.row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Lihat Detail">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/30 cursor-pointer transition-colors"
                                onClick={() => router.push(ROUTES.PAKET_PERAWATAN_SPAREPART_DETAIL(g.rows[0].id_paket_perawatan_sparepart))}>
                                <HiOutlineEye className="text-base" />
                            </span>
                        </Tooltip>
                        <Tooltip title="Hapus Paket">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-200 cursor-pointer transition-colors"
                                onClick={() => setDeleteTarget(g)}>
                                <HiOutlineTrash className="text-base" />
                            </span>
                        </Tooltip>
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex-1">
                        <Input placeholder="Cari jenis perawatan, jenis kendaraan, atau sparepart... (tekan Enter)"
                            suffix={
                                searchInput
                                    ? <HiOutlineX className="text-gray-400 cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                    : <HiOutlineSearch className="text-gray-400 cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                            }
                            value={searchInput} onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }} />
                    </div>
                </div>
                <DataTable columns={columns as ColumnDef<unknown>[]} data={groupsHalaman as unknown[]} loading={loading}
                    noData={!loading && groups.length === 0}
                    pagingData={{ total: groups.length, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSort={() => {}}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }}
                    selectable={false} />
            </Card>
            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Paket Sparepart?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting }}
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}>
                <p className="text-sm">
                    Paket <span className="font-semibold">{deleteTarget?.nama_jenis_perawatan}</span> ({deleteTarget?.nama_jenis_kendaraan}) berisi <span className="font-semibold">{deleteTarget?.rows.length} part</span> akan dihapus seluruhnya. Form Catat Perawatan tidak akan auto-fill part paket ini lagi. Lanjutkan?
                </p>
            </ConfirmDialog>
        </div>
    )
}
