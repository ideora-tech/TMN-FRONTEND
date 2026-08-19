'use client'
import { useState } from 'react'
import dayjs from 'dayjs'
import { Dialog, Tag, Button, Input, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiOutlineDocumentText, HiOutlineExternalLink } from 'react-icons/hi'
import { formatRupiah } from '@/utils/formatNumber'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import {
    arusKasService,
    PengajuanPengeluaran,
} from '@/services/arusKas.service'
import { KATEGORI_LABEL, PENERIMA_LABEL, STATUS_LABEL, STATUS_TAG, STATUS_APPROVAL_LABEL, STATUS_APPROVAL_TAG } from './pengajuanMeta'

const LABEL_CLASS = 'text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1'
const VALUE_CLASS = 'text-sm font-medium text-gray-800 dark:text-gray-200'

const isGambar = (url: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)

function BadgeSumber({ p }: { p: PengajuanPengeluaran }) {
    if (p.id_trip) {
        return (
            <a href={ROUTES.TRIP_DETAIL(p.id_trip)} target="_blank" rel="noreferrer" className="w-fit">
                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 cursor-pointer hover:opacity-80">
                    Dari Trip <HiOutlineExternalLink className="text-xs" />
                </Tag>
            </a>
        )
    }
    if (p.id_perawatan) {
        return (
            <a href={p.id_armada_perawatan
                ? `${ROUTES.PERAWATAN_ARMADA}?armada=${p.id_armada_perawatan}&detail=${p.id_perawatan}`
                : ROUTES.PERAWATAN_ARMADA} target="_blank" rel="noreferrer" className="w-fit">
                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300 cursor-pointer hover:opacity-80">
                    Dari Perawatan <HiOutlineExternalLink className="text-xs" />
                </Tag>
            </a>
        )
    }
    if (p.id_pembelian) {
        return (
            <a href={ROUTES.PEMBELIAN_SPAREPART_DETAIL(p.id_pembelian)} target="_blank" rel="noreferrer" className="w-fit">
                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-lime-100 text-lime-600 dark:bg-lime-500/20 dark:text-lime-300 cursor-pointer hover:opacity-80">
                    Dari Pembelian <HiOutlineExternalLink className="text-xs" />
                </Tag>
            </a>
        )
    }
    if (p.id_periode) {
        return (
            <a href={ROUTES.PAYROLL_DETAIL(p.id_periode)} target="_blank" rel="noreferrer" className="w-fit">
                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 cursor-pointer hover:opacity-80">
                    Dari Payroll <HiOutlineExternalLink className="text-xs" />
                </Tag>
            </a>
        )
    }
    if (p.periode_dari) {
        return (
            <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
                Jadwal {dayjs(p.periode_dari).format('DD/MM')}–{dayjs(p.periode_sampai).format('DD/MM')}
            </Tag>
        )
    }
    return null
}

export default function DetailPengajuanDialog({ pengajuan, onClose, onRefresh, readOnly = false }: { pengajuan: PengajuanPengeluaran | null; onClose: () => void; onRefresh?: () => void; readOnly?: boolean }) {
    const p = pengajuan
    const [approveOpen, setApproveOpen] = useState(false)
    const [tolakOpen, setTolakOpen]     = useState(false)
    const [catatanTolak, setCatatanTolak] = useState('')
    const [errCatatanTolak, setErrCatatanTolak] = useState('')
    const [memproses, setMemproses] = useState(false)

    const tutupAksiApproval = () => {
        setApproveOpen(false)
        setTolakOpen(false)
        setCatatanTolak('')
        setErrCatatanTolak('')
    }

    const handleApprove = async () => {
        if (!p) return
        setMemproses(true)
        try {
            await arusKasService.keputusanApproval(p.id_pengajuan, 'setuju')
            toast.push(<Notification type="success" title="Pengajuan disetujui" />)
            tutupAksiApproval()
            onRefresh?.()
            onClose()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMemproses(false)
        }
    }

    const handleTolakApproval = async () => {
        if (!p) return
        if (!catatanTolak.trim()) { setErrCatatanTolak('Catatan penolakan wajib diisi'); return }
        setMemproses(true)
        try {
            await arusKasService.keputusanApproval(p.id_pengajuan, 'tolak', catatanTolak.trim())
            toast.push(<Notification type="success" title="Pengajuan ditolak" />)
            tutupAksiApproval()
            onRefresh?.()
            onClose()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMemproses(false)
        }
    }

    const riwayat = p ? [
        { label: 'Diajukan',   waktu: p.dibuat_pada,     keterangan: `Tanggal pengajuan ${dayjs(p.tanggal_pengajuan).format('DD MMM YYYY')}` },
        { label: 'Dicek',      waktu: p.dicek_pada,      keterangan: null },
        { label: 'Disetujui',  waktu: p.disetujui_pada,  keterangan: null },
        { label: 'Ditransfer', waktu: p.ditransfer_pada, keterangan: p.tanggal_transfer ? `Tanggal transfer ${dayjs(p.tanggal_transfer).format('DD MMM YYYY')}` : null },
    ].filter(r => r.waktu) : []

    return (
        <>
        <Dialog isOpen={!!p} onRequestClose={onClose} onClose={onClose} width={640}>
            <h5 className="text-base font-semibold mb-1">Detail Pengajuan</h5>
            <p className="text-xs font-mono text-gray-400 mb-4">{p?.nomor_pengajuan}</p>
            {p && (
                <div className="max-h-[65vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                            <p className={LABEL_CLASS}>Kategori</p>
                            <div className="flex items-center gap-2">
                                <p className={VALUE_CLASS}>{KATEGORI_LABEL[p.kategori]}</p>
                                <BadgeSumber p={p} />
                            </div>
                        </div>
                        <div>
                            <p className={LABEL_CLASS}>Status</p>
                            <Tag className={`text-xs font-semibold ${STATUS_TAG[p.status]}`}>{STATUS_LABEL[p.status]}</Tag>
                        </div>
                        <div>
                            <p className={LABEL_CLASS}>Nominal</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatRupiah(p.nominal)}</p>
                        </div>
                        {p.periode_dari && p.tarif_per_hari != null && (
                            <div>
                                <p className={LABEL_CLASS}>Rincian Periode</p>
                                <p className={VALUE_CLASS}>
                                    {formatRupiah(Number(p.tarif_per_hari))}/hari × {Math.round(Number(p.nominal) / Number(p.tarif_per_hari))} hari
                                </p>
                            </div>
                        )}
                        <div>
                            <p className={LABEL_CLASS}>{PENERIMA_LABEL[p.kategori] ?? 'Penerima'}</p>
                            <p className={VALUE_CLASS}>{p.penerima}</p>
                        </div>
                    </div>

                    {p.keterangan && (
                        <div className="mt-4">
                            <p className={LABEL_CLASS}>Keterangan</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{p.keterangan}</p>
                        </div>
                    )}
                    {p.status === 'ditolak' && p.alasan_ditolak && (
                        <div className="mt-4">
                            <p className={LABEL_CLASS}>Alasan Ditolak</p>
                            <p className="text-sm text-red-500 dark:text-red-400">{p.alasan_ditolak}</p>
                        </div>
                    )}

                    {riwayat.length > 0 && (
                        <div className="mt-5">
                            <p className={`${LABEL_CLASS} mb-2`}>Riwayat Proses</p>
                            <div className="flex flex-col gap-2">
                                {riwayat.map(r => (
                                    <div key={r.label} className="flex items-start gap-3">
                                        <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.label}
                                                <span className="text-xs text-gray-400 font-normal ml-2">{dayjs(r.waktu).format('DD MMM YYYY HH:mm')}</span>
                                            </p>
                                            {r.keterangan && <p className="text-xs text-gray-400">{r.keterangan}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {p.approval.length > 0 && (
                        <div className="mt-5">
                            <p className={`${LABEL_CLASS} mb-2`}>Approval BOD</p>
                            <div className="flex flex-col gap-2">
                                {p.approval.map(a => (
                                    <div key={a.id_pengguna}
                                        className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{a.nama}</span>
                                            <Tag className={`text-xs font-semibold ${STATUS_APPROVAL_TAG[a.status]}`}>{STATUS_APPROVAL_LABEL[a.status]}</Tag>
                                        </div>
                                        {a.waktu_aksi && <p className="text-xs text-gray-400 mt-1">{dayjs(a.waktu_aksi).format('DD/MM/YYYY HH:mm')}</p>}
                                        {a.catatan && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{a.catatan}</p>}
                                    </div>
                                ))}
                            </div>
                            {p.bisa_approve && !readOnly && (
                                <div className="flex justify-end gap-2 mt-3">
                                    <Button size="sm" variant="solid" loading={memproses} onClick={() => setApproveOpen(true)}>
                                        Approve
                                    </Button>
                                    <Button size="sm" variant="solid" className="bg-red-600 hover:bg-red-700" loading={memproses}
                                        onClick={() => setTolakOpen(true)}>
                                        Tolak
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-5">
                        <p className={`${LABEL_CLASS} mb-2`}>Bukti Transfer</p>
                        {p.url_bukti ? (
                            isGambar(p.url_bukti) ? (
                                <div className="w-fit">
                                    <a href={p.url_bukti} target="_blank" rel="noreferrer">
                                        <img src={p.url_bukti} alt="Bukti transfer"
                                            className="h-24 w-40 object-cover rounded-lg border border-gray-100 dark:border-gray-700" />
                                    </a>
                                    <p className="text-xs text-gray-400 mt-1">Klik untuk membuka</p>
                                </div>
                            ) : (
                                <a href={p.url_bukti} target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                    <HiOutlineDocumentText className="text-base" /> Lihat bukti
                                </a>
                            )
                        ) : (
                            <p className="text-xs text-gray-400 italic">Belum ada bukti diunggah.</p>
                        )}
                    </div>
                </div>
            )}
        </Dialog>

        <ConfirmDialog
            isOpen={approveOpen}
            type="info"
            title="Setujui Pengajuan"
            confirmText="Ya, Setujui"
            cancelText="Batal"
            onClose={() => setApproveOpen(false)}
            onCancel={() => setApproveOpen(false)}
            onConfirm={handleApprove}
            confirmButtonProps={{ loading: memproses }}
        >
            <p>Setujui pengajuan {p?.nomor_pengajuan}?</p>
        </ConfirmDialog>

        <ConfirmDialog
            isOpen={tolakOpen}
            type="danger"
            title="Tolak Pengajuan"
            confirmText="Ya, Tolak"
            cancelText="Batal"
            onClose={() => { setTolakOpen(false); setCatatanTolak(''); setErrCatatanTolak('') }}
            onCancel={() => { setTolakOpen(false); setCatatanTolak(''); setErrCatatanTolak('') }}
            onConfirm={handleTolakApproval}
            confirmButtonProps={{ loading: memproses, disabled: !catatanTolak.trim() }}
        >
            <p>Tolak pengajuan {p?.nomor_pengajuan}?</p>
            <div className="mt-3">
                <p className="text-sm font-semibold mb-1">Catatan penolakan <span className="text-red-500">*</span></p>
                <Input textArea rows={3} placeholder="Jelaskan alasan penolakan..."
                    value={catatanTolak} onChange={e => { setCatatanTolak(e.target.value); setErrCatatanTolak('') }} />
                {errCatatanTolak && <p className="text-xs text-red-500 mt-1">{errCatatanTolak}</p>}
            </div>
        </ConfirmDialog>
        </>
    )
}
