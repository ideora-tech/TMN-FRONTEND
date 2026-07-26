'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Tag, Tooltip, Dialog, Button, FormItem, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX, HiOutlineCheckCircle, HiOutlineReply, HiOutlineEye } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { tripService, SettlementTrip } from '@/services/trip.service'

type Option = { value: string; label: string }

const STATUS_OPTIONS: Option[] = [
    { value: '',      label: 'Semua Status' },
    { value: 'belum', label: 'Belum Settle' },
    { value: 'lunas', label: 'Lunas' },
]

export default function SettlementSupirPage() {
    const router = useRouter()
    const [list, setList]       = useState<SettlementTrip[]>([])
    const [loading, setLoading] = useState(false)

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [tanggalDari, setTanggalDari]     = useState<Date | null>(null)
    const [tanggalSampai, setTanggalSampai] = useState<Date | null>(null)
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const [lunasTarget, setLunasTarget]   = useState<SettlementTrip | null>(null)
    const [catatanLunas, setCatatanLunas] = useState('')
    const [savingLunas, setSavingLunas]   = useState(false)
    const [batalTarget, setBatalTarget]   = useState<SettlementTrip | null>(null)
    const [savingBatal, setSavingBatal]   = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await tripService.settlementList({
                page: currentPage, limit: pageSize,
                search: search || undefined,
                status_settlement: statusFilter || undefined,
                tanggal_dari: tanggalDari ? dayjs(tanggalDari).format('YYYY-MM-DD') : undefined,
                tanggal_sampai: tanggalSampai ? dayjs(tanggalSampai).format('YYYY-MM-DD') : undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter, tanggalDari, tanggalSampai])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleLunas = async () => {
        if (!lunasTarget) return
        setSavingLunas(true)
        try {
            await tripService.tandaiLunas(lunasTarget.id_trip, catatanLunas || null)
            toast.push(<Notification type="success" title="Settlement ditandai lunas" />)
            setLunasTarget(null)
            setCatatanLunas('')
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingLunas(false)
        }
    }

    const handleBatal = async () => {
        if (!batalTarget) return
        setSavingBatal(true)
        try {
            await tripService.batalkanLunas(batalTarget.id_trip)
            toast.push(<Notification type="success" title="Status lunas dibatalkan" />)
            setBatalTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingBatal(false)
        }
    }

    const renderSelisih = (row: SettlementTrip) => {
        if (row.uang_jalan_alokasi == null) return <span className="text-gray-400 text-xs">Tanpa alokasi</span>
        const selisih = row.selisih ?? 0
        const positif = selisih >= 0
        return (
            <span className={`font-semibold ${positif ? 'text-emerald-600' : 'text-red-500'}`}>
                {positif ? '+' : '−'}{formatRupiah(Math.abs(selisih))}
            </span>
        )
    }

    const columns: ColumnDef<SettlementTrip>[] = [
        {
            header: 'No', id: 'no', size: 50,
            cell: ({ row }: CellContext<SettlementTrip, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Tanggal', accessorKey: 'waktu_berangkat', size: 110,
            cell: ({ row }: CellContext<SettlementTrip, unknown>) =>
                row.original.waktu_berangkat
                    ? dayjs(row.original.waktu_berangkat).format('DD MMM YYYY')
                    : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Supir', accessorKey: 'supir_nama', size: 160,
            cell: ({ row }: CellContext<SettlementTrip, unknown>) => (
                <div>
                    <p className="font-medium">{row.original.supir_nama ?? <span className="text-gray-400">—</span>}</p>
                    <p className="text-xs text-gray-400 font-mono">{row.original.armada_nopol ?? '—'}</p>
                </div>
            ),
        },
        {
            header: 'Rute / Proyek', accessorKey: 'rute', size: 190,
            cell: ({ row }: CellContext<SettlementTrip, unknown>) => (
                <div>
                    <p className="truncate">{row.original.rute ?? <span className="text-gray-400">—</span>}</p>
                    <p className="text-xs text-gray-400 truncate">{row.original.nama_proyek}</p>
                </div>
            ),
        },
        {
            header: 'Alokasi', accessorKey: 'uang_jalan_alokasi', size: 120,
            cell: ({ row }: CellContext<SettlementTrip, unknown>) =>
                row.original.uang_jalan_alokasi != null
                    ? formatRupiah(row.original.uang_jalan_alokasi)
                    : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Realisasi', accessorKey: 'total_realisasi', size: 130,
            cell: ({ row }: CellContext<SettlementTrip, unknown>) => (
                <div>
                    <p>{formatRupiah(row.original.total_realisasi)}</p>
                    {!row.original.ada_laporan && (
                        <p className="text-xs text-amber-600">Belum ada laporan</p>
                    )}
                </div>
            ),
        },
        {
            header: 'Selisih', id: 'selisih', size: 130,
            cell: ({ row }: CellContext<SettlementTrip, unknown>) => renderSelisih(row.original),
        },
        {
            header: 'Status', accessorKey: 'status_settlement', size: 120,
            cell: ({ row }: CellContext<SettlementTrip, unknown>) =>
                row.original.status_settlement === 'lunas' ? (
                    <div>
                        <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100">Lunas</Tag>
                        {row.original.settlement_pada && (
                            <p className="text-xs text-gray-400 mt-1">{dayjs(row.original.settlement_pada).format('DD/MM/YY HH:mm')}</p>
                        )}
                    </div>
                ) : (
                    <Tag className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100">Belum Settle</Tag>
                ),
        },
        {
            header: '', id: 'action', size: 110,
            cell: ({ row }: CellContext<SettlementTrip, unknown>) => (
                <div className="flex items-center justify-end gap-1">
                    <Tooltip title="Detail Trip">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.TRIP_DETAIL(row.original.id_trip))}>
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                    {row.original.status_settlement === 'belum' ? (
                        <Tooltip title="Tandai Lunas">
                            <span
                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors"
                                onClick={() => { setLunasTarget(row.original); setCatatanLunas('') }}>
                                <HiOutlineCheckCircle className="text-lg" />
                            </span>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Batalkan Lunas">
                            <span
                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                onClick={() => setBatalTarget(row.original)}>
                                <HiOutlineReply className="text-lg" />
                            </span>
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Settlement Supir</h3>
                <p className="text-gray-500 text-sm mt-0.5">Verifikasi uang jalan vs realisasi biaya per trip selesai</p>
            </div>

            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari supir, armada, rute, atau proyek... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-full sm:w-44 shrink-0">
                        <Select<Option>
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={(opt) => { setStatusFilter((opt as Option).value); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker placeholder="Dari tanggal" value={tanggalDari}
                            onChange={(date) => { setTanggalDari(date); setCurrentPage(1) }} />
                    </div>
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker placeholder="Sampai tanggal" value={tanggalSampai}
                            onChange={(date) => { setTanggalSampai(date); setCurrentPage(1) }} />
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

            {/* Dialog Tandai Lunas */}
            <Dialog isOpen={!!lunasTarget} onRequestClose={() => setLunasTarget(null)} onClose={() => setLunasTarget(null)}>
                <h5 className="font-bold mb-1">Tandai Lunas</h5>
                <p className="text-sm text-gray-500 mb-4">
                    {lunasTarget?.supir_nama ?? 'Tanpa supir'} · {lunasTarget?.rute ?? '—'}
                </p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                        <p className="text-xs text-gray-500 mb-1">Alokasi</p>
                        <p className="font-semibold text-sm">
                            {lunasTarget?.uang_jalan_alokasi != null ? formatRupiah(lunasTarget.uang_jalan_alokasi) : '—'}
                        </p>
                    </div>
                    <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                        <p className="text-xs text-gray-500 mb-1">Realisasi</p>
                        <p className="font-semibold text-sm">{formatRupiah(lunasTarget?.total_realisasi ?? 0)}</p>
                    </div>
                    <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                        <p className="text-xs text-gray-500 mb-1">Selisih</p>
                        <p className="font-semibold text-sm">{lunasTarget ? renderSelisih(lunasTarget) : '—'}</p>
                    </div>
                </div>
                {lunasTarget && !lunasTarget.ada_laporan && (
                    <p className="text-xs text-amber-600 mb-3">
                        ⚠ Trip ini belum punya laporan perjalanan — realisasi masih Rp 0. Pastikan memang mau di-settle.
                    </p>
                )}
                <form onSubmit={e => { e.preventDefault(); handleLunas() }}>
                    <FormItem label="Catatan (opsional)">
                        <Input textArea rows={2} placeholder="Misal: sisa dikembalikan tunai / dipotong gaji..."
                            value={catatanLunas}
                            onChange={e => setCatatanLunas(e.target.value)} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setLunasTarget(null)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={savingLunas}>Tandai Lunas</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog
                isOpen={!!batalTarget}
                type="danger"
                title="Batalkan Status Lunas"
                confirmText="Ya, Batalkan"
                cancelText="Tutup"
                onClose={() => setBatalTarget(null)}
                onCancel={() => setBatalTarget(null)}
                onConfirm={handleBatal}
                confirmButtonProps={{ loading: savingBatal }}
            >
                <p>Batalkan status lunas settlement untuk trip {batalTarget?.rute ?? ''} milik {batalTarget?.supir_nama ?? 'supir'}? Status kembali menjadi Belum Settle.</p>
            </ConfirmDialog>
        </div>
    )
}
