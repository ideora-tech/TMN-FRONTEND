'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Button, Dialog, FormItem, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, Row, DataTableResetHandle } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UploadBerkas from '@/components/shared/UploadBerkas'
import {
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineCash,
    HiOutlineEye,
    HiOutlinePencilAlt,
    HiOutlineTrash,
    HiOutlineExternalLink,
    HiOutlineClipboardList,
} from 'react-icons/hi'
import DetailPengajuanDialog from '../arus-kas/DetailPengajuanDialog'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import { ROUTES } from '@/constants/route.constant'
import { arusKasService, PengajuanPengeluaran } from '@/services/arusKas.service'
import { KATEGORI_LABEL, STATUS_LABEL, STATUS_TAG } from '../arus-kas/pengajuanMeta'

export type BulkAction = 'cek' | 'setuju' | 'tolak' | 'transfer'

type Props = {
    list: PengajuanPengeluaran[]
    loading: boolean
    bulkActions: BulkAction[]
    showStatusColumn: boolean
    extraColumn?: 'ditolak' | 'ditransfer'
    onRefresh: () => void
    onEdit?: (p: PengajuanPengeluaran) => void
    onDelete?: (p: PengajuanPengeluaran) => void
    onShowLog?: (p: PengajuanPengeluaran) => void
}

type HasilGagalBulk = { nomor: string; alasan: string }

const MAX_FILE_SIZE = 5 * 1024 * 1024

const BULK_LABEL: Record<BulkAction, string> = {
    cek: 'Verifikasi', setuju: 'Setujui', tolak: 'Tolak', transfer: 'Transfer',
}

export default function PengajuanBulkTable({ list, loading, bulkActions, showStatusColumn, extraColumn, onRefresh, onEdit, onDelete, onShowLog }: Props) {
    const { session } = useCurrentSession()
    const authority = ((session?.user?.authority ?? []) as string[]).map(a => a.toLowerCase())
    const punyaPeran = (...roles: string[]) => roles.some(r => authority.includes(r))
    const bolehKeuangan = punyaPeran('keuangan', 'superadmin')
    const bolehManager  = punyaPeran('manager', 'superadmin')
    const bolehKelola   = punyaPeran('admin', 'manager', 'keuangan', 'superadmin')

    const eligibleFor = (p: PengajuanPengeluaran, action: BulkAction): boolean => {
        switch (action) {
            case 'cek':      return p.status === 'disetujui' && bolehKeuangan
            case 'setuju':   return p.status === 'menunggu_approval' && p.bisa_approve
            case 'tolak':    return (p.status === 'menunggu_approval' && p.bisa_approve) || ((p.status === 'disetujui' || p.status === 'dicek' || p.status === 'siap_transfer') && bolehManager)
            case 'transfer': return p.status === 'siap_transfer' && bolehKeuangan
        }
    }

    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const pagedList = list.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const tableRef = useRef<DataTableResetHandle | HTMLTableElement | null>(null)
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const clearSelection = useCallback(() => {
        setSelectedIds([])
        const t = tableRef.current
        if (t && 'resetSelected' in t) t.resetSelected()
    }, [])

    useEffect(() => {
        setCurrentPage(1)
        clearSelection()
    }, [list, clearSelection])

    const handleRowCheck = (checked: boolean, row: PengajuanPengeluaran) => {
        setSelectedIds(prev => checked
            ? Array.from(new Set([...prev, row.id_pengajuan]))
            : prev.filter(id => id !== row.id_pengajuan))
    }

    const handleAllRowCheck = (checked: boolean, rows: Row<PengajuanPengeluaran>[]) => {
        const ids = rows.map(r => r.original.id_pengajuan)
        setSelectedIds(prev => checked
            ? Array.from(new Set([...prev, ...ids]))
            : prev.filter(id => !ids.includes(id)))
    }

    const handlePageChange = (page: number) => {
        clearSelection()
        setCurrentPage(page)
    }

    const selectedRows = useMemo(() => list.filter(p => selectedIds.includes(p.id_pengajuan)), [list, selectedIds])

    const [detailTarget, setDetailTarget] = useState<PengajuanPengeluaran | null>(null)

    const [cekTarget, setCekTarget] = useState<PengajuanPengeluaran | null>(null)

    const [tolakTarget, setTolakTarget] = useState<PengajuanPengeluaran | null>(null)
    const [alasanSatuan, setAlasanSatuan] = useState('')
    const [errAlasanSatuan, setErrAlasanSatuan] = useState('')

    const [transferTarget, setTransferTarget] = useState<PengajuanPengeluaran | null>(null)
    const [tanggalTransferSatuan, setTanggalTransferSatuan] = useState('')
    const [buktiTransferSatuan, setBuktiTransferSatuan] = useState<File | null>(null)

    const [aksiSatuLoading, setAksiSatuLoading] = useState(false)

    const [bulkKeputusan, setBulkKeputusan] = useState<'cek' | 'setuju' | 'tolak' | null>(null)
    const [bulkAlasan, setBulkAlasan] = useState('')
    const [bulkErrAlasan, setBulkErrAlasan] = useState('')
    const [bulkTransferOpen, setBulkTransferOpen] = useState(false)
    const [bulkTanggalTransfer, setBulkTanggalTransfer] = useState('')
    const [bulkSubmitting, setBulkSubmitting] = useState(false)
    const [hasilBulk, setHasilBulk] = useState<{ sukses: number; gagal: HasilGagalBulk[]; dilewati: number } | null>(null)

    const jalankanCekSatuan = async () => {
        if (!cekTarget) return
        setAksiSatuLoading(true)
        try {
            const hasil = await arusKasService.cek(cekTarget.id_pengajuan)
            toast.push(<Notification type="success" title={hasil.message} />)
            setCekTarget(null)
            onRefresh()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAksiSatuLoading(false)
        }
    }

    const handleTolakSatuan = async () => {
        if (!tolakTarget) return
        if (!alasanSatuan.trim()) { setErrAlasanSatuan('Alasan penolakan wajib diisi'); return }
        setAksiSatuLoading(true)
        try {
            await arusKasService.tolak(tolakTarget.id_pengajuan, alasanSatuan.trim())
            toast.push(<Notification type="success" title="Pengajuan ditolak" />)
            setTolakTarget(null)
            setAlasanSatuan('')
            onRefresh()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAksiSatuLoading(false)
        }
    }

    const handleTransferSatuan = async () => {
        if (!transferTarget || !tanggalTransferSatuan) return
        setAksiSatuLoading(true)
        try {
            await arusKasService.transfer(transferTarget.id_pengajuan, tanggalTransferSatuan, buktiTransferSatuan)
            toast.push(<Notification type="success" title="Pengajuan berhasil ditransfer" />)
            setTransferTarget(null)
            setBuktiTransferSatuan(null)
            onRefresh()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAksiSatuLoading(false)
        }
    }

    const validasiFile = (f: File | null, set: (f: File | null) => void) => {
        if (f && f.size > MAX_FILE_SIZE) {
            toast.push(<Notification type="danger" title={`Ukuran file maksimal 5 MB (file dipilih: ${(f.size / 1024 / 1024).toFixed(1)} MB)`} />)
            return
        }
        set(f)
    }

    const jalankanKeputusanBulk = async () => {
        if (!bulkKeputusan) return
        if (bulkKeputusan === 'tolak' && !bulkAlasan.trim()) {
            setBulkErrAlasan('Alasan penolakan wajib diisi')
            return
        }
        const eligible = selectedRows.filter(p => eligibleFor(p, bulkKeputusan))
        const dilewati = selectedRows.length - eligible.length
        setBulkSubmitting(true)
        try {
            const results = await Promise.allSettled(eligible.map(p => {
                if (bulkKeputusan === 'cek') return arusKasService.cek(p.id_pengajuan)
                if (bulkKeputusan === 'setuju') return arusKasService.keputusanApproval(p.id_pengajuan, 'setuju')
                return p.status === 'menunggu_approval'
                    ? arusKasService.keputusanApproval(p.id_pengajuan, 'tolak', bulkAlasan.trim())
                    : arusKasService.tolak(p.id_pengajuan, bulkAlasan.trim())
            }))
            const gagal: HasilGagalBulk[] = []
            results.forEach((r, i) => {
                if (r.status === 'rejected') gagal.push({ nomor: eligible[i].nomor_pengajuan, alasan: parseApiError(r.reason) })
            })
            const sukses = results.length - gagal.length
            setBulkKeputusan(null)
            setBulkAlasan('')
            setBulkErrAlasan('')
            clearSelection()
            onRefresh()
            if (gagal.length === 0 && dilewati === 0) {
                toast.push(<Notification type="success" title={`${sukses} pengajuan berhasil diproses`} />)
            } else {
                setHasilBulk({ sukses, gagal, dilewati })
            }
        } finally {
            setBulkSubmitting(false)
        }
    }

    const jalankanTransferBulk = async () => {
        if (!bulkTanggalTransfer) return
        const eligible = selectedRows.filter(p => eligibleFor(p, 'transfer'))
        const dilewati = selectedRows.length - eligible.length
        setBulkSubmitting(true)
        try {
            const results = await Promise.allSettled(eligible.map(p =>
                arusKasService.transfer(p.id_pengajuan, bulkTanggalTransfer, null)
            ))
            const gagal: HasilGagalBulk[] = []
            results.forEach((r, i) => {
                if (r.status === 'rejected') gagal.push({ nomor: eligible[i].nomor_pengajuan, alasan: parseApiError(r.reason) })
            })
            const sukses = results.length - gagal.length
            setBulkTransferOpen(false)
            setBulkTanggalTransfer('')
            clearSelection()
            onRefresh()
            if (gagal.length === 0 && dilewati === 0) {
                toast.push(<Notification type="success" title={`${sukses} pengajuan berhasil ditransfer`} />)
            } else {
                setHasilBulk({ sukses, gagal, dilewati })
            }
        } finally {
            setBulkSubmitting(false)
        }
    }

    const bukaBulkKeputusan = (aksi: 'cek' | 'setuju' | 'tolak') => {
        setBulkKeputusan(aksi)
        setBulkAlasan('')
        setBulkErrAlasan('')
    }

    const eligibleCountUntuk = (aksi: BulkAction) => selectedRows.filter(p => eligibleFor(p, aksi)).length

    const statusColumn: ColumnDef<PengajuanPengeluaran> = {
        header: 'Status', id: 'status', size: 130,
        cell: ({ row }) => {
            const p = row.original
            return (
                <div className="flex flex-col gap-1">
                    <Tag className={`text-xs font-semibold ${STATUS_TAG[p.status]}`}>{STATUS_LABEL[p.status]}</Tag>
                    {p.approval_progress && (
                        <span className="text-[10px] text-gray-400">{p.approval_progress.disetujui}/{p.approval_progress.total} approve</span>
                    )}
                </div>
            )
        },
    }

    const alasanDitolakColumn: ColumnDef<PengajuanPengeluaran> = {
        header: 'Alasan Ditolak', id: 'alasan_ditolak', size: 220,
        cell: ({ row }) => <span className="text-sm text-red-500 dark:text-red-400">{row.original.alasan_ditolak ?? '—'}</span>,
    }

    const tanggalTransferColumn: ColumnDef<PengajuanPengeluaran> = {
        header: 'Tanggal Transfer', id: 'tanggal_transfer', size: 160,
        cell: ({ row }) => row.original.tanggal_transfer ? dayjs(row.original.tanggal_transfer).format('DD MMM YYYY') : '—',
    }

    const columns: ColumnDef<PengajuanPengeluaran>[] = [
        {
            header: 'No', id: 'no', size: 50,
            cell: ({ row }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Nomor', accessorKey: 'nomor_pengajuan', size: 160,
            cell: ({ row }) => {
                const p = row.original
                return (
                    <div className="flex flex-col gap-1">
                        <span className="font-mono font-semibold text-xs">{p.nomor_pengajuan}</span>
                        {p.id_trip && (
                            <a href={ROUTES.TRIP_DETAIL(p.id_trip)} target="_blank" rel="noreferrer" className="w-fit">
                                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 cursor-pointer hover:opacity-80">
                                    Dari Trip <HiOutlineExternalLink className="text-xs" />
                                </Tag>
                            </a>
                        )}
                        {p.id_perawatan && (
                            <a href={p.id_armada_perawatan
                                ? `${ROUTES.PERAWATAN_ARMADA}?armada=${p.id_armada_perawatan}&detail=${p.id_perawatan}`
                                : ROUTES.PERAWATAN_ARMADA} target="_blank" rel="noreferrer" className="w-fit">
                                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300 cursor-pointer hover:opacity-80">
                                    Dari Perawatan <HiOutlineExternalLink className="text-xs" />
                                </Tag>
                            </a>
                        )}
                        {p.id_pembelian && (
                            <a href={ROUTES.PEMBELIAN_SPAREPART_DETAIL(p.id_pembelian)} target="_blank" rel="noreferrer" className="w-fit">
                                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-lime-100 text-lime-600 dark:bg-lime-500/20 dark:text-lime-300 cursor-pointer hover:opacity-80">
                                    Dari Pembelian <HiOutlineExternalLink className="text-xs" />
                                </Tag>
                            </a>
                        )}
                        {p.id_periode && (
                            <a href={ROUTES.PAYROLL_DETAIL(p.id_periode)} target="_blank" rel="noreferrer" className="w-fit">
                                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 cursor-pointer hover:opacity-80">
                                    Dari Payroll <HiOutlineExternalLink className="text-xs" />
                                </Tag>
                            </a>
                        )}
                        {p.periode_dari && (
                            <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
                                Jadwal {dayjs(p.periode_dari).format('DD/MM')}–{dayjs(p.periode_sampai).format('DD/MM')}
                            </Tag>
                        )}
                    </div>
                )
            },
        },
        {
            header: 'Kategori', accessorKey: 'kategori', size: 120,
            cell: ({ row }) => KATEGORI_LABEL[row.original.kategori] ?? row.original.kategori,
        },
        {
            header: 'Tanggal', accessorKey: 'tanggal_pengajuan', size: 120,
            cell: ({ row }) => dayjs(row.original.tanggal_pengajuan).format('DD MMM YYYY'),
        },
        { header: 'Penerima', accessorKey: 'penerima', size: 160 },
        {
            header: 'Nominal', accessorKey: 'nominal', size: 140,
            cell: ({ row }) => <span className="tabular-nums font-semibold">{formatRupiah(row.original.nominal)}</span>,
        },
        ...(showStatusColumn ? [statusColumn] : []),
        ...(extraColumn === 'ditolak' ? [alasanDitolakColumn] : []),
        ...(extraColumn === 'ditransfer' ? [tanggalTransferColumn] : []),
        {
            header: '', id: 'aksi', size: 220,
            cell: ({ row }) => {
                const p = row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Lihat Detail">
                            <span
                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                onClick={() => setDetailTarget(p)}>
                                <HiOutlineEye className="text-lg" />
                            </span>
                        </Tooltip>
                        {onShowLog && (
                            <Tooltip title="Log Aktivitas">
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 transition-colors"
                                    onClick={() => onShowLog(p)}>
                                    <HiOutlineClipboardList className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {p.status === 'disetujui' && bolehKeuangan && (
                            <Tooltip title="Verifikasi">
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                    onClick={() => setCekTarget(p)}>
                                    <HiOutlineCheckCircle className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {(p.status === 'disetujui' || p.status === 'dicek' || p.status === 'siap_transfer') && bolehManager && (
                            <Tooltip title="Tolak">
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                    onClick={() => { setTolakTarget(p); setAlasanSatuan(''); setErrAlasanSatuan('') }}>
                                    <HiOutlineXCircle className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {p.status === 'siap_transfer' && bolehKeuangan && (
                            <Tooltip title="Transfer">
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 transition-colors"
                                    onClick={() => { setTransferTarget(p); setTanggalTransferSatuan(dayjs().format('YYYY-MM-DD')); setBuktiTransferSatuan(null) }}>
                                    <HiOutlineCash className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {(p.status === 'menunggu_approval' || p.status === 'ditolak') && bolehKelola && onEdit && (
                            <Tooltip title="Edit">
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                    onClick={() => onEdit(p)}>
                                    <HiOutlinePencilAlt className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {(p.status === 'menunggu_approval' || p.status === 'ditolak') && bolehKelola && onDelete && (
                            <Tooltip title="Hapus">
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                    onClick={() => onDelete(p)}>
                                    <HiOutlineTrash className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex flex-col gap-3">
            {selectedIds.length > 0 && bulkActions.length > 0 && (
                <div className="px-4 py-3 rounded-lg border border-blue-100 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {selectedIds.length} dipilih
                    </span>
                    <Button variant="plain" size="sm" disabled={bulkSubmitting} onClick={clearSelection}>
                        Batalkan
                    </Button>
                    <div className="flex-1" />
                    {bulkActions.includes('cek') && (
                        <Button size="sm" variant="solid" loading={bulkSubmitting} disabled={eligibleCountUntuk('cek') === 0}
                            onClick={() => bukaBulkKeputusan('cek')}>
                            Verifikasi Terpilih ({eligibleCountUntuk('cek')})
                        </Button>
                    )}
                    {bulkActions.includes('setuju') && (
                        <Button size="sm" variant="solid" loading={bulkSubmitting} disabled={eligibleCountUntuk('setuju') === 0}
                            onClick={() => bukaBulkKeputusan('setuju')}>
                            Setujui Terpilih ({eligibleCountUntuk('setuju')})
                        </Button>
                    )}
                    {bulkActions.includes('tolak') && (
                        <Button size="sm" variant="solid" customColorClass={() => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500'}
                            loading={bulkSubmitting} disabled={eligibleCountUntuk('tolak') === 0}
                            onClick={() => bukaBulkKeputusan('tolak')}>
                            Tolak Terpilih ({eligibleCountUntuk('tolak')})
                        </Button>
                    )}
                    {bulkActions.includes('transfer') && (
                        <Button size="sm" variant="solid" loading={bulkSubmitting} disabled={eligibleCountUntuk('transfer') === 0}
                            onClick={() => { setBulkTransferOpen(true); setBulkTanggalTransfer(dayjs().format('YYYY-MM-DD')) }}>
                            Transfer Terpilih ({eligibleCountUntuk('transfer')})
                        </Button>
                    )}
                </div>
            )}

            <DataTable
                ref={(instance: DataTableResetHandle | HTMLTableElement | null) => { tableRef.current = instance }}
                selectable={bulkActions.length > 0}
                columns={columns}
                data={pagedList as unknown[]}
                loading={loading}
                noData={!loading && list.length === 0}
                pagingData={{ total: list.length, pageIndex: currentPage, pageSize }}
                onPaginationChange={handlePageChange}
                onSelectChange={(size) => { clearSelection(); setPageSize(size); setCurrentPage(1) }}
                onCheckBoxChange={handleRowCheck}
                onIndeterminateCheckBoxChange={handleAllRowCheck}
                checkboxChecked={(row: PengajuanPengeluaran) => selectedIds.includes(row.id_pengajuan)}
                indeterminateCheckboxChecked={(rows: Row<PengajuanPengeluaran>[]) =>
                    rows.length > 0 && rows.every(r => selectedIds.includes(r.original.id_pengajuan))}
            />

            <DetailPengajuanDialog pengajuan={detailTarget} onClose={() => setDetailTarget(null)} onRefresh={onRefresh} />

            <ConfirmDialog
                isOpen={!!cekTarget}
                type="info"
                title="Verifikasi Pengajuan"
                confirmText="Ya, Verifikasi"
                cancelText="Batal"
                onClose={() => setCekTarget(null)}
                onCancel={() => setCekTarget(null)}
                onConfirm={jalankanCekSatuan}
                confirmButtonProps={{ loading: aksiSatuLoading }}
            >
                <p>Tandai pengajuan {cekTarget?.nomor_pengajuan} sebagai sudah diverifikasi?</p>
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={!!tolakTarget}
                type="danger"
                title="Tolak Pengajuan"
                confirmText="Ya, Tolak"
                cancelText="Batal"
                onClose={() => { setTolakTarget(null); setAlasanSatuan(''); setErrAlasanSatuan('') }}
                onCancel={() => { setTolakTarget(null); setAlasanSatuan(''); setErrAlasanSatuan('') }}
                onConfirm={handleTolakSatuan}
                confirmButtonProps={{ loading: aksiSatuLoading }}
            >
                <p>Tolak pengajuan {tolakTarget?.nomor_pengajuan}?</p>
                <div className="mt-3">
                    <p className="text-sm font-semibold mb-1">Alasan penolakan <span className="text-red-500">*</span></p>
                    <Input textArea rows={3} placeholder="Jelaskan alasan penolakan..."
                        value={alasanSatuan} onChange={e => { setAlasanSatuan(e.target.value); setErrAlasanSatuan('') }} />
                    {errAlasanSatuan && <p className="text-xs text-red-500 mt-1">{errAlasanSatuan}</p>}
                </div>
            </ConfirmDialog>

            <Dialog isOpen={!!transferTarget}
                onRequestClose={() => { setTransferTarget(null); setBuktiTransferSatuan(null) }}
                onClose={() => { setTransferTarget(null); setBuktiTransferSatuan(null) }} width={420}>
                <h5 className="text-base font-semibold mb-5">Transfer Pengajuan</h5>
                <form onSubmit={e => { e.preventDefault(); handleTransferSatuan() }}>
                    {transferTarget?.id_pembelian && (
                        <p className="text-xs text-gray-400 mb-4">
                            Transfer sebelum realisasi = uang muka sebesar nominal saat ini; selisih dengan nota dicatat di detail pembelian.
                        </p>
                    )}
                    <FormItem label="Tanggal Transfer" asterisk>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={tanggalTransferSatuan ? dayjs(tanggalTransferSatuan).toDate() : null}
                            onChange={date => setTanggalTransferSatuan(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </FormItem>
                    <FormItem label="Bukti Transfer (opsional)">
                        <UploadBerkas file={buktiTransferSatuan} onChange={f => validasiFile(f, setBuktiTransferSatuan)} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => { setTransferTarget(null); setBuktiTransferSatuan(null) }}>Batal</Button>
                        <Button type="submit" variant="solid" loading={aksiSatuLoading} disabled={!tanggalTransferSatuan}>Transfer</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog
                isOpen={!!bulkKeputusan}
                type={bulkKeputusan === 'tolak' ? 'danger' : 'info'}
                title={bulkKeputusan ? `${BULK_LABEL[bulkKeputusan]} Pengajuan Terpilih` : ''}
                confirmText={bulkKeputusan ? `Ya, ${BULK_LABEL[bulkKeputusan]}` : 'Ya'}
                cancelText="Batal"
                onClose={() => { setBulkKeputusan(null); setBulkAlasan(''); setBulkErrAlasan('') }}
                onCancel={() => { setBulkKeputusan(null); setBulkAlasan(''); setBulkErrAlasan('') }}
                onConfirm={jalankanKeputusanBulk}
                confirmButtonProps={{ loading: bulkSubmitting }}
            >
                {bulkKeputusan && (
                    <>
                        <p>
                            {BULK_LABEL[bulkKeputusan]} {eligibleCountUntuk(bulkKeputusan)} pengajuan terpilih?
                            {selectedRows.length - eligibleCountUntuk(bulkKeputusan) > 0 && (
                                <span className="block text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    {selectedRows.length - eligibleCountUntuk(bulkKeputusan)} dari {selectedRows.length} dilewati karena statusnya tidak memenuhi syarat aksi ini.
                                </span>
                            )}
                        </p>
                        {bulkKeputusan === 'tolak' && (
                            <div className="mt-3">
                                <p className="text-sm font-semibold mb-1">Alasan penolakan <span className="text-red-500">*</span></p>
                                <Input textArea rows={3} placeholder="Jelaskan alasan penolakan..."
                                    value={bulkAlasan} onChange={e => { setBulkAlasan(e.target.value); setBulkErrAlasan('') }} />
                                {bulkErrAlasan && <p className="text-xs text-red-500 mt-1">{bulkErrAlasan}</p>}
                            </div>
                        )}
                    </>
                )}
            </ConfirmDialog>

            <Dialog isOpen={bulkTransferOpen} onRequestClose={() => setBulkTransferOpen(false)} onClose={() => setBulkTransferOpen(false)} width={420}>
                <h5 className="text-base font-semibold mb-1">Transfer Pengajuan Terpilih</h5>
                <p className="text-xs text-gray-400 mb-4">
                    {eligibleCountUntuk('transfer')} pengajuan akan ditransfer dengan tanggal yang sama.
                    {selectedRows.length - eligibleCountUntuk('transfer') > 0 && ` ${selectedRows.length - eligibleCountUntuk('transfer')} dilewati karena belum berstatus Siap Transfer.`}
                </p>
                <form onSubmit={e => { e.preventDefault(); jalankanTransferBulk() }}>
                    <FormItem label="Tanggal Transfer" asterisk>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={bulkTanggalTransfer ? dayjs(bulkTanggalTransfer).toDate() : null}
                            onChange={date => setBulkTanggalTransfer(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </FormItem>
                    <p className="text-xs text-gray-400 mt-1">Transfer massal tidak melampirkan bukti. Untuk melampirkan bukti transfer, gunakan tombol transfer di baris masing-masing.</p>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setBulkTransferOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={bulkSubmitting} disabled={!bulkTanggalTransfer}>Transfer</Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={!!hasilBulk} onRequestClose={() => setHasilBulk(null)} onClose={() => setHasilBulk(null)} width={520}>
                <h5 className="text-base font-semibold mb-1">Hasil Aksi Massal</h5>
                {hasilBulk && (
                    <>
                        <p className="text-sm text-gray-500 mb-4">
                            {hasilBulk.sukses} berhasil, {hasilBulk.gagal.length} gagal
                            {hasilBulk.dilewati > 0 && `, ${hasilBulk.dilewati} dilewati (status tidak sesuai)`}.
                        </p>
                        {hasilBulk.gagal.length > 0 && (
                            <div className="max-h-[50vh] overflow-y-auto pr-1">
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-50 dark:bg-blue-500/10">
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <th className="py-2.5 pl-3 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Nomor</th>
                                            <th className="py-2.5 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Alasan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {hasilBulk.gagal.map((g, i) => (
                                            <tr key={i}>
                                                <td className="py-2.5 pl-3 pr-4 font-mono text-xs">{g.nomor}</td>
                                                <td className="py-2.5 pr-3 text-red-500 text-xs">{g.alasan}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
                <div className="flex justify-end mt-6">
                    <Button variant="solid" onClick={() => setHasilBulk(null)}>Tutup</Button>
                </div>
            </Dialog>
        </div>
    )
}
