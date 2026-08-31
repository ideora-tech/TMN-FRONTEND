'use client'
import { useEffect, useState } from 'react'
import { Dialog, Button, Tag, Spinner } from '@/components/ui'
import dayjs from 'dayjs'
import axios from 'axios'
import type { ReactNode } from 'react'
import { HiOutlinePaperAirplane, HiOutlineClock, HiOutlineCheck, HiOutlineX } from 'react-icons/hi'
import { API_ENDPOINTS } from '@/constants/api.constant'

type ApproverRow = {
    nama: string
    status: 'menunggu' | 'disetujui' | 'ditolak'
    catatan: string | null
    waktu_aksi: string | null
}

export type StatusApprovalReferensi = {
    id_approval: string
    status: 'menunggu' | 'disetujui' | 'ditolak' | 'dibatalkan'
    nominal: number | null
    diajukan_oleh: string | null
    diajukan_pada: string | null
    progress: { disetujui: number; total: number }
    approver: ApproverRow[]
}

const STATUS_LABEL: Record<string, string> = {
    menunggu: 'Menunggu Approval',
    disetujui: 'Disetujui',
    ditolak: 'Ditolak',
    dibatalkan: 'Dibatalkan',
}

const STATUS_TAG: Record<string, string> = {
    menunggu: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    disetujui: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    ditolak: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    dibatalkan: 'bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-300',
}

const IKON: Record<string, { icon: ReactNode; className: string }> = {
    diajukan: { icon: <HiOutlinePaperAirplane />, className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' },
    menunggu: { icon: <HiOutlineClock />, className: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300' },
    disetujui: { icon: <HiOutlineCheck />, className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300' },
    ditolak: { icon: <HiOutlineX />, className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
}

type Props = {
    isOpen: boolean
    onClose: () => void
    kode: string
    idReferensi: string
    emptyMessage?: string
}

export default function LogApprovalDialog({ isOpen, onClose, kode, idReferensi, emptyMessage }: Props) {
    const [info, setInfo] = useState<StatusApprovalReferensi | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setLoading(true)
        axios.get(API_ENDPOINTS.APPROVAL_STATUS_REFERENSI, { params: { kode, id_referensi: idReferensi } })
            .then(r => setInfo(r.data.data as StatusApprovalReferensi | null))
            .catch(() => setInfo(null))
            .finally(() => setLoading(false))
    }, [isOpen, kode, idReferensi])

    const entri: { key: string; ikon: string; judul: string; oleh: string | null; waktu: string | null; catatan: string | null }[] = []
    if (info) {
        entri.push({ key: 'diajukan', ikon: 'diajukan', judul: 'Diajukan', oleh: info.diajukan_oleh, waktu: info.diajukan_pada, catatan: null })
        info.approver.forEach((a, i) => {
            entri.push({
                key: `approver-${i}`,
                ikon: a.status,
                judul: a.status === 'menunggu' ? 'Menunggu Keputusan' : STATUS_LABEL[a.status] ?? a.status,
                oleh: a.nama,
                waktu: a.waktu_aksi,
                catatan: a.catatan,
            })
        })
    }

    return (
        <Dialog isOpen={isOpen} width={520} closable={false} onRequestClose={onClose} onClose={onClose}>
            <div className="flex items-center justify-between gap-3 mb-1">
                <h5 className="font-bold">Log Approval</h5>
                {info && (
                    <Tag className={`${STATUS_TAG[info.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-100'} border-0 font-semibold`}>
                        {STATUS_LABEL[info.status] ?? info.status}
                    </Tag>
                )}
            </div>
            {info && (
                <p className="text-xs text-gray-400 mb-5">
                    {info.progress.disetujui} dari {info.progress.total} approver menyetujui
                </p>
            )}

            {loading ? (
                <div className="flex justify-center py-10"><Spinner size={28} /></div>
            ) : !info ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                    {emptyMessage ?? 'Belum ada pengajuan approval untuk data ini.'}
                </p>
            ) : (
                <div className="max-h-[60vh] overflow-y-auto pr-1 mt-2">
                    {entri.map((r, i) => {
                        const ikon = IKON[r.ikon] ?? IKON.menunggu
                        const terakhir = i === entri.length - 1
                        return (
                            <div key={r.key} className="flex gap-3">
                                <div className="w-16 shrink-0 text-right text-xs text-gray-400 leading-tight pt-1">
                                    {r.waktu ? (
                                        <>
                                            {dayjs(r.waktu).format('DD MMM YYYY')}
                                            <br />
                                            {dayjs(r.waktu).format('HH:mm')}
                                        </>
                                    ) : '—'}
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${ikon.className}`}>
                                        {ikon.icon}
                                    </span>
                                    {!terakhir && <span className="flex-1 w-px bg-gray-200 dark:bg-gray-600 my-1" />}
                                </div>
                                <div className="flex-1 min-w-0 pb-6">
                                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{r.judul}</p>
                                    {r.oleh && (
                                        <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{r.oleh}</p>
                                    )}
                                    {r.catatan && (
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2">
                                            {r.catatan}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="flex justify-center mt-4">
                <Button variant="default" onClick={onClose}>Kembali</Button>
            </div>
        </Dialog>
    )
}
