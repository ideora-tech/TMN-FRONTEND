'use client'
import { Dialog, Button, Tag, Spinner } from '@/components/ui'
import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import {
    HiOutlinePaperAirplane, HiOutlineSearch, HiOutlineClock,
    HiOutlineCheck, HiOutlineX, HiOutlineCash,
} from 'react-icons/hi'
import { formatRupiah } from '@/utils/formatNumber'
import type { PengajuanKeuanganInfo } from '@/services/arusKas.service'

export const PENGAJUAN_LABEL: Record<string, string> = {
    diajukan:          'Diajukan',
    dicek:             'Diverifikasi — Menunggu Persetujuan Transfer',
    menunggu_approval: 'Menunggu Approval',
    menunggu:          'Menunggu Approval',
    disetujui:         'Disetujui',
    disetujui_final:   'Approval Lengkap — Pengajuan Disetujui',
    ditolak_final:     'Pengajuan Ditolak',
    disetujui_transfer: 'Disetujui — Persetujuan Transfer',
    ditolak_transfer:  'Ditolak — Persetujuan Transfer',
    siap_transfer:     'Siap Transfer',
    ditolak:           'Ditolak',
    ditransfer:        'Sudah Ditransfer',
}

export const PENGAJUAN_TAG: Record<string, string> = {
    diajukan:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    dicek:             'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-100',
    menunggu_approval: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    disetujui:         'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
    siap_transfer:     'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    ditolak:           'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    ditransfer:        'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
}

const IKON: Record<string, { icon: ReactNode; className: string }> = {
    diajukan:      { icon: <HiOutlinePaperAirplane />, className: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300' },
    dicek:         { icon: <HiOutlineSearch />,        className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' },
    menunggu:      { icon: <HiOutlineClock />,         className: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300' },
    disetujui:     { icon: <HiOutlineCheck />,         className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300' },
    disetujui_final: { icon: <HiOutlineCheck />,       className: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300' },
    ditolak_final:   { icon: <HiOutlineX />,           className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
    disetujui_transfer: { icon: <HiOutlineCheck />,    className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' },
    ditolak_transfer:   { icon: <HiOutlineX />,        className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
    siap_transfer: { icon: <HiOutlineCheck />,         className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' },
    ditolak:       { icon: <HiOutlineX />,             className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
    ditransfer:    { icon: <HiOutlineCash />,          className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300' },
}

type Props = {
    isOpen: boolean
    onClose: () => void
    info: PengajuanKeuanganInfo | null | undefined
    loading?: boolean
    emptyMessage?: string
}

export default function LogAktivitasKeuanganDialog({ isOpen, onClose, info, loading = false, emptyMessage }: Props) {
    const riwayat = [...(info?.riwayat ?? [])].reverse()

    return (
        <Dialog isOpen={isOpen} width={520} closable={false} onRequestClose={onClose} onClose={onClose}>
            <div className="flex items-center justify-between gap-3 mb-1">
                <h5 className="font-bold">Log Aktivitas</h5>
                {info && (
                    <Tag className={`${PENGAJUAN_TAG[info.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-100'} border-0 font-semibold`}>
                        {PENGAJUAN_LABEL[info.status] ?? info.status}
                    </Tag>
                )}
            </div>
            {info && (
                <p className="text-xs text-gray-400 font-mono mb-5">
                    {info.nomor_pengajuan} — {formatRupiah(info.nominal)}
                </p>
            )}

            {loading ? (
                <div className="flex justify-center py-10"><Spinner size={28} /></div>
            ) : !info ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                    {emptyMessage ?? 'Belum ada pengajuan keuangan.'}
                </p>
            ) : (
                <div className="max-h-[60vh] overflow-y-auto pr-1 mt-2">
                    {riwayat.map((r, i) => {
                        const ikon = IKON[r.status] ?? { icon: <HiOutlineClock />, className: 'bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-300' }
                        const terakhir = i === riwayat.length - 1
                        return (
                            <div key={i} className="flex gap-3">
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
                                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                                        {PENGAJUAN_LABEL[r.status] ?? r.status}
                                    </p>
                                    {r.oleh && (
                                        <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{r.oleh}</p>
                                    )}
                                    {r.keterangan && (
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2">
                                            {r.keterangan}
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
