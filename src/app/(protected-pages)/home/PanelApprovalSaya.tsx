'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Tag, Tooltip, Dialog, Input, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogAktivitasKeuanganDialog from '@/components/shared/LogAktivitasKeuanganDialog'
import { HiOutlineClipboardList, HiOutlineEye, HiOutlineArrowRight } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { approvalService, ApprovalPengajuanSaya } from '@/services/approval.service'
import { arusKasService, PengajuanKeuanganInfo } from '@/services/arusKas.service'
import { isKodePengeluaran } from '@/constants/pengeluaran.constant'

const JENIS_TAG_CLASS = 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-100 border-0 text-xs'

export default function PanelApprovalSaya() {
    const router = useRouter()
    const [list, setList] = useState<ApprovalPengajuanSaya[]>([])
    const [prosesId, setProsesId] = useState<string | null>(null)

    const [approveTarget, setApproveTarget] = useState<ApprovalPengajuanSaya | null>(null)
    const [tolakTarget, setTolakTarget]     = useState<ApprovalPengajuanSaya | null>(null)
    const [catatanTolak, setCatatanTolak]   = useState('')
    const [errTolak, setErrTolak]           = useState('')
    const [detailTarget, setDetailTarget]   = useState<ApprovalPengajuanSaya | null>(null)

    const [logOpen, setLogOpen]       = useState(false)
    const [logInfo, setLogInfo]       = useState<PengajuanKeuanganInfo | null>(null)
    const [logLoading, setLogLoading] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const data = await approvalService.menungguSaya()
            setList(data)
        } catch {
            setList([])
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const totalNominal = useMemo(
        () => list.reduce((sum, item) => sum + (item.nominal ?? 0), 0),
        [list],
    )

    const putuskan = async (p: ApprovalPengajuanSaya, keputusan: 'setuju' | 'tolak', catatan?: string) => {
        setProsesId(p.id_approval)
        try {
            await approvalService.putuskan(p.id_approval, keputusan, catatan)
            toast.push(<Notification type="success"
                title={keputusan === 'setuju' ? `Pengajuan ${p.nomor_referensi ?? ''} disetujui` : `Pengajuan ${p.nomor_referensi ?? ''} ditolak`} />)
            setDetailTarget(null)
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

    const openLog = (p: ApprovalPengajuanSaya) => {
        setLogOpen(true)
        setLogInfo(null)
        setLogLoading(true)
        arusKasService.riwayatPengajuan(p.id_referensi)
            .then(setLogInfo)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLogLoading(false))
    }

    const bukaHalaman = () => {
        setDetailTarget(null)
        router.push(ROUTES.PERSETUJUAN_SAYA)
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
                            onClick={() => router.push(ROUTES.PERSETUJUAN_SAYA)}>
                            Lihat semua di Persetujuan Saya <HiOutlineArrowRight />
                        </button>
                    </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {list.map(p => (
                        <div key={p.id_approval} className="flex flex-wrap items-center gap-3 py-3">
                            <div className="flex-1 min-w-52">
                                <div className="flex items-center gap-2">
                                    {p.nomor_referensi && <span className="font-mono text-xs text-gray-400">{p.nomor_referensi}</span>}
                                    <Tag className={JENIS_TAG_CLASS}>{p.nama_event_type}</Tag>
                                </div>
                                <p className="font-semibold text-sm mt-0.5">{p.keterangan_referensi ?? p.pihak_referensi ?? '-'}</p>
                                {p.keterangan_referensi != null && p.pihak_referensi != null && (
                                    <p className="text-xs text-gray-400 truncate max-w-md">{p.pihak_referensi}</p>
                                )}
                            </div>
                            <div className="text-right min-w-32">
                                <p className="font-bold text-sm">{p.nominal != null ? formatRupiah(p.nominal) : '-'}</p>
                                <p className="text-xs text-gray-400">{dayjs(p.dibuat_pada).format('DD MMM YYYY')}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Tooltip title="Detail">
                                    <span
                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                        onClick={() => setDetailTarget(p)}>
                                        <HiOutlineEye className="text-lg" />
                                    </span>
                                </Tooltip>
                                {isKodePengeluaran(p.kode_event_type) && (
                                    <Tooltip title="Log Aktivitas">
                                        <span
                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 transition-colors"
                                            onClick={() => openLog(p)}>
                                            <HiOutlineClipboardList className="text-lg" />
                                        </span>
                                    </Tooltip>
                                )}
                                <Button size="xs" variant="plain"
                                    className="text-red-500 hover:text-red-600"
                                    disabled={prosesId === p.id_approval}
                                    onClick={() => setTolakTarget(p)}>
                                    Tolak
                                </Button>
                                <Button size="xs" variant="solid"
                                    loading={prosesId === p.id_approval}
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
                <p>Setujui pengajuan <strong>{approveTarget?.nama_event_type}</strong>{approveTarget?.nomor_referensi ? ` ${approveTarget.nomor_referensi}` : ''} sebesar {approveTarget?.nominal != null ? formatRupiah(approveTarget.nominal) : '-'} dari {approveTarget?.nama_pengaju ?? '-'}?</p>
            </ConfirmDialog>

            <Dialog isOpen={!!tolakTarget} width={480}
                onRequestClose={() => { setTolakTarget(null); setCatatanTolak(''); setErrTolak('') }}
                onClose={() => { setTolakTarget(null); setCatatanTolak(''); setErrTolak('') }}>
                <h5 className="font-bold mb-1">Tolak Pengajuan</h5>
                <p className="text-sm text-gray-500 mb-4">
                    {tolakTarget?.nama_event_type}{tolakTarget?.nomor_referensi ? ` — ${tolakTarget.nomor_referensi}` : ''}
                    {tolakTarget?.nominal != null ? ` — ${formatRupiah(tolakTarget.nominal)}` : ''}
                </p>
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

            <Dialog isOpen={!!detailTarget} width={520}
                onRequestClose={() => setDetailTarget(null)} onClose={() => setDetailTarget(null)}>
                <h5 className="text-base font-semibold mb-4">Detail Pengajuan</h5>
                {detailTarget && (
                    <div className="flex flex-col gap-4">
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Jenis</p>
                            <Tag className={JENIS_TAG_CLASS}>{detailTarget.nama_event_type}</Tag>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Nomor</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailTarget.nomor_referensi ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Pihak</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailTarget.pihak_referensi ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Diajukan Oleh</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailTarget.nama_pengaju ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Nominal</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailTarget.nominal != null ? formatRupiah(detailTarget.nominal) : '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Diajukan Pada</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {dayjs(detailTarget.dibuat_pada).format('DD MMMM YYYY HH:mm')}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Keterangan</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{detailTarget.keterangan_referensi ?? '-'}</p>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="solid" onClick={() => { setApproveTarget(detailTarget); setDetailTarget(null) }}>
                                    Setuju
                                </Button>
                                <Button size="sm" variant="default" className="text-red-500 border-red-300 hover:bg-red-50"
                                    onClick={() => { setTolakTarget(detailTarget); setCatatanTolak(''); setErrTolak(''); setDetailTarget(null) }}>
                                    Tolak
                                </Button>
                            </div>
                            <Button size="sm" variant="plain" onClick={bukaHalaman}>
                                Buka Halaman
                            </Button>
                        </div>
                    </div>
                )}
            </Dialog>

            <LogAktivitasKeuanganDialog
                isOpen={logOpen}
                info={logInfo}
                loading={logLoading}
                onClose={() => setLogOpen(false)}
            />
        </>
    )
}
