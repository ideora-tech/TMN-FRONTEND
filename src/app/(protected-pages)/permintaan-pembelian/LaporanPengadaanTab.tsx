'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, DatePicker, Tag, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ExportDropdownButton from '@/components/shared/ExportDropdownButton'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { permintaanPembelianService, type LaporanPengadaan } from '@/services/permintaanPembelian.service'
import { STATUS_LABEL, STATUS_TAG, TIPE_LABEL, TIPE_TAG } from './status'

type Option = { value: string; label: string }

const TIPE_OPTIONS: Option[] = [
    { value: '', label: 'Semua Tipe' },
    { value: 'umum', label: TIPE_LABEL.umum },
    { value: 'sparepart', label: TIPE_LABEL.sparepart },
    { value: 'aset', label: TIPE_LABEL.aset },
]

const TH = 'px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

export default function LaporanPengadaanTab({ onBukaPr }: { onBukaPr: (id: string) => void }) {
    const [laporan, setLaporan] = useState<LaporanPengadaan | null>(null)
    const [loading, setLoading] = useState(false)
    const [dari, setDari] = useState<Date | null>(null)
    const [sampai, setSampai] = useState<Date | null>(null)
    const [tipe, setTipe] = useState('')
    const [mengunduh, setMengunduh] = useState<'excel' | 'pdf' | null>(null)

    const periode = useCallback(() => ({
        dari: dari ? dayjs(dari).format('YYYY-MM-DD') : undefined,
        sampai: sampai ? dayjs(sampai).format('YYYY-MM-DD') : undefined,
        tipe: tipe || undefined,
    }), [dari, sampai, tipe])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            setLaporan(await permintaanPembelianService.laporan(periode()))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [periode])

    useEffect(() => { fetchData() }, [fetchData])

    const unduh = async (format: 'excel' | 'pdf') => {
        setMengunduh(format)
        try {
            await permintaanPembelianService.exportLaporan(format, periode())
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(null)
        }
    }

    const ringkasan = laporan?.ringkasan
    const selisihPositif = (ringkasan?.selisih ?? 0) > 0
    const perArmada = laporan?.per_armada ?? []
    const totalTanpaArmada = Number(laporan?.sparepart_tanpa_armada?.total_aktual ?? 0)
    const jumlahTanpaArmada = Number(laporan?.sparepart_tanpa_armada?.jumlah ?? 0)
    const totalSemuaArmada = perArmada.reduce((acc, a) => acc + Number(a.total_aktual), 0) + totalTanpaArmada
    const jumlahSemuaArmada = perArmada.reduce((acc, a) => acc + Number(a.jumlah), 0) + jumlahTanpaArmada

    return (
        <div className={`flex flex-col gap-4 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
            <Card bodyClass="px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker inputFormat="DD/MM/YYYY" placeholder="Dari tanggal" value={dari} onChange={setDari} />
                    </div>
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker inputFormat="DD/MM/YYYY" placeholder="Sampai tanggal" value={sampai} onChange={setSampai} />
                    </div>
                    <div className="w-full sm:w-44 shrink-0">
                        <Select<Option> isSearchable={false} options={TIPE_OPTIONS} value={TIPE_OPTIONS.find(o => o.value === tipe) ?? TIPE_OPTIONS[0]} onChange={opt => setTipe((opt as Option).value)} />
                    </div>
                    <div className="flex-1" />
                    <ExportDropdownButton loading={mengunduh} onExportExcel={() => unduh('excel')} onExportPdf={() => unduh('pdf')} />
                </div>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card><p className="text-xs text-gray-400 uppercase tracking-wide">Total Estimasi</p>
                    <p className="text-lg font-bold mt-1">{formatRupiah(ringkasan?.total_estimasi ?? 0)}</p></Card>
                <Card><p className="text-xs text-gray-400 uppercase tracking-wide">Total Aktual</p>
                    <p className="text-lg font-bold mt-1">{formatRupiah(ringkasan?.total_aktual ?? 0)}</p></Card>
                <Card><p className="text-xs text-gray-400 uppercase tracking-wide">Selisih</p>
                    <p className={`text-lg font-bold mt-1 ${selisihPositif ? 'text-red-500' : 'text-emerald-600'}`}>{formatRupiah(ringkasan?.selisih ?? 0)}</p></Card>
                <Card><p className="text-xs text-gray-400 uppercase tracking-wide">Jumlah Pembelian</p>
                    <p className="text-lg font-bold mt-1">{formatNum(ringkasan?.jumlah ?? 0)}</p></Card>
                <Card><p className="text-xs text-gray-400 uppercase tracking-wide">Menunggu Diproses</p>
                    <p className="text-lg font-bold mt-1">{formatNum(ringkasan?.menunggu_diproses ?? 0)}</p></Card>
                <Card><p className="text-xs text-gray-400 uppercase tracking-wide">Rata Lead Time</p>
                    <p className="text-lg font-bold mt-1">{ringkasan?.rata_lead_time_hari != null ? `${formatNum(ringkasan.rata_lead_time_hari, 1)} hari` : '—'}</p></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <p className="font-semibold mb-3">Per Bulan</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-blue-50 dark:bg-blue-500/10">
                                <th className={TH}>Bulan</th><th className={`${TH} text-right`}>Umum</th><th className={`${TH} text-right`}>Spare Part</th><th className={`${TH} text-right`}>Aset</th><th className={`${TH} text-right`}>Total</th><th className={`${TH} text-right`}>Jumlah</th>
                            </tr></thead>
                            <tbody>
                                {(laporan?.per_bulan ?? []).map(b => (
                                    <tr key={b.bulan} className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="px-3 py-2">{b.bulan === 'lainnya' ? 'Tanpa tanggal' : dayjs(`${b.bulan}-01`).format('MMM YYYY')}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(b.umum))}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(b.sparepart))}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(b.aset))}</td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatRupiah(Number(b.total))}</td>
                                        <td className="px-3 py-2 text-right">{formatNum(Number(b.jumlah))}</td>
                                    </tr>
                                ))}
                                {(laporan?.per_bulan ?? []).length === 0 && (
                                    <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Belum ada data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card>
                    <p className="font-semibold mb-3">Per Tipe</p>
                    <table className="w-full text-sm">
                        <thead><tr className="bg-blue-50 dark:bg-blue-500/10"><th className={TH}>Tipe</th><th className={`${TH} text-right`}>Total Aktual</th><th className={`${TH} text-right`}>Jumlah</th></tr></thead>
                        <tbody>
                            {(laporan?.per_tipe ?? []).map(t => (
                                <tr key={t.tipe} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="px-3 py-2"><Tag className={`text-[10px] font-semibold ${TIPE_TAG[t.tipe] ?? 'bg-gray-100 text-gray-600'}`}>{t.label}</Tag></td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(t.total_aktual))}</td>
                                    <td className="px-3 py-2 text-right">{formatNum(Number(t.jumlah))}</td>
                                </tr>
                            ))}
                            {(laporan?.per_tipe ?? []).length === 0 && (
                                <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">Belum ada data</td></tr>
                            )}
                        </tbody>
                    </table>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                    <p className="font-semibold mb-3">Per Kategori</p>
                    <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-blue-50 dark:bg-blue-500/10"><th className={TH}>Kategori</th><th className={`${TH} text-right`}>Total Aktual</th></tr></thead>
                            <tbody>
                                {(laporan?.per_kategori ?? []).map(k => (
                                    <tr key={k.kategori} className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="px-3 py-2">{k.kategori}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(k.total_aktual))}</td>
                                    </tr>
                                ))}
                                {(laporan?.per_kategori ?? []).length === 0 && (
                                    <tr><td colSpan={2} className="px-3 py-6 text-center text-gray-400">Belum ada data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card>
                    <p className="font-semibold mb-3">Per Departemen</p>
                    <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-blue-50 dark:bg-blue-500/10"><th className={TH}>Departemen</th><th className={`${TH} text-right`}>Total Aktual</th><th className={`${TH} text-right`}>Jumlah</th></tr></thead>
                            <tbody>
                                {(laporan?.per_departemen ?? []).map(d => (
                                    <tr key={d.departemen} className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="px-3 py-2">{d.departemen}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(d.total_aktual))}</td>
                                        <td className="px-3 py-2 text-right">{formatNum(Number(d.jumlah))}</td>
                                    </tr>
                                ))}
                                {(laporan?.per_departemen ?? []).length === 0 && (
                                    <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">Belum ada data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card>
                    <p className="font-semibold mb-3">Per Supplier</p>
                    <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-blue-50 dark:bg-blue-500/10"><th className={TH}>Supplier</th><th className={`${TH} text-right`}>Total Aktual</th><th className={`${TH} text-right`}>Jumlah</th></tr></thead>
                            <tbody>
                                {(laporan?.per_supplier ?? []).map(s => (
                                    <tr key={s.supplier} className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="px-3 py-2">{s.supplier}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(s.total_aktual))}</td>
                                        <td className="px-3 py-2 text-right">{formatNum(Number(s.jumlah))}</td>
                                    </tr>
                                ))}
                                {(laporan?.per_supplier ?? []).length === 0 && (
                                    <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">Belum ada data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Card>
                <p className="font-semibold">Per Armada (spare part tertaut perawatan)</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                    Spare part yang ditautkan ke perawatan sebuah unit (PR maupun pembelian langsung). Spare part tanpa perawatan dijumlahkan di baris terpisah.
                </p>
                <table className="w-full text-sm">
                    <thead><tr className="bg-blue-50 dark:bg-blue-500/10">
                        <th className={TH}>Nopol</th><th className={`${TH} text-right`}>Total Aktual</th><th className={`${TH} text-right`}>Jumlah</th>
                    </tr></thead>
                    <tbody>
                        {perArmada.map(a => (
                            <tr key={a.nopol} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="px-3 py-2 font-semibold">{a.nopol}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(a.total_aktual))}</td>
                                <td className="px-3 py-2 text-right">{formatNum(Number(a.jumlah))}</td>
                            </tr>
                        ))}
                        {jumlahTanpaArmada > 0 && (
                            <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                                <td className="px-3 py-2 italic">Spare part tanpa perawatan</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(totalTanpaArmada)}</td>
                                <td className="px-3 py-2 text-right">{formatNum(jumlahTanpaArmada)}</td>
                            </tr>
                        )}
                        {jumlahSemuaArmada === 0 ? (
                            <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">Belum ada pembelian spare part pada periode ini</td></tr>
                        ) : (
                            <tr className="font-semibold bg-gray-50 dark:bg-gray-700/40">
                                <td className="px-3 py-2">Total</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(totalSemuaArmada)}</td>
                                <td className="px-3 py-2 text-right">{formatNum(jumlahSemuaArmada)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>

            <Card bodyClass="p-0">
                <p className="font-semibold px-4 pt-4 pb-3">Pengadaan Aset</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-blue-50 dark:bg-blue-500/10">
                            <th className={TH}>Nomor</th><th className={TH}>Judul</th><th className={TH}>Status</th><th className={`${TH} text-right`}>Unit</th><th className={`${TH} text-right`}>Total Aktual</th><th className={`${TH} text-right`}>Terbayar</th><th className={`${TH} text-right`}>Sisa</th>
                        </tr></thead>
                        <tbody>
                            {(laporan?.aset ?? []).map(a => (
                                <tr key={a.id_permintaan} className="border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40" onClick={() => onBukaPr(a.id_permintaan)}>
                                    <td className="px-4 py-2 font-mono text-xs font-semibold">{a.nomor_permintaan}</td>
                                    <td className="px-4 py-2">{a.judul}</td>
                                    <td className="px-4 py-2"><Tag className={`text-[10px] font-semibold ${STATUS_TAG[a.status] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[a.status] ?? a.status}</Tag></td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">{formatNum(a.unit_terdaftar)}/{formatNum(a.unit_total)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{formatRupiah(a.total_aktual)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{formatRupiah(a.terbayar)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{formatRupiah(a.sisa)}</td>
                                </tr>
                            ))}
                            {(laporan?.aset ?? []).length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Belum ada pengadaan aset pada periode ini</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card bodyClass="p-0">
                <p className="font-semibold px-4 pt-4 pb-3">{`Menunggu Diproses Lama (${(laporan?.menunggu_lama ?? []).length})`}</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-blue-50 dark:bg-blue-500/10">
                            <th className={TH}>Nomor</th><th className={TH}>Judul</th><th className={TH}>Tipe</th><th className={TH}>Status</th><th className={TH}>Pengaju</th><th className={`${TH} text-right`}>Umur</th>
                        </tr></thead>
                        <tbody>
                            {(laporan?.menunggu_lama ?? []).map(m => (
                                <tr key={m.id_permintaan} className="border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40" onClick={() => onBukaPr(m.id_permintaan)}>
                                    <td className="px-4 py-2 font-mono text-xs font-semibold">{m.nomor_permintaan}</td>
                                    <td className="px-4 py-2">{m.judul}</td>
                                    <td className="px-4 py-2"><Tag className={`text-[10px] font-semibold ${TIPE_TAG[m.tipe] ?? 'bg-gray-100 text-gray-600'}`}>{TIPE_LABEL[m.tipe] ?? m.tipe}</Tag></td>
                                    <td className="px-4 py-2"><Tag className={`text-[10px] font-semibold ${STATUS_TAG[m.status] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[m.status] ?? m.status}</Tag></td>
                                    <td className="px-4 py-2">{m.username_pengaju ?? '—'}</td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">{formatNum(m.umur_hari)} hari</td>
                                </tr>
                            ))}
                            {(laporan?.menunggu_lama ?? []).length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Tidak ada permintaan yang menumpuk</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card>
                <p className="font-semibold mb-3">Lead Time per Tipe</p>
                <table className="w-full text-sm">
                    <thead><tr className="bg-blue-50 dark:bg-blue-500/10"><th className={TH}>Tipe</th><th className={`${TH} text-right`}>Rata-rata Hari</th><th className={`${TH} text-right`}>Jumlah</th></tr></thead>
                    <tbody>
                        {(laporan?.lead_time_per_tipe ?? []).map(l => (
                            <tr key={l.tipe} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="px-3 py-2">{l.label}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatNum(l.rata_hari, 1)} hari</td>
                                <td className="px-3 py-2 text-right">{formatNum(l.jumlah)}</td>
                            </tr>
                        ))}
                        {(laporan?.lead_time_per_tipe ?? []).length === 0 && (
                            <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">Belum ada data</td></tr>
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    )
}
