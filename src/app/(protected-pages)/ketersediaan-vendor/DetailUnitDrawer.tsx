'use client'
import { useEffect, useState } from 'react'
import { Button, Drawer, Spinner, Tag, toast, Notification } from '@/components/ui'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ketersediaanVendorService, type DetailUnit, type UnitKetersediaan } from '@/services/ketersediaanVendor.service'
import {
    STATUS_KETERSEDIAAN, SUMBER_UNIT, TH_CLASS, formatTanggal, keteranganStatus, kontakPemilik, ringkasSpesifikasi, tagDokumen,
} from './ketersediaanVendor.shared'

type Props = {
    unit: UnitKetersediaan | null
    onClose: () => void
}

type DataUnit = { kunci: string; detail: DetailUnit }
type GalatUnit = { kunci: string; pesan: string }

const LEBAR_MAKS = 760

const kunciUnit = (u: UnitKetersediaan | null) => (u ? `${u.sumber}:${u.id_unit}` : null)

export default function DetailUnitDrawer({ unit, onClose }: Props) {
    const [unitTampil, setUnitTampil] = useState<UnitKetersediaan | null>(unit)
    const [lebar, setLebar]       = useState(LEBAR_MAKS)
    const [data, setData]         = useState<DataUnit | null>(null)
    const [galat, setGalat]       = useState<GalatUnit | null>(null)
    const [percobaan, setPercobaan] = useState(0)

    if (unit && unit !== unitTampil) setUnitTampil(unit)
    const kunci = kunciUnit(unitTampil)
    const sumberTampil = unitTampil?.sumber ?? null
    const idTampil = unitTampil?.id_unit ?? null

    useEffect(() => {
        const sesuaikan = () => setLebar(Math.min(LEBAR_MAKS, window.innerWidth))
        sesuaikan()
        window.addEventListener('resize', sesuaikan)
        return () => window.removeEventListener('resize', sesuaikan)
    }, [])

    const terbuka = !!unit

    useEffect(() => {
        if (!terbuka || !sumberTampil || !idTampil || !kunci) return
        let aktif = true
        setGalat(null)
        ketersediaanVendorService.detail(sumberTampil, idTampil)
            .then(detail => { if (aktif) setData({ kunci, detail }) })
            .catch(err => {
                if (!aktif) return
                const pesan = parseApiError(err)
                setGalat({ kunci, pesan })
                toast.push(<Notification type="danger" title={pesan} />)
            })
        return () => { aktif = false }
    }, [terbuka, sumberTampil, idTampil, kunci, percobaan])

    const detail = data?.kunci === kunci ? data.detail : null
    const pesanGalat = galat?.kunci === kunci ? galat.pesan : null

    const status = detail ? STATUS_KETERSEDIAAN[detail.status_ketersediaan] : null
    const sumber = detail ? SUMBER_UNIT[detail.sumber] : null
    const ket = detail ? keteranganStatus(detail) : null
    const stnk = detail ? tagDokumen('STNK', detail.masa_berlaku_stnk) : null
    const kir = detail ? tagDokumen('KIR', detail.masa_berlaku_kir) : null

    return (
        <Drawer
            isOpen={terbuka}
            width={lebar}
            onClose={onClose}
            onRequestClose={onClose}
            bodyClass="p-0"
            title={
                <div className="flex flex-col">
                    <span className="font-mono font-bold text-base">{unitTampil?.nopol ?? ''}</span>
                    <span className="text-xs text-gray-500 font-normal">{unitTampil ? (ringkasSpesifikasi(unitTampil) || 'Unit') : ''}</span>
                </div>
            }
        >
            {pesanGalat ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{pesanGalat}</span>
                    <Button size="sm" onClick={() => setPercobaan(n => n + 1)}>Coba lagi</Button>
                </div>
            ) : !detail || !status || !sumber || !ket || !stnk || !kir ? (
                <div className="py-16 text-center"><Spinner className="inline-block" size={32} /></div>
            ) : (
                <div className="flex flex-col gap-5 p-5">
                    <div className="flex flex-wrap items-start gap-3">
                        <Tag className={`text-xs font-semibold ${status.tag}`}>{status.label}</Tag>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                            <p className="font-medium">{ket.utama}</p>
                            {ket.tambahan && <p className="text-xs text-gray-400 mt-0.5">{ket.tambahan}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 font-medium">Kepemilikan</p>
                            <div className="mt-1"><Tag className={`text-xs font-semibold ${sumber.tag}`}>{sumber.label}</Tag></div>
                            {detail.sumber === 'vendor' ? (
                                <>
                                    <p className="font-semibold text-sm mt-1.5">{detail.nama_vendor}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{kontakPemilik(detail) || 'Kontak belum diisi'}</p>
                                </>
                            ) : (
                                <p className="text-xs text-gray-500 mt-1.5">Unit milik perusahaan</p>
                            )}
                        </div>
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 font-medium">Dokumen Kendaraan</p>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                                <Tag className={`text-xs font-semibold ${stnk.className}`}>{stnk.label}</Tag>
                                <Tag className={`text-xs font-semibold ${kir.className}`}>{kir.label}</Tag>
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">
                                STNK s/d {formatTanggal(detail.masa_berlaku_stnk)} · KIR s/d {formatTanggal(detail.masa_berlaku_kir)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Proyek', value: formatNum(detail.jumlah_proyek) },
                            { label: 'Hari Dipakai', value: formatNum(detail.hari_pakai) },
                            { label: 'Terakhir Dipakai', value: formatTanggal(detail.terakhir_dipakai) },
                        ].map(k => (
                            <div key={k.label} className="rounded-xl bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5">
                                <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 font-medium">{k.label}</div>
                                <div className="font-bold text-sm mt-0.5 text-blue-600 dark:text-blue-400">{k.value}</div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <h5 className="font-semibold mb-2">Riwayat Proyek</h5>
                        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr>
                                        <th className={TH_CLASS}>Proyek</th>
                                        <th className={TH_CLASS}>Periode Dipakai</th>
                                        <th className={`${TH_CLASS} text-right`}>Hari</th>
                                        <th className={`${TH_CLASS} text-right`}>Terjadwal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {detail.riwayat_proyek.length === 0 ? (
                                        <tr><td colSpan={4} className="py-8 text-center text-gray-400">Belum ada riwayat proyek</td></tr>
                                    ) : detail.riwayat_proyek.map(p => (
                                        <tr key={p.id_proyek}>
                                            <td className="py-2.5 px-3">
                                                <div className="font-medium">{p.nama_proyek ?? '—'}</div>
                                                <div className="text-xs text-gray-400">
                                                    {[p.kode_proyek, p.nama_klien].filter(Boolean).join(' · ')}
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                                                {p.pertama_dipakai
                                                    ? (p.pertama_dipakai === p.terakhir_dipakai
                                                        ? formatTanggal(p.pertama_dipakai)
                                                        : `${formatTanggal(p.pertama_dipakai)} – ${formatTanggal(p.terakhir_dipakai)}`)
                                                    : '—'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right">{formatNum(p.hari_pakai)}</td>
                                            <td className="py-2.5 px-3 text-right">
                                                {p.hari_terjadwal > 0
                                                    ? <span className="text-amber-600 dark:text-amber-400 font-semibold">{formatNum(p.hari_terjadwal)} hari</span>
                                                    : <span className="text-gray-400">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </Drawer>
    )
}
