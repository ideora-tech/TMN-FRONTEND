'use client'
import { Fragment, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Tag, Tooltip, toast, Notification, Switcher, DatePicker, Pagination, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiOutlineSearch, HiOutlineX, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineDownload } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { perawatanArmadaService, PerawatanArmadaWithArmada, StatusPerawatan } from '@/services/perawatanArmada.service'
import { armadaService, Armada } from '@/services/armada.service'

type Option = { value: string; label: string }

const STATUS_OPTIONS: { value: StatusPerawatan | ''; label: string }[] = [
    { value: '',             label: 'Semua Status' },
    { value: 'terjadwal',    label: 'Terjadwal' },
    { value: 'dalam_proses', label: 'Dalam Proses' },
]

const STATUS_AKTIF = 'terjadwal,dalam_proses'

const STATUS_CLASS: Record<string, string> = {
    terjadwal:    'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    dalam_proses: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:      'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
}

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

export default function PerawatanArmadaTab({ mode = 'aktif' }: { mode?: 'aktif' | 'riwayat' }) {
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
    const [deleting, setDeleting]         = useState(false)
    const [alasanHapus, setAlasanHapus]   = useState('')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await perawatanArmadaService.listAll({
                page: currentPage, limit: pageSize,
                id_armada: armadaFilter || undefined,
                status: mode === 'riwayat' ? 'selesai' : (statusFilter || STATUS_AKTIF),
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
        } finally {
            setDeleting(false)
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
                    {mode === 'aktif' && (
                        <div className="w-full sm:w-44 shrink-0">
                            <Select
                                isSearchable={false}
                                options={STATUS_OPTIONS}
                                value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                                onChange={(opt) => { setStatusFilter((opt as { value: StatusPerawatan | '' }).value); setCurrentPage(1) }}
                            />
                        </div>
                    )}
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
                                                    <div>
                                                        <span
                                                            className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                                            onClick={() => router.push(ROUTES.ARMADA_DETAIL(g.idArmada))}>
                                                            {g.nopol}
                                                        </span>
                                                        <span className="text-xs text-gray-400 ml-2">{g.rows.length} perawatan</span>
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
                                                        <Tag className={`text-xs font-semibold whitespace-nowrap ${STATUS_CLASS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                            {p.status.replace(/_/g, ' ')}
                                                        </Tag>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {p.status !== 'selesai' && (
                                                                <Tooltip title="Edit">
                                                                    <span
                                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                                        onClick={() => router.push(`${ROUTES.PERAWATAN_ARMADA_DETAIL(p.id_perawatan)}?armada=${p.id_armada}`)}>
                                                                        <HiOutlinePencilAlt className="text-lg" />
                                                                    </span>
                                                                </Tooltip>
                                                            )}
                                                            <Tooltip title="Hapus">
                                                                <span
                                                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                                                    onClick={() => setDeleteTarget(p)}>
                                                                    <HiOutlineTrash className="text-lg" />
                                                                </span>
                                                            </Tooltip>
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
        </div>
    )
}
