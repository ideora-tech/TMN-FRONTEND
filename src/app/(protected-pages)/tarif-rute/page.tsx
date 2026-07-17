'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import { tarifRuteService, TarifRute } from '@/services/tarifRute.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'

type Option = { value: string; label: string }

const BERLAKU_OPTIONS: Option[] = [
    { value: '', label: 'Semua Periode' },
    { value: '1', label: 'Berlaku Hari Ini' },
]

const statusTarif = (t: TarifRute): 'berlaku' | 'kedaluwarsa' | 'akan_datang' => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
    if (t.tanggal_mulai > today) return 'akan_datang'
    if (t.tanggal_berakhir && t.tanggal_berakhir < today) return 'kedaluwarsa'
    return 'berlaku'
}

const STATUS_TAG: Record<string, { label: string; className: string }> = {
    berlaku:     { label: 'Berlaku',     className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-0' },
    kedaluwarsa: { label: 'Kedaluwarsa', className: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400 border-0' },
    akan_datang: { label: 'Akan Datang', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 border-0' },
}

export default function TarifRutePage() {
    const router = useRouter()
    const [data, setData] = useState<TarifRute[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [idJenis, setIdJenis] = useState('')
    const [berlaku, setBerlaku] = useState('')
    const [jenisOptions, setJenisOptions] = useState<Option[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [total, setTotal] = useState(0)
    const pageSize = 10

    const [deleteTarget, setDeleteTarget] = useState<TarifRute | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    useEffect(() => {
        jenisKendaraanService.list(1)
            .then(res => setJenisOptions([
                { value: '', label: 'Semua Jenis' },
                ...res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis })),
            ]))
            .catch(() => {})
    }, [])

    const load = useCallback(() => {
        setLoading(true)
        const params: Record<string, unknown> = { page: currentPage, limit: pageSize }
        if (search) params.search = search
        if (idJenis) params.id_jenis_kendaraan = idJenis
        if (berlaku) params.berlaku = berlaku
        tarifRuteService.list(params)
            .then(res => { setData(res.data ?? []); setTotal(res.meta?.total ?? 0) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [currentPage, search, idJenis, berlaku])

    useEffect(() => { load() }, [load])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleteLoading(true)
        try {
            await tarifRuteService.delete(deleteTarget.id_tarif_rute)
            toast.push(<Notification type="success" title="Tarif berhasil dihapus" />)
            setDeleteTarget(null)
            load()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeleteLoading(false)
        }
    }

    const columns: ColumnDef<TarifRute>[] = [
        {
            header: 'No',
            id: 'no',
            size: 60,
            cell: (props: CellContext<TarifRute, unknown>) =>
                (currentPage - 1) * pageSize + props.row.index + 1,
        },
        {
            header: 'Rute',
            accessorKey: 'nama_rute',
            cell: (props: CellContext<TarifRute, unknown>) => {
                const row = props.row.original
                return (
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight">{row.nama_rute ?? '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{row.asal ?? '—'} → {row.tujuan ?? '—'}</p>
                    </div>
                )
            },
        },
        {
            header: 'Jenis Kendaraan',
            accessorKey: 'nama_jenis',
            cell: (props: CellContext<TarifRute, unknown>) => props.row.original.nama_jenis ?? '—',
        },
        {
            header: 'Klien',
            accessorKey: 'nama_klien',
            cell: (props: CellContext<TarifRute, unknown>) =>
                props.row.original.id_klien
                    ? props.row.original.nama_klien
                    : <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300 border-0">Umum</Tag>,
        },
        {
            header: 'Harga',
            accessorKey: 'harga',
            cell: (props: CellContext<TarifRute, unknown>) => (
                <span className="font-semibold">{formatRupiah(props.row.original.harga)}</span>
            ),
        },
        {
            header: 'Periode',
            accessorKey: 'tanggal_mulai',
            cell: (props: CellContext<TarifRute, unknown>) => {
                const row = props.row.original
                return <span className="text-sm">{row.tanggal_mulai} — {row.tanggal_berakhir ?? '∞'}</span>
            },
        },
        {
            header: 'Status',
            id: 'status',
            cell: (props: CellContext<TarifRute, unknown>) => {
                const s = STATUS_TAG[statusTarif(props.row.original)]
                return <Tag className={s.className}>{s.label}</Tag>
            },
        },
        {
            header: '',
            accessorKey: 'id_tarif_rute',
            cell: (props: CellContext<TarifRute, unknown>) => {
                const row = props.row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Edit">
                            <span
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 cursor-pointer transition-colors"
                                onClick={() => router.push(ROUTES.TARIF_RUTE_DETAIL(row.id_tarif_rute))}
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
                    <h3 className="font-bold">Tarif Rute</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Harga jual per rute per jenis kendaraan — harga umum & kontrak klien</p>
                </div>
                <Button variant="solid" size="sm" onClick={() => router.push(ROUTES.TARIF_RUTE_BARU)}>+ Tambah Tarif</Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex-1">
                        <Input
                            placeholder="Cari rute, jenis kendaraan, atau klien..."
                            suffix={<HiOutlineSearch className="text-gray-400" />}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-44">
                        <Select<Option>
                            isSearchable={false}
                            options={jenisOptions}
                            value={jenisOptions.find(o => o.value === idJenis) ?? jenisOptions[0] ?? null}
                            onChange={opt => { setIdJenis(opt?.value ?? ''); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-44">
                        <Select<Option>
                            isSearchable={false}
                            options={BERLAKU_OPTIONS}
                            value={BERLAKU_OPTIONS.find(o => o.value === berlaku) ?? BERLAKU_OPTIONS[0]}
                            onChange={opt => { setBerlaku(opt?.value ?? ''); setCurrentPage(1) }}
                        />
                    </div>
                </div>
                <DataTable
                    columns={columns as ColumnDef<unknown>[]}
                    data={data as unknown[]}
                    loading={loading}
                    noData={!loading && data.length === 0}
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
                title="Hapus Tarif?"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: deleteLoading }}
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">
                    Tarif <span className="font-semibold">{deleteTarget?.nama_rute}</span> ({deleteTarget?.nama_jenis}) akan dihapus. Lanjutkan?
                </p>
            </ConfirmDialog>
        </div>
    )
}
