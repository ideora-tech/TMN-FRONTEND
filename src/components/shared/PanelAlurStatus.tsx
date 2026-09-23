'use client'
import type { ReactNode } from 'react'
import { Card, Steps } from '@/components/ui'
import { HiOutlineClipboardCheck, HiOutlineCheckCircle, HiOutlineBan, HiOutlineExclamationCircle, HiOutlineInformationCircle, HiOutlineLightBulb } from 'react-icons/hi'

export type TahapAlur = { status: string; label: string }

export const KELAS_TOMBOL_BATAL = 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
export const KELAS_IKON_LOG_APPROVAL = 'cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 transition-colors'

export type WarnaCatatan = 'merah' | 'amber' | 'hijau' | 'biru'

export type CatatanAlur = {
    warna: WarnaCatatan
    judul: ReactNode
    isi?: ReactNode
}

export type PanelAlurStatusProps = {
    judul: string
    tahap: TahapAlur[]
    status: string
    statusLabel: string
    kelasIkon: string
    tahapAktif?: number
    tahapGagal?: number
    selesai?: boolean
    gagal?: ReactNode
    catatan?: CatatanAlur[]
    langkah?: { judul: ReactNode; keterangan?: ReactNode }
    aksi?: ReactNode
    alat?: ReactNode
}

const KELAS_CATATAN: Record<WarnaCatatan, { kotak: string; ikon: string; judul: string; isi: string }> = {
    merah: {
        kotak: 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10',
        ikon:  'text-red-500 dark:text-red-400',
        judul: 'text-red-700 dark:text-red-300',
        isi:   'text-red-600 dark:text-red-300/90',
    },
    amber: {
        kotak: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
        ikon:  'text-amber-500 dark:text-amber-400',
        judul: 'text-amber-700 dark:text-amber-300',
        isi:   'text-amber-700/90 dark:text-amber-300/90',
    },
    hijau: {
        kotak: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
        ikon:  'text-emerald-500 dark:text-emerald-400',
        judul: 'text-emerald-700 dark:text-emerald-300',
        isi:   'text-emerald-700/90 dark:text-emerald-300/90',
    },
    biru: {
        kotak: 'border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10',
        ikon:  'text-blue-500 dark:text-blue-400',
        judul: 'text-blue-700 dark:text-blue-300',
        isi:   'text-blue-700/90 dark:text-blue-300/90',
    },
}

const IKON_CATATAN: Record<WarnaCatatan, ReactNode> = {
    merah: <HiOutlineExclamationCircle />,
    amber: <HiOutlineExclamationCircle />,
    hijau: <HiOutlineLightBulb />,
    biru:  <HiOutlineInformationCircle />,
}

const PanelAlurStatus = ({
    judul, tahap, status, statusLabel, kelasIkon, tahapAktif, tahapGagal, selesai = false, gagal, catatan = [], langkah, aksi, alat,
}: PanelAlurStatusProps) => {
    const adaMerah = catatan.some(c => c.warna === 'merah')
    const indeksAktif = tahapAktif ?? tahap.findIndex(t => t.status === status)
    const current = tahapGagal !== undefined ? tahapGagal : selesai ? tahap.length - 1 : indeksAktif
    const statusSteps = tahapGagal !== undefined ? 'error' : selesai ? 'complete' : 'in-progress'
    const adaFooter = !!langkah || !!aksi

    return (
        <Card bodyClass="p-0" className={adaMerah || gagal ? 'border-red-200 dark:border-red-500/30' : ''}>
            <div className="relative px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-5">
                <div className="flex items-center gap-3 lg:w-52 flex-shrink-0">
                    <div className={`flex items-center justify-center w-11 h-11 rounded-xl text-2xl flex-shrink-0 ${kelasIkon}`}>
                        {gagal ? <HiOutlineBan /> : selesai ? <HiOutlineCheckCircle /> : <HiOutlineClipboardCheck />}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{judul}</p>
                        <p className="font-bold text-gray-800 dark:text-gray-100 leading-tight">{statusLabel}</p>
                    </div>
                </div>
                {gagal ? (
                    <div className="flex-1 flex items-center gap-2 text-sm text-red-600 dark:text-red-300 lg:pl-5 lg:border-l border-gray-100 dark:border-gray-700">
                        <HiOutlineExclamationCircle className="text-lg flex-shrink-0" />
                        <span>{gagal}</span>
                    </div>
                ) : (
                    <div className="flex-1 min-w-0 lg:pl-5 lg:border-l border-gray-100 dark:border-gray-700">
                        <Steps current={current} status={statusSteps}>
                            {tahap.map(t => (
                                <Steps.Item key={t.status} title={<span className="hidden sm:inline text-sm">{t.label}</span>} />
                            ))}
                        </Steps>
                    </div>
                )}
                {alat && (
                    <div className="absolute right-5 top-4 lg:static flex items-center gap-2 flex-shrink-0">{alat}</div>
                )}
            </div>

            {catatan.map((c, i) => {
                const kelas = KELAS_CATATAN[c.warna]
                return (
                    <div key={i} className={`mx-5 mb-4 px-4 py-3 rounded-xl border flex items-start gap-3 ${kelas.kotak}`}>
                        <span className={`text-xl flex-shrink-0 mt-0.5 ${kelas.ikon}`}>{IKON_CATATAN[c.warna]}</span>
                        <div className="min-w-0">
                            <p className={`text-sm font-semibold ${kelas.judul}`}>{c.judul}</p>
                            {c.isi && <div className={`text-sm mt-0.5 break-words ${kelas.isi}`}>{c.isi}</div>}
                        </div>
                    </div>
                )
            })}

            {adaFooter && (
                <div className="px-5 py-4 rounded-b-2xl border-t border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                        {langkah && (
                            <>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{langkah.judul}</p>
                                {langkah.keterangan && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{langkah.keterangan}</p>}
                            </>
                        )}
                    </div>
                    {aksi && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{aksi}</div>}
                </div>
            )}
        </Card>
    )
}

export default PanelAlurStatus
