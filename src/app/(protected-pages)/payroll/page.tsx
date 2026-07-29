'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Tag, Tooltip, Dialog, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineEye, HiOutlineTrash, HiOutlineCog, HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { payrollService, PayrollPeriode } from '@/services/payroll.service'

type Option = { value: string; label: string }

const BULAN_OPTIONS: Option[] = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
].map((nama, i) => ({ value: String(i + 1).padStart(2, '0'), label: nama }))

const TAHUN_SEKARANG = Number(dayjs().format('YYYY'))
const TAHUN_OPTIONS: Option[] = [TAHUN_SEKARANG - 1, TAHUN_SEKARANG, TAHUN_SEKARANG + 1]
    .map(t => ({ value: String(t), label: String(t) }))

const STATUS_OPTIONS: Option[] = [
    { value: '',      label: 'Semua Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'final', label: 'Final' },
]

export default function PayrollPage() {
    const router = useRouter()
    const [list, setList]       = useState<PayrollPeriode[]>([])
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const [buatOpen, setBuatOpen]   = useState(false)
    const [bulan, setBulan]         = useState(dayjs().format('MM'))
    const [tahun, setTahun]         = useState(String(TAHUN_SEKARANG))
    const [previewNama, setPreviewNama] = useState('')
    const [saving, setSaving]       = useState(false)

    const [hapusTarget, setHapusTarget] = useState<PayrollPeriode | null>(null)
    const [deleting, setDeleting]       = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await payrollService.listPeriode({
                page: currentPage, limit: pageSize,
                search: search || undefined,
                status: statusFilter || undefined,
            })
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

    useEffect(() => {
        if (!buatOpen) return
        payrollService.previewRentang(`${tahun}-${bulan}`)
            .then(r => setPreviewNama(r.nama))
            .catch(() => setPreviewNama(''))
    }, [buatOpen, bulan, tahun])

    const handleBuat = async () => {
        setSaving(true)
        try {
            const periode = await payrollService.buatPeriode(`${tahun}-${bulan}`)
            toast.push(<Notification type="success" title="Periode payroll dibuat" />)
            setBuatOpen(false)
            router.push(ROUTES.PAYROLL_DETAIL(periode.id_periode))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleHapus = async () => {
        if (!hapusTarget) return
        setDeleting(true)
        try {
            await payrollService.hapusPeriode(hapusTarget.id_periode)
            toast.push(<Notification type="success" title="Periode dihapus" />)
            setHapusTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeleting(false)
        }
    }

    const columns: ColumnDef<PayrollPeriode>[] = [
        {
            header: 'Periode', accessorKey: 'nama', size: 190,
            cell: ({ row }: CellContext<PayrollPeriode, unknown>) => (
                <span
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    onClick={() => router.push(ROUTES.PAYROLL_DETAIL(row.original.id_periode))}
                >
                    {row.original.nama}
                </span>
            ),
        },
        {
            header: 'Jumlah Slip', accessorKey: 'jumlah_slip', size: 100,
            cell: ({ row }: CellContext<PayrollPeriode, unknown>) =>
                row.original.jumlah_slip && row.original.jumlah_slip > 0
                    ? `${row.original.jumlah_slip} karyawan`
                    : <span className="text-gray-400">Belum digenerate</span>,
        },
        {
            header: 'Total Gaji Bersih', accessorKey: 'total_gaji_bersih', size: 150,
            cell: ({ row }: CellContext<PayrollPeriode, unknown>) =>
                row.original.total_gaji_bersih && row.original.total_gaji_bersih > 0
                    ? <span className="font-semibold">{formatRupiah(row.original.total_gaji_bersih)}</span>
                    : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Status', accessorKey: 'status', size: 100,
            cell: ({ row }: CellContext<PayrollPeriode, unknown>) => (
                <Tag className={row.original.status === 'final'
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100'}>
                    {row.original.status === 'final' ? 'Final' : 'Draft'}
                </Tag>
            ),
        },
        {
            header: '', id: 'action', size: 90,
            cell: ({ row }: CellContext<PayrollPeriode, unknown>) => (
                <div className="flex items-center justify-end gap-1">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.PAYROLL_DETAIL(row.original.id_periode))}>
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                    {row.original.status === 'draft' && (
                        <Tooltip title="Hapus">
                            <span
                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                onClick={() => setHapusTarget(row.original)}>
                                <HiOutlineTrash className="text-lg" />
                            </span>
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Payroll</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Proses gaji per periode cut-off — draft, koreksi, lalu finalisasi</p>
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip title="Pengaturan Payroll">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                            onClick={() => router.push(ROUTES.PAYROLL_PENGATURAN)}>
                            <HiOutlineCog className="text-lg" />
                        </span>
                    </Tooltip>
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => setBuatOpen(true)}>
                        Buat Periode
                    </Button>
                </div>
            </div>

            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nama periode... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-44 shrink-0">
                        <Select<Option>
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={(opt) => { setStatusFilter((opt as Option).value); setCurrentPage(1) }}
                        />
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

            {/* Dialog Buat Periode */}
            <Dialog isOpen={buatOpen} onRequestClose={() => setBuatOpen(false)} onClose={() => setBuatOpen(false)} width={420}>
                <h5 className="font-bold mb-4">Buat Periode Payroll</h5>
                <form onSubmit={e => { e.preventDefault(); handleBuat() }}>
                    <div className="grid grid-cols-2 gap-x-4">
                        <FormItem label="Bulan Gajian" asterisk>
                            <Select isSearchable={false} options={BULAN_OPTIONS}
                                value={BULAN_OPTIONS.find(o => o.value === bulan) ?? null}
                                onChange={opt => setBulan((opt as Option).value)} />
                        </FormItem>
                        <FormItem label="Tahun" asterisk>
                            <Select isSearchable={false} options={TAHUN_OPTIONS}
                                value={TAHUN_OPTIONS.find(o => o.value === tahun) ?? null}
                                onChange={opt => setTahun((opt as Option).value)} />
                        </FormItem>
                    </div>
                    {previewNama && (
                        <p className="text-sm text-gray-500 mb-2">
                            Rentang periode: <span className="font-semibold text-gray-700 dark:text-gray-200">{previewNama}</span>
                        </p>
                    )}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setBuatOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}>Buat</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog
                isOpen={!!hapusTarget}
                type="danger"
                title="Hapus Periode"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => setHapusTarget(null)}
                onCancel={() => setHapusTarget(null)}
                onConfirm={handleHapus}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>Hapus periode {hapusTarget?.nama} beserta seluruh slip draft-nya?</p>
            </ConfirmDialog>
        </div>
    )
}
