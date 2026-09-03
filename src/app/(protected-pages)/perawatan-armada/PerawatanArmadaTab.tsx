'use client'
import { Fragment, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Dialog, Dropdown, Input, Tag, Tooltip, toast, Notification, Switcher, DatePicker, Pagination, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogAktivitasKeuanganDialog from '@/components/shared/LogAktivitasKeuanganDialog'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineDownload, HiOutlineChevronDown, HiOutlineClipboardList } from 'react-icons/hi'
import { PiTruckDuotone } from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { perawatanArmadaService, PerawatanArmada, PerawatanArmadaWithArmada, StatusPerawatan } from '@/services/perawatanArmada.service'
import type { PengajuanKeuanganInfo } from '@/services/arusKas.service'
import { armadaService, Armada } from '@/services/armada.service'

type Option = { value: string; label: string }

const STATUS_OPTIONS: { value: StatusPerawatan | ''; label: string }[] = [
    { value: '',             label: 'Semua Status' },
    { value: 'terjadwal',    label: 'Terjadwal' },
    { value: 'dalam_proses', label: 'Dalam Proses' },
]

const STATUS_AKTIF   = 'terjadwal,dalam_proses'
const STATUS_RIWAYAT = 'selesai,dibatalkan'

const RIWAYAT_STATUS_OPTIONS: { value: StatusPerawatan | ''; label: string }[] = [
    { value: '',           label: 'Semua Status' },
    { value: 'selesai',    label: 'Selesai' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
]

const STATUS_CLASS: Record<string, string> = {
    terjadwal:    'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    dalam_proses: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:      'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    dibatalkan:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-300',
}

const STATUS_UBAH: { value: StatusPerawatan; label: string; dot: string }[] = [
    { value: 'terjadwal',    label: 'Terjadwal',    dot: 'bg-blue-500' },
    { value: 'dalam_proses', label: 'Dalam Proses', dot: 'bg-emerald-500' },
    { value: 'selesai',      label: 'Selesai',      dot: 'bg-purple-500' },
    { value: 'dibatalkan',   label: 'Dibatalkan',   dot: 'bg-red-500' },
]

const PAGE_SIZE_OPTIONS = [
    { value: 10, label: '10 / halaman' },
    { value: 20, label: '20 / halaman' },
    { value: 50, label: '50 / halaman' },
]

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

function getServisBadge(tanggal: string | null): { label: string; className: string } | null {
    if (!tanggal) return null
    const days = Math.ceil((new Date(tanggal).getTime() - Date.now()) / 86400000)
    if (days < 0)  return { label: 'Lewat jadwal', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    if (days <= 30) return { label: `${days} hari lagi`, className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' }
    return null
}

export default function PerawatanArmadaTab({ mode = 'aktif', initialDetail }: { mode?: 'aktif' | 'riwayat'; initialDetail?: PerawatanArmadaWithArmada | null }) {
    const router = useRouter()
    const [list, setList]       = useState<PerawatanArmadaWithArmada[]>([])
    const [loading, setLoading] = useState(false)
    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [armadaFilter, setArmadaFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusPerawatan | ''>('')
    const [jatuhTempoOnly, setJatuhTempoOnly] = useState(false)
    const [tanggalDari, setTanggalDari]     = useState<Date | null>(null)
    const [tanggalSampai, setTanggalSampai] = useState<Date | null>(null)
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const [deleteTarget, setDeleteTarget] = useState<PerawatanArmadaWithArmada | null>(null)
    const [detailTarget, setDetailTarget] = useState<PerawatanArmadaWithArmada | null>(null)
    const [detailData, setDetailData]     = useState<PerawatanArmada | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [logOpen, setLogOpen]         = useState(false)
    const [logInfo, setLogInfo]         = useState<PengajuanKeuanganInfo | null>(null)
    const [logLoading, setLogLoading]   = useState(false)

    const openLog = (p: PerawatanArmadaWithArmada) => {
        setLogOpen(true)
        setLogInfo(null)
        setLogLoading(true)
        perawatanArmadaService.infoPengajuan(p.id_armada, p.id_perawatan)
            .then(setLogInfo)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLogLoading(false))
    }

    const openDetail = (p: PerawatanArmadaWithArmada) => {
        setDetailTarget(p)
        setDetailData(null)
        setDetailLoading(true)
        perawatanArmadaService.get(p.id_armada, p.id_perawatan)
            .then(setDetailData)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setDetailLoading(false))
    }

    useEffect(() => {
        if (initialDetail) {
            setDetailTarget(initialDetail)
            setDetailData(initialDetail)
        }
    }, [initialDetail])
    const [deleting, setDeleting]         = useState(false)
    const [alasanHapus, setAlasanHapus]   = useState('')

    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
    const [selesaiTarget, setSelesaiTarget]       = useState<PerawatanArmadaWithArmada | null>(null)
    const [batalTarget, setBatalTarget]           = useState<PerawatanArmadaWithArmada | null>(null)
    const [alasanBatal, setAlasanBatal]           = useState('')
    const [membatalkan, setMembatalkan]           = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await perawatanArmadaService.listAll({
                page: currentPage, limit: pageSize,
                id_armada: armadaFilter || undefined,
                status: mode === 'riwayat' ? (statusFilter || STATUS_RIWAYAT) : (statusFilter || STATUS_AKTIF),
                jatuh_tempo: jatuhTempoOnly ? '1' : undefined,
                search: search || undefined,
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
    }, [currentPage, pageSize, armadaFilter, statusFilter, jatuhTempoOnly, search, tanggalDari, tanggalSampai, mode])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        armadaService.list(1, 100).then(res => {
            setArmadaOptions(res.data.map((a: Armada) => ({ value: a.id_armada, label: a.nopol })))
        }).catch(() => {})
    }, [])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget || !alasanHapus.trim()) return
        setDeleting(true)
        try {
            await perawatanArmadaService.delete(deleteTarget.id_armada, deleteTarget.id_perawatan, alasanHapus.trim())
            toast.push(<Notification type="success" title="Data perawatan berhasil dihapus" />)
            setDeleteTarget(null)
            setAlasanHapus('')
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setDeleting(false)
        }
    }

    const ubahStatus = async (p: PerawatanArmadaWithArmada, status: StatusPerawatan) => {
        if (status === p.status) return
        setUpdatingStatusId(p.id_perawatan)
        try {
            await perawatanArmadaService.update(p.id_armada, p.id_perawatan, { status })
            const label = STATUS_UBAH.find(s => s.value === status)?.label ?? status
            toast.push(<Notification type="success" title={`Status diubah ke ${label}`} />)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdatingStatusId(null)
        }
    }

    const handleBatal = async () => {
        if (!batalTarget || !alasanBatal.trim()) return
        setMembatalkan(true)
        try {
            await perawatanArmadaService.batal(batalTarget.id_armada, batalTarget.id_perawatan, alasanBatal.trim())
            toast.push(<Notification type="success" title="Perawatan dibatalkan, stok sparepart dikembalikan" />)
            setBatalTarget(null)
            setAlasanBatal('')
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMembatalkan(false)
        }
    }

    const downloadUnit = async (idArmada: string, nopol: string, format: 'excel' | 'pdf') => {
        try {
            await perawatanArmadaService.downloadLaporanUnit(idArmada, nopol, format, {
                tanggal_dari: tanggalDari ? dayjs(tanggalDari).format('YYYY-MM-DD') : undefined,
                tanggal_sampai: tanggalSampai ? dayjs(tanggalSampai).format('YYYY-MM-DD') : undefined,
            })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        }
    }

    const groups: { idArmada: string; nopol: string; rows: PerawatanArmadaWithArmada[] }[] = []
    list.forEach(p => {
        const last = groups[groups.length - 1]
        if (last && last.idArmada === p.id_armada) {
            last.rows.push(p)
        } else {
            groups.push({ idArmada: p.id_armada, nopol: p.armada_nopol ?? '—', rows: [p] })
        }
    })

    let nomorBaris = (currentPage - 1) * pageSize

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari jenis perawatan atau nopol... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-full sm:w-52 shrink-0">
                        <Select
                            placeholder="Semua Armada"
                            isClearable
                            options={armadaOptions}
                            value={armadaOptions.find(o => o.value === armadaFilter) ?? null}
                            onChange={(opt) => { setArmadaFilter((opt as Option | null)?.value ?? ''); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-44 shrink-0">
                        <Select
                            isSearchable={false}
                            options={mode === 'riwayat' ? RIWAYAT_STATUS_OPTIONS : STATUS_OPTIONS}
                            value={(mode === 'riwayat' ? RIWAYAT_STATUS_OPTIONS : STATUS_OPTIONS).find(o => o.value === statusFilter)
                                ?? (mode === 'riwayat' ? RIWAYAT_STATUS_OPTIONS : STATUS_OPTIONS)[0]}
                            onChange={(opt) => { setStatusFilter((opt as { value: StatusPerawatan | '' }).value); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker
                            placeholder="Dari tanggal"
                            value={tanggalDari}
                            onChange={(date) => { setTanggalDari(date); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker
                            placeholder="Sampai tanggal"
                            value={tanggalSampai}
                            onChange={(date) => { setTanggalSampai(date); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Switcher checked={jatuhTempoOnly} onChange={checked => { setJatuhTempoOnly(checked); setCurrentPage(1) }} />
                        <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Akan Jatuh Tempo</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className={`${TH_CLASS} w-12`}>No</th>
                                <th className={TH_CLASS}>Tanggal</th>
                                <th className={TH_CLASS}>Jenis Perawatan</th>
                                <th className={TH_CLASS}>Biaya</th>
                                <th className={TH_CLASS}>KM Odometer</th>
                                <th className={TH_CLASS}>Servis Berikutnya</th>
                                <th className={TH_CLASS}>Status</th>
                                <th className="py-2.5 px-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-10 text-center">
                                        <Spinner className="inline-block" size={28} />
                                    </td>
                                </tr>
                            ) : list.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-10 text-center text-gray-400">
                                        {mode === 'riwayat' ? 'Belum ada riwayat perawatan selesai' : 'Tidak ada data perawatan'}
                                    </td>
                                </tr>
                            ) : (
                                groups.map(g => (
                                    <Fragment key={`${g.idArmada}-${g.rows[0].id_perawatan}`}>
                                        <tr className="bg-gray-50 dark:bg-gray-700/40">
                                            <td colSpan={8} className="py-2 px-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/20 px-2.5 py-1 font-mono text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/30 cursor-pointer transition-colors"
                                                            onClick={() => router.push(ROUTES.ARMADA_DETAIL(g.idArmada))}>
                                                            <PiTruckDuotone className="text-base" />
                                                            {g.nopol}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{g.rows.length} perawatan</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Tooltip title="Unduh laporan Excel unit ini">
                                                            <span
                                                                className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                                                                onClick={() => downloadUnit(g.idArmada, g.nopol, 'excel')}>
                                                                <HiOutlineDownload className="text-sm" /> Excel
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title="Unduh laporan PDF unit ini">
                                                            <span
                                                                className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-red-500 dark:text-red-400 hover:underline"
                                                                onClick={() => downloadUnit(g.idArmada, g.nopol, 'pdf')}>
                                                                <HiOutlineDownload className="text-sm" /> PDF
                                                            </span>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        {g.rows.map(p => {
                                            nomorBaris += 1
                                            return (
                                                <tr key={p.id_perawatan}>
                                                    <td className="py-2.5 px-3">{nomorBaris}</td>
                                                    <td className="py-2.5 px-3 whitespace-nowrap">{dayjs(p.tanggal).format('DD MMM YYYY')}</td>
                                                    <td className="py-2.5 px-3">{p.jenis_perawatan}</td>
                                                    <td className="py-2.5 px-3 whitespace-nowrap">{formatRupiah(p.biaya)}</td>
                                                    <td className="py-2.5 px-3">
                                                        {p.km_odometer != null
                                                            ? <span className="font-mono text-xs">{formatNum(p.km_odometer)} km</span>
                                                            : <span className="text-gray-400">—</span>}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        {p.jadwal_servis_berikutnya ? (
                                                            <div>
                                                                <p className="text-xs">{dayjs(p.jadwal_servis_berikutnya).format('DD MMM YYYY')}</p>
                                                                {(() => {
                                                                    const badge = getServisBadge(p.jadwal_servis_berikutnya)
                                                                    return badge
                                                                        ? <Tag className={`text-xs font-semibold mt-1 ${badge.className}`}>{badge.label}</Tag>
                                                                        : null
                                                                })()}
                                                            </div>
                                                        ) : <span className="text-gray-400">—</span>}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        {mode === 'aktif' && p.status !== 'selesai' ? (
                                                            updatingStatusId === p.id_perawatan ? (
                                                                <Spinner size={20} />
                                                            ) : (
                                                                <Dropdown
                                                                    placement="bottom-start"
                                                                    activeKey={p.status}
                                                                    renderTitle={
                                                                        <Tag className={`text-xs font-semibold whitespace-nowrap cursor-pointer inline-flex items-center gap-1 ${STATUS_CLASS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                                            {p.status.replace(/_/g, ' ')}
                                                                            <HiOutlineChevronDown />
                                                                        </Tag>
                                                                    }
                                                                >
                                                                    {STATUS_UBAH.map(opt => (
                                                                        <Dropdown.Item
                                                                            key={opt.value}
                                                                            eventKey={opt.value}
                                                                            onClick={() => {
                                                                                if (opt.value === p.status) return
                                                                                if (opt.value === 'selesai') setSelesaiTarget(p)
                                                                                else if (opt.value === 'dibatalkan') { setBatalTarget(p); setAlasanBatal('') }
                                                                                else ubahStatus(p, opt.value)
                                                                            }}
                                                                        >
                                                                            <span className="flex items-center gap-2 text-sm">
                                                                                <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                                                                                {opt.label}
                                                                            </span>
                                                                        </Dropdown.Item>
                                                                    ))}
                                                                </Dropdown>
                                                            )
                                                        ) : (
                                                            <Tooltip
                                                                title={`Alasan: ${p.alasan_batal}`}
                                                                disabled={p.status !== 'dibatalkan' || !p.alasan_batal}
                                                            >
                                                                <Tag className={`text-xs font-semibold whitespace-nowrap ${STATUS_CLASS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                                    {p.status.replace(/_/g, ' ')}
                                                                </Tag>
                                                            </Tooltip>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Tooltip title="Lihat Detail">
                                                                <span
                                                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                                    onClick={() => openDetail(p)}>
                                                                    <HiOutlineEye className="text-lg" />
                                                                </span>
                                                            </Tooltip>
                                                            <Tooltip title="Log Aktivitas Approval">
                                                                <span
                                                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 transition-colors"
                                                                    onClick={() => openLog(p)}>
                                                                    <HiOutlineClipboardList className="text-lg" />
                                                                </span>
                                                            </Tooltip>
                                                            {p.status !== 'selesai' && p.status !== 'dibatalkan' && (
                                                                <Tooltip title="Edit">
                                                                    <span
                                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                                        onClick={() => router.push(`${ROUTES.PERAWATAN_ARMADA_DETAIL(p.id_perawatan)}?armada=${p.id_armada}`)}>
                                                                        <HiOutlinePencilAlt className="text-lg" />
                                                                    </span>
                                                                </Tooltip>
                                                            )}
                                                            {p.status !== 'selesai' && (
                                                                <Tooltip title="Hapus">
                                                                    <span
                                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                                                        onClick={() => setDeleteTarget(p)}>
                                                                        <HiOutlineTrash className="text-lg" />
                                                                    </span>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                    <Pagination currentPage={currentPage} pageSize={pageSize} total={total} onChange={setCurrentPage} />
                    <div className="w-40">
                        <Select
                            size="sm"
                            isSearchable={false}
                            options={PAGE_SIZE_OPTIONS}
                            value={PAGE_SIZE_OPTIONS.find(o => o.value === pageSize) ?? PAGE_SIZE_OPTIONS[0]}
                            onChange={opt => {
                                if (opt) { setPageSize((opt as { value: number }).value); setCurrentPage(1) }
                            }}
                        />
                    </div>
                </div>
            </Card>

            <Dialog isOpen={!!detailTarget} onRequestClose={() => setDetailTarget(null)} onClose={() => setDetailTarget(null)} width={640}>
                <h5 className="text-base font-semibold mb-1">Detail Perawatan</h5>
                <p className="text-xs text-gray-400 mb-4">{detailTarget?.armada_nopol ?? '—'}{detailTarget?.armada_merk ? ` · ${detailTarget.armada_merk}` : ''}</p>
                {detailLoading ? (
                    <div className="flex justify-center py-8"><Spinner size={28} /></div>
                ) : (
                    <div className="max-h-[65vh] overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Tanggal</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailTarget ? dayjs(detailTarget.tanggal).format('DD MMM YYYY') : '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Status</p>
                                {detailTarget && (
                                    <Tag className={`text-xs font-semibold ${STATUS_CLASS[detailTarget.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                        {detailTarget.status.replace(/_/g, ' ')}
                                    </Tag>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Jenis Perawatan</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailTarget?.jenis_perawatan ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Biaya Jasa</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailTarget ? formatRupiah(detailTarget.biaya) : '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">KM Odometer</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailTarget?.km_odometer != null ? `${formatNum(detailTarget.km_odometer)} km` : '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Servis Berikutnya</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailTarget?.jadwal_servis_berikutnya ? dayjs(detailTarget.jadwal_servis_berikutnya).format('DD MMM YYYY') : '—'}</p>
                            </div>
                        </div>

                        {detailTarget?.keterangan && (
                            <div className="mt-4">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Keterangan</p>
                                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{detailTarget.keterangan}</p>
                            </div>
                        )}
                        {detailTarget?.status === 'dibatalkan' && detailTarget.alasan_batal && (
                            <div className="mt-4">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Alasan Dibatalkan</p>
                                <p className="text-sm text-red-500 dark:text-red-400">{detailTarget.alasan_batal}</p>
                            </div>
                        )}

                        {(detailData?.sparepart?.length ?? 0) > 0 && (
                            <div className="mt-5">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Sparepart Digunakan</p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Nama</th>
                                                <th className="py-2 px-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Qty</th>
                                                <th className="py-2 px-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Harga</th>
                                                <th className="py-2 px-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {detailData?.sparepart?.map(s => (
                                                <tr key={s.id_perawatan_sparepart}>
                                                    <td className="py-2 px-3">{s.nama_sparepart}</td>
                                                    <td className="py-2 px-3 text-right">{formatNum(s.qty)}</td>
                                                    <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(s.harga)}</td>
                                                    <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(s.subtotal)}</td>
                                                </tr>
                                            ))}
                                            <tr className="border-t border-gray-200 dark:border-gray-600">
                                                <td colSpan={3} className="py-2 px-3 text-right font-semibold text-gray-800 dark:text-gray-100">Total Biaya (jasa + sparepart)</td>
                                                <td className="py-2 px-3 text-right font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                                    {formatRupiah((detailTarget?.biaya ?? 0) + (detailData?.sparepart?.reduce((acc, s) => acc + s.subtotal, 0) ?? 0))}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {(detailData?.bukti?.length ?? 0) > 0 && (
                            <div className="mt-5">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Bukti</p>
                                <ul className="space-y-1">
                                    {detailData?.bukti?.map(b => (
                                        <li key={b.id_bukti}>
                                            <a href={b.url_file} target="_blank" rel="noreferrer"
                                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{b.nama_asli}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                    </div>
                )}
            </Dialog>

            <LogAktivitasKeuanganDialog
                isOpen={logOpen}
                info={logInfo}
                loading={logLoading}
                emptyMessage="Belum ada pengajuan keuangan untuk perawatan ini."
                onClose={() => setLogOpen(false)}
            />

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Data Perawatan"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => { setDeleteTarget(null); setAlasanHapus('') }}
                onCancel={() => { setDeleteTarget(null); setAlasanHapus('') }}
                onConfirm={handleDelete}
                confirmButtonProps={{ loading: deleting, disabled: !alasanHapus.trim() }}
            >
                <p>Hapus data perawatan &quot;{deleteTarget?.jenis_perawatan}&quot; untuk armada {deleteTarget?.armada_nopol}?</p>
                <div className="mt-3">
                    <p className="text-sm font-semibold mb-1">Alasan penghapusan <span className="text-red-500">*</span></p>
                    <Input textArea rows={3} placeholder="Tulis alasan kenapa data ini dihapus..."
                        value={alasanHapus} onChange={e => setAlasanHapus(e.target.value)} />
                </div>
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={!!selesaiTarget}
                type="warning"
                title="Tandai Selesai?"
                confirmText="Ya, Selesai"
                cancelText="Batal"
                onClose={() => setSelesaiTarget(null)}
                onCancel={() => setSelesaiTarget(null)}
                onConfirm={() => {
                    if (selesaiTarget) {
                        ubahStatus(selesaiTarget, 'selesai')
                        setSelesaiTarget(null)
                    }
                }}
            >
                <p className="text-sm">
                    Perawatan &quot;{selesaiTarget?.jenis_perawatan}&quot; armada {selesaiTarget?.armada_nopol} akan
                    ditandai selesai dan pindah ke tab Riwayat. Setelah selesai, data tidak bisa diedit atau dihapus lagi.
                </p>
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={!!batalTarget}
                type="warning"
                title="Batalkan Perawatan?"
                confirmText="Ya, Batalkan"
                cancelText="Kembali"
                onClose={() => { setBatalTarget(null); setAlasanBatal('') }}
                onCancel={() => { setBatalTarget(null); setAlasanBatal('') }}
                onConfirm={handleBatal}
                confirmButtonProps={{ loading: membatalkan, disabled: !alasanBatal.trim() }}
            >
                <p className="text-sm">
                    Perawatan &quot;{batalTarget?.jenis_perawatan}&quot; armada {batalTarget?.armada_nopol} akan
                    dibatalkan. Stok sparepart yang sudah dipotong dikembalikan otomatis, dan data tetap tampil
                    di tab Riwayat dengan status dibatalkan.
                </p>
                <div className="mt-3">
                    <p className="text-sm font-semibold mb-1">Alasan pembatalan <span className="text-red-500">*</span></p>
                    <Input textArea rows={3} placeholder="Tulis alasan kenapa perawatan ini dibatalkan..."
                        value={alasanBatal} onChange={e => setAlasanBatal(e.target.value)} />
                </div>
            </ConfirmDialog>
        </div>
    )
}
