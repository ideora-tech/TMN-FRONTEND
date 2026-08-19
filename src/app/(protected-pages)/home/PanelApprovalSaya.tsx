'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Tag, Tooltip, Dialog, Input, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogAktivitasKeuanganDialog from '@/components/shared/LogAktivitasKeuanganDialog'
import DetailPengajuanDialog from '../arus-kas/DetailPengajuanDialog'
import { HiOutlineClipboardList, HiOutlineEye, HiOutlineArrowRight } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { arusKasService, PengajuanPengeluaran, PengajuanKeuanganInfo } from '@/services/arusKas.service'

const KATEGORI_LABEL: Record<string, string> = {
    uang_jalan:          'Uang Jalan',
    legalitas:           'Legalitas',
    perawatan:           'Perawatan',
    sparepart:           'Sparepart',
    penggajian:          'Penggajian',
    pembelian_aset:      'Pembelian Aset',
    pembayaran_pinjaman: 'Pembayaran Pinjaman',
    lainnya:             'Lainnya',
}

export default function PanelApprovalSaya() {
    const router = useRouter()
    const [list, setList] = useState<PengajuanPengeluaran[]>([])
    const [totalNominal, setTotalNominal] = useState(0)
    const [prosesId, setProsesId] = useState<string | null>(null)

    const [approveTarget, setApproveTarget] = useState<PengajuanPengeluaran | null>(null)
    const [tolakTarget, setTolakTarget]     = useState<PengajuanPengeluaran | null>(null)
    const [catatanTolak, setCatatanTolak]   = useState('')
    const [errTolak, setErrTolak]           = useState('')
    const [detailTarget, setDetailTarget]   = useState<PengajuanPengeluaran | null>(null)

    const [logOpen, setLogOpen]       = useState(false)
    const [logInfo, setLogInfo]       = useState<PengajuanKeuanganInfo | null>(null)
    const [logLoading, setLogLoading] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const res = await arusKasService.menungguApprovalSaya()
            setList(res.pengajuan)
            setTotalNominal(res.ringkasan.total_nominal)
        } catch {
            setList([])
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

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

    if (list.length === 0) return null

    return (
        <>
            <Card className="border-amber-200 dark:border-amber-500/30">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <h5 className="font-bold">Menunggu Approval Anda</h5>
                        <Tag className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-0 font-semibold">
                            {list.length} pengajuan
                        </Tag>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">Total {formatRupiah(totalNominal)}</span>
                        <button type="button"
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            onClick={() => router.push(ROUTES.PROSES_PEMBAYARAN)}>
                            Lihat semua di Proses Pembayaran <HiOutlineArrowRight />
                        </button>
                    </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {list.map(p => (
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
        </>
    )
}
