'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Card, Button, Tag, Tooltip, Dialog, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogAktivitasKeuanganDialog from '@/components/shared/LogAktivitasKeuanganDialog'
import DetailPengajuanDialog from '../arus-kas/DetailPengajuanDialog'
import { KATEGORI_LABEL, KATEGORI_OPTIONS_FILTER } from '../arus-kas/pengajuanMeta'
import { HiOutlineClipboardList, HiOutlineEye, HiOutlineArrowRight, HiOutlineSearch, HiOutlineX, HiOutlineCheckCircle } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { arusKasService, PengajuanPengeluaran, PengajuanKeuanganInfo } from '@/services/arusKas.service'

type Option = { value: string; label: string }

export default function ApprovalSayaPage() {
    const router = useRouter()
    const [list, setList]               = useState<PengajuanPengeluaran[]>([])
    const [totalNominal, setTotalNominal] = useState(0)
    const [loading, setLoading]         = useState(true)
    const [prosesId, setProsesId]       = useState<string | null>(null)

    const [search, setSearch]                 = useState('')
    const [kategoriFilter, setKategoriFilter]  = useState('')

    const [approveTarget, setApproveTarget] = useState<PengajuanPengeluaran | null>(null)
    const [tolakTarget, setTolakTarget]     = useState<PengajuanPengeluaran | null>(null)
    const [catatanTolak, setCatatanTolak]   = useState('')
    const [errTolak, setErrTolak]           = useState('')
    const [detailTarget, setDetailTarget]   = useState<PengajuanPengeluaran | null>(null)

    const [logOpen, setLogOpen]       = useState(false)
    const [logInfo, setLogInfo]       = useState<PengajuanKeuanganInfo | null>(null)
    const [logLoading, setLogLoading] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await arusKasService.menungguApprovalSaya()
            setList(res.pengajuan)
            setTotalNominal(res.ringkasan.total_nominal)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setList([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const filteredList = useMemo(() => {
        const q = search.trim().toLowerCase()
        return list.filter(p => {
            if (kategoriFilter && p.kategori !== kategoriFilter) return false
            if (q && !p.nomor_pengajuan.toLowerCase().includes(q) && !p.penerima.toLowerCase().includes(q)) return false
            return true
        })
    }, [list, kategoriFilter, search])

    const putuskan = async (p: PengajuanPengeluaran, keputusan: 'setuju' | 'tolak', catatan?: string) => {
        setProsesId(p.id_pengajuan)
        try {
            await arusKasService.keputusanApproval(p.id_pengajuan, keputusan, catatan)
            toast.push(<Notification type="success"
                title={keputusan === 'setuju' ? `Pengajuan ${p.nomor_pengajuan} disetujui` : `Pengajuan ${p.nomor_pengajuan} ditolak`} />)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setProsesId(null)
        }
    }

    const handleTolak = () => {
        if (!tolakTarget) return
        if (!catatanTolak.trim()) {
            setErrTolak('Alasan penolakan wajib diisi')
            return
        }
        const target = tolakTarget
        setTolakTarget(null)
        setCatatanTolak('')
        setErrTolak('')
        putuskan(target, 'tolak', catatanTolak.trim())
    }

    const openLog = (p: PengajuanPengeluaran) => {
        setLogOpen(true)
        setLogInfo(null)
        setLogLoading(true)
        arusKasService.riwayatPengajuan(p.id_pengajuan)
            .then(setLogInfo)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLogLoading(false))
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-bold">Approval Saya</h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Pengajuan pengeluaran yang menunggu keputusan Anda sebagai approver
                    </p>
                </div>
                <button type="button"
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => router.push(ROUTES.PROSES_PEMBAYARAN)}>
                    Lihat semua di Proses Pembayaran <HiOutlineArrowRight />
                </button>
            </div>

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
                        placeholder="Cari nomor pengajuan atau penerima..."
                        suffix={search
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => setSearch('')} />
                            : <HiOutlineSearch className="text-gray-400 text-lg" />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <div className="w-full sm:w-56 shrink-0">
                        <Select
                            isSearchable={false}
                            placeholder="Semua kategori"
                            isClearable
                            options={KATEGORI_OPTIONS_FILTER}
                            value={KATEGORI_OPTIONS_FILTER.find(o => o.value === kategoriFilter) ?? null}
                            onChange={opt => setKategoriFilter((opt as Option | null)?.value ?? '')}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-gray-400 py-10">Memuat data...</div>
                ) : filteredList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-14 px-4">
                        <HiOutlineCheckCircle className="text-4xl text-emerald-400 mb-2" />
                        <p className="font-semibold text-gray-600 dark:text-gray-300">
                            {list.length === 0 ? 'Tidak ada pengajuan yang menunggu approval Anda' : 'Tidak ada yang cocok dengan pencarian'}
                        </p>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {list.length === 0 && 'Pengajuan baru akan muncul di sini begitu ada yang membutuhkan keputusan Anda.'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700 px-4">
                        {filteredList.map(p => (
                            <div key={p.id_pengajuan} className="flex flex-wrap items-center gap-3 py-3">
                                <div className="flex-1 min-w-52">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-gray-400">{p.nomor_pengajuan}</span>
                                        <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-100 border-0 text-xs">
                                            {KATEGORI_LABEL[p.kategori] ?? p.kategori}
                                        </Tag>
                                    </div>
                                    <p className="font-semibold text-sm mt-0.5">{p.penerima}</p>
                                    {p.keterangan && <p className="text-xs text-gray-400 truncate max-w-md">{p.keterangan}</p>}
                                </div>
                                <div className="text-right min-w-32">
                                    <p className="font-bold text-sm">{formatRupiah(p.nominal)}</p>
                                    <p className="text-xs text-gray-400">
                                        {dayjs(p.tanggal_pengajuan).format('DD MMM YYYY')}
                                        {p.approval_progress && ` · ${p.approval_progress.disetujui}/${p.approval_progress.total} approve`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Tooltip title="Detail">
                                        <span
                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                            onClick={() => setDetailTarget(p)}>
                                            <HiOutlineEye className="text-lg" />
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Log Aktivitas">
                                        <span
                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 transition-colors"
                                            onClick={() => openLog(p)}>
                                            <HiOutlineClipboardList className="text-lg" />
                                        </span>
                                    </Tooltip>
                                    <Button size="xs" variant="plain"
                                        className="text-red-500 hover:text-red-600"
                                        disabled={prosesId === p.id_pengajuan}
                                        onClick={() => setTolakTarget(p)}>
                                        Tolak
                                    </Button>
                                    <Button size="xs" variant="solid"
                                        loading={prosesId === p.id_pengajuan}
                                        onClick={() => setApproveTarget(p)}>
                                        Setuju
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <ConfirmDialog
                isOpen={!!approveTarget}
                type="info"
                title="Setujui Pengajuan"
                confirmText="Ya, Setujui"
                cancelText="Batal"
                onClose={() => setApproveTarget(null)}
                onCancel={() => setApproveTarget(null)}
                onConfirm={() => {
                    if (approveTarget) putuskan(approveTarget, 'setuju')
                    setApproveTarget(null)
                }}
            >
                <p>Setujui pengajuan {approveTarget?.nomor_pengajuan} sebesar {approveTarget ? formatRupiah(approveTarget.nominal) : ''} untuk {approveTarget?.penerima}?</p>
            </ConfirmDialog>

            <Dialog isOpen={!!tolakTarget} width={480}
                onRequestClose={() => { setTolakTarget(null); setCatatanTolak(''); setErrTolak('') }}
                onClose={() => { setTolakTarget(null); setCatatanTolak(''); setErrTolak('') }}>
                <h5 className="font-bold mb-1">Tolak Pengajuan</h5>
                <p className="text-sm text-gray-500 mb-4">{tolakTarget?.nomor_pengajuan} — {tolakTarget ? formatRupiah(tolakTarget.nominal) : ''}</p>
                <form onSubmit={e => { e.preventDefault(); handleTolak() }}>
                    <p className="text-sm font-semibold mb-1">Alasan penolakan <span className="text-red-500">*</span></p>
                    <Input textArea rows={3} placeholder="Tulis alasan kenapa pengajuan ini ditolak..."
                        value={catatanTolak}
                        invalid={!!errTolak}
                        onChange={e => { setCatatanTolak(e.target.value); setErrTolak('') }} />
                    {errTolak && <p className="text-xs text-red-500 mt-1">{errTolak}</p>}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="plain"
                            onClick={() => { setTolakTarget(null); setCatatanTolak(''); setErrTolak('') }}>
                            Batal
                        </Button>
                        <Button type="submit" variant="solid"
                            customColorClass={() => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500'}>
                            Tolak Pengajuan
                        </Button>
                    </div>
                </form>
            </Dialog>

            <DetailPengajuanDialog
                pengajuan={detailTarget}
                onClose={() => setDetailTarget(null)}
                onRefresh={fetchData}
            />

            <LogAktivitasKeuanganDialog
                isOpen={logOpen}
                info={logInfo}
                loading={logLoading}
                onClose={() => setLogOpen(false)}
            />
        </div>
    )
}
