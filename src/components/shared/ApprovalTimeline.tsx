'use client'
import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import { HiOutlinePaperAirplane, HiOutlineClock, HiOutlineCheck, HiOutlineX } from 'react-icons/hi'

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

const IKON: Record<string, { icon: ReactNode; className: string }> = {
    diajukan: { icon: <HiOutlinePaperAirplane />, className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' },
    menunggu: { icon: <HiOutlineClock />, className: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300' },
    disetujui: { icon: <HiOutlineCheck />, className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300' },
    ditolak: { icon: <HiOutlineX />, className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
}

export default function ApprovalTimeline({ info }: { info: StatusApprovalReferensi }) {
    const entri: { key: string; ikon: string; judul: string; oleh: string | null; waktu: string | null; catatan: string | null }[] = []
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

    return (
        <div className="mt-2">
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
    )
}
