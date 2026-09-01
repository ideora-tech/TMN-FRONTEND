'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Tag, Button, Dialog, Input, toast, Notification } from '@/components/ui'
import Tabs from '@/components/ui/Tabs'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogAktivitasKeuanganDialog from '@/components/shared/LogAktivitasKeuanganDialog'
import type { ColumnDef, CellContext, Row, DataTableResetHandle } from '@/components/shared/DataTable'
import { HiOutlineCheck, HiOutlineX, HiOutlineEye, HiOutlineSearch, HiOutlineClipboardList, HiOutlineDownload } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { approvalService, ApprovalPengajuanSaya, ApprovalRiwayatSaya } from '@/services/approval.service'
import { arusKasService, PengajuanKeuanganInfo } from '@/services/arusKas.service'
import { KODE_PENGAJUAN_PENGELUARAN, isKodePengeluaran } from '@/constants/pengeluaran.constant'

const DETAIL_ROUTE: Record<string, (id: string) => string> = {
    penawaran:      (id) => ROUTES.PENAWARAN_DETAIL(id),
    faktur:         (id) => ROUTES.FAKTUR_DETAIL(id),
    invoice_vendor: (id) => ROUTES.INVOICE_VENDOR_DETAIL(id),
    ...Object.fromEntries(KODE_PENGAJUAN_PENGELUARAN.map((kode): [string, () => string] => [kode, () => ROUTES.PROSES_PEMBAYARAN])),
}

const LABEL_CLASS = 'text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1'
const VALUE_CLASS = 'text-sm font-medium text-gray-800 dark:text-gray-200'

const JENIS_TAG_CLASS = 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-100'

type TabValue = 'menunggu' | 'riwayat'

const KEPUTUSAN_TAG: Record<'disetujui' | 'ditolak', string> = {
    disetujui: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    ditolak:   'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-100',
}

const KEPUTUSAN_LABEL: Record<'disetujui' | 'ditolak', string> = {
    disetujui: 'Disetujui',
    ditolak:   'Ditolak',
}

const STATUS_AKHIR_TAG: Record<string, string> = {
    menunggu:   'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    disetujui:  'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    ditolak:    'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-100',
    dibatalkan: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
}

const STATUS_AKHIR_LABEL: Record<string, string> = {
    menunggu:   'Menunggu Approver Lain',
    disetujui:  'Disetujui',
    ditolak:    'Ditolak',
    dibatalkan: 'Dibatalkan/Diajukan Ulang',
}

function formatTanggal(iso: string) {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PersetujuanSayaPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<TabValue>('menunggu')
    const [list, setList] = useState<ApprovalPengajuanSaya[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const [riwayatList, setRiwayatList] = useState<ApprovalRiwayatSaya[]>([])
    const [riwayatLoading, setRiwayatLoading] = useState(true)
    const [riwayatSearch, setRiwayatSearch] = useState('')
    const [exporting, setExporting] = useState(false)

    const [detailTarget, setDetailTarget] = useState<ApprovalPengajuanSaya | null>(null)
    const [riwayatDetail, setRiwayatDetail] = useState<ApprovalRiwayatSaya | null>(null)
    const [setujuTarget, setSetujuTarget] = useState<ApprovalPengajuanSaya | null>(null)
    const [tolakTarget, setTolakTarget] = useState<ApprovalPengajuanSaya | null>(null)
    const [catatanTolak, setCatatanTolak] = useState('')
    const [catatanError, setCatatanError] = useState('')
    const [processing, setProcessing] = useState(false)

    const tableRef = useRef<DataTableResetHandle | HTMLTableElement | null>(null)
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const [bulkSetujuOpen, setBulkSetujuOpen] = useState(false)
    const [bulkTolakOpen, setBulkTolakOpen] = useState(false)
    const [bulkCatatanTolak, setBulkCatatanTolak] = useState('')
    const [bulkCatatanError, setBulkCatatanError] = useState('')
    const [bulkSubmitting, setBulkSubmitting] = useState(false)

    const [logOpen, setLogOpen] = useState(false)
    const [logInfo, setLogInfo] = useState<PengajuanKeuanganInfo | null>(null)
    const [logLoading, setLogLoading] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const data = await approvalService.menungguSaya()
            setList(data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const fetchRiwayat = useCallback(async () => {
        setRiwayatLoading(true)
        try {
            const data = await approvalService.riwayatSaya()
            setRiwayatList(data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setRiwayatLoading(false)
        }
    }, [])

    useEffect(() => { fetchRiwayat() }, [fetchRiwayat])

    const handleExport = async () => {
        setExporting(true)
        try {
            await approvalService.exportSaya()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setExporting(false)
        }
    }

    const clearSelection = useCallback(() => {
        setSelectedIds([])
        const t = tableRef.current
        if (t && 'resetSelected' in t) t.resetSelected()
    }, [])

    useEffect(() => { clearSelection() }, [list, clearSelection])

    const totalNominal = useMemo(
        () => list.reduce((sum, item) => sum + (item.nominal ?? 0), 0),
        [list],
    )

    const filteredList = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return list
        return list.filter(item => [
            item.nomor_referensi,
            item.keterangan_referensi,
            item.pihak_referensi,
            item.nama_pengaju,
            item.nama_event_type,
        ].some(field => field?.toLowerCase().includes(q)))
    }, [list, search])

    const filteredRiwayat = useMemo(() => {
        const q = riwayatSearch.trim().toLowerCase()
        if (!q) return riwayatList
        return riwayatList.filter(item => [
            item.nomor_referensi,
            item.keterangan_referensi,
            item.pihak_referensi,
            item.nama_pengaju,
            item.nama_event_type,
        ].some(field => field?.toLowerCase().includes(q)))
    }, [riwayatList, riwayatSearch])

    const selectedRows = useMemo(
        () => list.filter(item => selectedIds.includes(item.id_approval)),
        [list, selectedIds],
    )

    const handleRowCheck = (checked: boolean, row: ApprovalPengajuanSaya) => {
        setSelectedIds(prev => checked
            ? Array.from(new Set([...prev, row.id_approval]))
            : prev.filter(id => id !== row.id_approval))
    }

    const handleAllRowCheck = (checked: boolean, rows: Row<ApprovalPengajuanSaya>[]) => {
        const ids = rows.map(r => r.original.id_approval)
        setSelectedIds(prev => checked
            ? Array.from(new Set([...prev, ...ids]))
            : prev.filter(id => !ids.includes(id)))
    }

    const handleSetuju = async () => {
        if (!setujuTarget) return
        setProcessing(true)
        try {
            await approvalService.putuskan(setujuTarget.id_approval, 'setuju')
            toast.push(<Notification type="success" title="Disetujui" />)
            setSetujuTarget(null)
            setDetailTarget(null)
            fetchData()
            fetchRiwayat()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setProcessing(false)
        }
    }

    const handleTolak = async () => {
        if (!tolakTarget) return
        if (!catatanTolak.trim()) {
            setCatatanError('Alasan penolakan wajib diisi')
            return
        }
        setProcessing(true)
        try {
            await approvalService.putuskan(tolakTarget.id_approval, 'tolak', catatanTolak.trim())
            toast.push(<Notification type="success" title="Ditolak" />)
            setTolakTarget(null)
            setCatatanTolak('')
            setDetailTarget(null)
            fetchData()
            fetchRiwayat()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setProcessing(false)
        }
    }

    const jalankanBulk = async (keputusan: 'setuju' | 'tolak', catatan?: string) => {
        setBulkSubmitting(true)
        let sukses = 0
        let gagal = 0
        for (const item of selectedRows) {
            try {
                await approvalService.putuskan(item.id_approval, keputusan, catatan)
                sukses += 1
            } catch (err) {
                gagal += 1
                console.error(`Gagal memutuskan pengajuan ${item.nomor_referensi ?? item.id_approval}:`, parseApiError(err))
            }
        }
        setBulkSubmitting(false)
        setBulkSetujuOpen(false)
        setBulkTolakOpen(false)
        setBulkCatatanTolak('')
        setBulkCatatanError('')
        clearSelection()
        fetchData()
        fetchRiwayat()
        const aksiLabel = keputusan === 'setuju' ? 'disetujui' : 'ditolak'
        if (gagal === 0) {
            toast.push(<Notification type="success" title={`${sukses} pengajuan berhasil ${aksiLabel}`} />)
        } else {
            toast.push(<Notification type={sukses > 0 ? 'warning' : 'danger'} title={`${sukses} berhasil, ${gagal} gagal ${aksiLabel}`} />)
        }
    }

    const handleBulkSetuju = () => jalankanBulk('setuju')

    const handleBulkTolak = () => {
        if (!bulkCatatanTolak.trim()) {
            setBulkCatatanError('Alasan penolakan wajib diisi')
            return
        }
        jalankanBulk('tolak', bulkCatatanTolak.trim())
    }

    const openLog = (item: { id_referensi: string }) => {
        setLogOpen(true)
        setLogInfo(null)
        setLogLoading(true)
        arusKasService.riwayatPengajuan(item.id_referensi)
            .then(setLogInfo)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLogLoading(false))
    }

    const bukaHalaman = (item: ApprovalPengajuanSaya) => {
        const buatRute = item.kode_event_type ? DETAIL_ROUTE[item.kode_event_type] : null
        if (!buatRute) return
        setDetailTarget(null)
        router.push(buatRute(item.id_referensi))
    }

    const columns: ColumnDef<ApprovalPengajuanSaya>[] = [
        { header: 'Jenis', accessorKey: 'nama_event_type', size: 160,
            cell: ({ row }: CellContext<ApprovalPengajuanSaya, unknown>) => (
                <Tag className={JENIS_TAG_CLASS}>
                    {row.original.nama_event_type}
                </Tag>
            ),
        },
        { header: 'Nomor', accessorKey: 'nomor_referensi', size: 150,
            cell: ({ row }: CellContext<ApprovalPengajuanSaya, unknown>) => (
                <span className="font-medium text-gray-800 dark:text-gray-100">{row.original.nomor_referensi ?? '-'}</span>
            ),
        },
        { header: 'Keterangan', accessorKey: 'keterangan_referensi',
            cell: ({ row }: CellContext<ApprovalPengajuanSaya, unknown>) => {
                const { keterangan_referensi, pihak_referensi } = row.original
                return (
                    <div>
                        <p className="text-sm text-gray-800 dark:text-gray-100 leading-tight">{keterangan_referensi ?? pihak_referensi ?? '-'}</p>
                        {keterangan_referensi != null && pihak_referensi != null && (
                            <p className="text-xs text-gray-400 mt-0.5">{pihak_referensi}</p>
                        )}
                    </div>
                )
            },
        },
        { header: 'Diajukan Oleh', accessorKey: 'nama_pengaju', size: 150,
            cell: ({ row }: CellContext<ApprovalPengajuanSaya, unknown>) => row.original.nama_pengaju ?? '-',
        },
        { header: 'Nominal', accessorKey: 'nominal', size: 150,
            cell: ({ row }: CellContext<ApprovalPengajuanSaya, unknown>) =>
                row.original.nominal != null ? formatRupiah(row.original.nominal) : '-',
        },
        { header: 'Diajukan Pada', accessorKey: 'dibuat_pada', size: 150,
            cell: ({ row }: CellContext<ApprovalPengajuanSaya, unknown>) => formatTanggal(row.original.dibuat_pada),
        },
        { header: '', id: 'aksi', size: 240,
            cell: ({ row }: CellContext<ApprovalPengajuanSaya, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    {isKodePengeluaran(row.original.kode_event_type) && (
                        <Button size="xs" variant="default"
                            icon={<HiOutlineClipboardList />} onClick={() => openLog(row.original)}>
                            Log
                        </Button>
                    )}
                    <Button size="xs" variant="default"
                        icon={<HiOutlineEye />} onClick={() => setDetailTarget(row.original)}>
                        Detail
                    </Button>
                    <Button size="xs" variant="solid"
                        icon={<HiOutlineCheck />} onClick={() => setSetujuTarget(row.original)}>
                        Setuju
                    </Button>
                    <Button size="xs" variant="default" className="text-red-500 border-red-300 hover:bg-red-50"
                        icon={<HiOutlineX />} onClick={() => { setTolakTarget(row.original); setCatatanTolak(''); setCatatanError('') }}>
                        Tolak
                    </Button>
                </div>
            ),
        },
    ]

    const riwayatColumns: ColumnDef<ApprovalRiwayatSaya>[] = [
        { header: 'Jenis', accessorKey: 'nama_event_type', size: 160,
            cell: ({ row }: CellContext<ApprovalRiwayatSaya, unknown>) => (
                <Tag className={JENIS_TAG_CLASS}>
                    {row.original.nama_event_type}
                </Tag>
            ),
        },
        { header: 'Nomor', accessorKey: 'nomor_referensi', size: 150,
            cell: ({ row }: CellContext<ApprovalRiwayatSaya, unknown>) => (
                <span className="font-medium text-gray-800 dark:text-gray-100">{row.original.nomor_referensi ?? '-'}</span>
            ),
        },
        { header: 'Keterangan', accessorKey: 'keterangan_referensi',
            cell: ({ row }: CellContext<ApprovalRiwayatSaya, unknown>) => {
                const { keterangan_referensi, pihak_referensi } = row.original
                return (
                    <div>
                        <p className="text-sm text-gray-800 dark:text-gray-100 leading-tight">{keterangan_referensi ?? pihak_referensi ?? '-'}</p>
                        {keterangan_referensi != null && pihak_referensi != null && (
                            <p className="text-xs text-gray-400 mt-0.5">{pihak_referensi}</p>
                        )}
                    </div>
                )
            },
        },
        { header: 'Nominal', accessorKey: 'nominal', size: 140,
            cell: ({ row }: CellContext<ApprovalRiwayatSaya, unknown>) =>
                row.original.nominal != null ? formatRupiah(row.original.nominal) : '-',
        },
        { header: 'Keputusan Saya', accessorKey: 'keputusan_saya', size: 150,
            cell: ({ row }: CellContext<ApprovalRiwayatSaya, unknown>) => (
                <Tag className={KEPUTUSAN_TAG[row.original.keputusan_saya]}>
                    {KEPUTUSAN_LABEL[row.original.keputusan_saya]}
                </Tag>
            ),
        },
        { header: 'Status Akhir', accessorKey: 'status_pengajuan', size: 190,
            cell: ({ row }: CellContext<ApprovalRiwayatSaya, unknown>) => (
                <Tag className={STATUS_AKHIR_TAG[row.original.status_pengajuan] ?? 'bg-gray-100 text-gray-600'}>
                    {STATUS_AKHIR_LABEL[row.original.status_pengajuan] ?? row.original.status_pengajuan}
                </Tag>
            ),
        },
        { header: 'Diputuskan Pada', accessorKey: 'diputuskan_pada', size: 150,
            cell: ({ row }: CellContext<ApprovalRiwayatSaya, unknown>) => formatTanggal(row.original.diputuskan_pada),
        },
        { header: '', id: 'aksi', size: 160,
            cell: ({ row }: CellContext<ApprovalRiwayatSaya, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    {isKodePengeluaran(row.original.kode_event_type) && (
                        <Button size="xs" variant="default"
                            icon={<HiOutlineClipboardList />} onClick={() => openLog(row.original)}>
                            Log
                        </Button>
                    )}
                    <Button size="xs" variant="default"
                        icon={<HiOutlineEye />} onClick={() => setRiwayatDetail(row.original)}>
                        Detail
                    </Button>
                </div>
            ),
        },
    ]

    const rutePengajuan = detailTarget?.kode_event_type ? DETAIL_ROUTE[detailTarget.kode_event_type] : null

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-bold">Persetujuan Saya</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Semua pengajuan yang menunggu keputusan Anda, lintas modul</p>
                </div>
                <Button size="sm" variant="default" icon={<HiOutlineDownload />}
                    loading={exporting} onClick={handleExport}>
                    Unduh Excel
                </Button>
            </div>

            <Tabs value={activeTab} onChange={val => setActiveTab(val as TabValue)}>
                <Tabs.TabList>
                    <Tabs.TabNav value="menunggu">Menunggu Keputusan</Tabs.TabNav>
                    <Tabs.TabNav value="riwayat">Riwayat Keputusan</Tabs.TabNav>
                </Tabs.TabList>
                <div className="pt-2">
                    <Tabs.TabContent value="menunggu">
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Card>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Menunggu Keputusan Anda</p>
                                    <p className="text-2xl font-bold mt-1">{list.length}</p>
                                </Card>
                                <Card>
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Nominal</p>
                                    <p className="text-2xl font-bold mt-1">{formatRupiah(totalNominal)}</p>
                                </Card>
                            </div>

                            <Card bodyClass="p-0">
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                                    <Input
                                        className="flex-1 min-w-60"
                                        placeholder="Cari nomor, keterangan, pihak, atau pengaju..."
                                        suffix={search
                                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => setSearch('')} />
                                            : <HiOutlineSearch className="text-gray-400 text-lg" />}
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                    <Button size="sm" variant="solid"
                                        icon={<HiOutlineCheck />} disabled={selectedIds.length === 0}
                                        onClick={() => setBulkSetujuOpen(true)}>
                                        Setuju Terpilih{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                                    </Button>
                                    <Button size="sm" variant="default" className="text-red-500 border-red-300 hover:bg-red-50"
                                        icon={<HiOutlineX />} disabled={selectedIds.length === 0}
                                        onClick={() => setBulkTolakOpen(true)}>
                                        Tolak Terpilih{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                                    </Button>
                                </div>

                                <DataTable
                                    ref={(instance: DataTableResetHandle | HTMLTableElement | null) => { tableRef.current = instance }}
                                    selectable
                                    columns={columns}
                                    data={filteredList as unknown[]}
                                    loading={loading}
                                    noData={!loading && filteredList.length === 0}
                                    pagingData={{ total: filteredList.length, pageIndex: 1, pageSize: Math.max(filteredList.length, 10) }}
                                    onCheckBoxChange={handleRowCheck}
                                    onIndeterminateCheckBoxChange={handleAllRowCheck}
                                    checkboxChecked={(row: ApprovalPengajuanSaya) => selectedIds.includes(row.id_approval)}
                                    indeterminateCheckboxChecked={(rows: Row<ApprovalPengajuanSaya>[]) =>
                                        rows.length > 0 && rows.every(r => selectedIds.includes(r.original.id_approval))}
                                />
                            </Card>
                        </div>
                    </Tabs.TabContent>

                    <Tabs.TabContent value="riwayat">
                        <Card bodyClass="p-0">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                                <Input
                                    className="flex-1 min-w-60"
                                    placeholder="Cari nomor, keterangan, pihak, atau pengaju..."
                                    suffix={riwayatSearch
                                        ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => setRiwayatSearch('')} />
                                        : <HiOutlineSearch className="text-gray-400 text-lg" />}
                                    value={riwayatSearch}
                                    onChange={e => setRiwayatSearch(e.target.value)}
                                />
                            </div>
                            <DataTable
                                columns={riwayatColumns}
                                data={filteredRiwayat as unknown[]}
                                loading={riwayatLoading}
                                noData={!riwayatLoading && filteredRiwayat.length === 0}
                                pagingData={{ total: filteredRiwayat.length, pageIndex: 1, pageSize: Math.max(filteredRiwayat.length, 10) }}
                            />
                        </Card>
                    </Tabs.TabContent>
                </div>
            </Tabs>

            <Dialog isOpen={!!detailTarget} width={520}
                onRequestClose={() => setDetailTarget(null)} onClose={() => setDetailTarget(null)}>
                <h5 className="text-base font-semibold mb-4">Detail Pengajuan</h5>
                {detailTarget && (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className={LABEL_CLASS}>Jenis</p>
                            <Tag className={JENIS_TAG_CLASS}>
                                {detailTarget.nama_event_type}
                            </Tag>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <p className={LABEL_CLASS}>Nomor</p>
                                <p className={VALUE_CLASS}>{detailTarget.nomor_referensi ?? '-'}</p>
                            </div>
                            <div>
                                <p className={LABEL_CLASS}>Pihak</p>
                                <p className={VALUE_CLASS}>{detailTarget.pihak_referensi ?? '-'}</p>
                            </div>
                            <div>
                                <p className={LABEL_CLASS}>Diajukan Oleh</p>
                                <p className={VALUE_CLASS}>{detailTarget.nama_pengaju ?? '-'}</p>
                            </div>
                            <div>
                                <p className={LABEL_CLASS}>Nominal</p>
                                <p className={VALUE_CLASS}>{detailTarget.nominal != null ? formatRupiah(detailTarget.nominal) : '-'}</p>
                            </div>
                            <div>
                                <p className={LABEL_CLASS}>Diajukan Pada</p>
                                <p className={VALUE_CLASS}>
                                    {new Date(detailTarget.dibuat_pada).toLocaleString('id-ID', {
                                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className={LABEL_CLASS}>Keterangan</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{detailTarget.keterangan_referensi ?? '-'}</p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="solid"
                                    icon={<HiOutlineCheck />} onClick={() => { setSetujuTarget(detailTarget); setDetailTarget(null) }}>
                                    Setuju
                                </Button>
                                <Button size="sm" variant="default" className="text-red-500 border-red-300 hover:bg-red-50"
                                    icon={<HiOutlineX />}
                                    onClick={() => { setTolakTarget(detailTarget); setCatatanTolak(''); setCatatanError(''); setDetailTarget(null) }}>
                                    Tolak
                                </Button>
                            </div>
                            {rutePengajuan && (
                                <Button size="sm" variant="plain" onClick={() => bukaHalaman(detailTarget)}>
                                    Buka Halaman
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Dialog>

            <Dialog isOpen={!!riwayatDetail} width={520}
                onRequestClose={() => setRiwayatDetail(null)} onClose={() => setRiwayatDetail(null)}>
                <h5 className="text-base font-semibold mb-4">Detail Riwayat Keputusan</h5>
                {riwayatDetail && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Tag className={JENIS_TAG_CLASS}>
                                {riwayatDetail.nama_event_type}
                            </Tag>
                            <Tag className={KEPUTUSAN_TAG[riwayatDetail.keputusan_saya]}>
                                Keputusan Saya: {KEPUTUSAN_LABEL[riwayatDetail.keputusan_saya]}
                            </Tag>
                            <Tag className={STATUS_AKHIR_TAG[riwayatDetail.status_pengajuan] ?? 'bg-gray-100 text-gray-600'}>
                                Status Akhir: {STATUS_AKHIR_LABEL[riwayatDetail.status_pengajuan] ?? riwayatDetail.status_pengajuan}
                            </Tag>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <p className={LABEL_CLASS}>Nomor</p>
                                <p className={VALUE_CLASS}>{riwayatDetail.nomor_referensi ?? '-'}</p>
                            </div>
                            <div>
                                <p className={LABEL_CLASS}>Pihak</p>
                                <p className={VALUE_CLASS}>{riwayatDetail.pihak_referensi ?? '-'}</p>
                            </div>
                            <div>
                                <p className={LABEL_CLASS}>Diajukan Oleh</p>
                                <p className={VALUE_CLASS}>{riwayatDetail.nama_pengaju ?? '-'}</p>
                            </div>
                            <div>
                                <p className={LABEL_CLASS}>Nominal</p>
                                <p className={VALUE_CLASS}>{riwayatDetail.nominal != null ? formatRupiah(riwayatDetail.nominal) : '-'}</p>
                            </div>
                            <div>
                                <p className={LABEL_CLASS}>Diajukan Pada</p>
                                <p className={VALUE_CLASS}>
                                    {new Date(riwayatDetail.diajukan_pada).toLocaleString('id-ID', {
                                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className={LABEL_CLASS}>Diputuskan Pada</p>
                                <p className={VALUE_CLASS}>
                                    {new Date(riwayatDetail.diputuskan_pada).toLocaleString('id-ID', {
                                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className={LABEL_CLASS}>Keterangan</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{riwayatDetail.keterangan_referensi ?? '-'}</p>
                        </div>
                        {riwayatDetail.catatan_saya && (
                            <div>
                                <p className={LABEL_CLASS}>Catatan Saya</p>
                                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{riwayatDetail.catatan_saya}</p>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                            {isKodePengeluaran(riwayatDetail.kode_event_type) && (
                                <Button size="sm" variant="default" icon={<HiOutlineClipboardList />}
                                    onClick={() => openLog(riwayatDetail)}>
                                    Log
                                </Button>
                            )}
                            {riwayatDetail.kode_event_type && DETAIL_ROUTE[riwayatDetail.kode_event_type] && (
                                <Button size="sm" variant="plain"
                                    onClick={() => {
                                        setRiwayatDetail(null)
                                        router.push(DETAIL_ROUTE[riwayatDetail.kode_event_type as string](riwayatDetail.id_referensi))
                                    }}>
                                    Buka Halaman
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Dialog>

            <ConfirmDialog isOpen={!!setujuTarget} type="info" title="Setujui Pengajuan"
                confirmText="Ya, Setujui" cancelText="Batal"
                confirmButtonProps={{ loading: processing }}
                onClose={() => setSetujuTarget(null)} onCancel={() => setSetujuTarget(null)} onConfirm={handleSetuju}>
                <p>Setujui pengajuan <strong>{setujuTarget?.nama_event_type}</strong> dari <strong>{setujuTarget?.nama_pengaju ?? '-'}</strong>?</p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={!!tolakTarget} type="danger" title="Tolak Pengajuan"
                confirmText="Ya, Tolak" cancelText="Batal"
                confirmButtonProps={{ loading: processing }}
                onClose={() => setTolakTarget(null)} onCancel={() => setTolakTarget(null)} onConfirm={handleTolak}>
                <p className="mb-3">Tolak pengajuan <strong>{tolakTarget?.nama_event_type}</strong> dari <strong>{tolakTarget?.nama_pengaju ?? '-'}</strong>?</p>
                <textarea rows={3} placeholder="Alasan penolakan (wajib diisi)..."
                    value={catatanTolak}
                    onChange={e => { setCatatanTolak(e.target.value); setCatatanError('') }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                {catatanError && <p className="text-red-500 text-xs mt-1">{catatanError}</p>}
            </ConfirmDialog>

            <ConfirmDialog isOpen={bulkSetujuOpen} type="info" title="Setujui Pengajuan Terpilih"
                confirmText="Ya, Setujui" cancelText="Batal"
                confirmButtonProps={{ loading: bulkSubmitting }}
                onClose={() => setBulkSetujuOpen(false)} onCancel={() => setBulkSetujuOpen(false)} onConfirm={handleBulkSetuju}>
                <p>Setujui <strong>{selectedIds.length}</strong> pengajuan terpilih?</p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={bulkTolakOpen} type="danger" title="Tolak Pengajuan Terpilih"
                confirmText="Ya, Tolak" cancelText="Batal"
                confirmButtonProps={{ loading: bulkSubmitting }}
                onClose={() => { setBulkTolakOpen(false); setBulkCatatanTolak(''); setBulkCatatanError('') }}
                onCancel={() => { setBulkTolakOpen(false); setBulkCatatanTolak(''); setBulkCatatanError('') }}
                onConfirm={handleBulkTolak}>
                <p className="mb-3">Tolak <strong>{selectedIds.length}</strong> pengajuan terpilih?</p>
                <textarea rows={3} placeholder="Alasan penolakan (wajib diisi, berlaku untuk semua yang dipilih)..."
                    value={bulkCatatanTolak}
                    onChange={e => { setBulkCatatanTolak(e.target.value); setBulkCatatanError('') }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                {bulkCatatanError && <p className="text-red-500 text-xs mt-1">{bulkCatatanError}</p>}
            </ConfirmDialog>

            <LogAktivitasKeuanganDialog
                isOpen={logOpen}
                info={logInfo}
                loading={logLoading}
                onClose={() => setLogOpen(false)}
            />
        </div>
    )
}
