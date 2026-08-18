'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, DatePicker, Spinner, toast, Notification } from '@/components/ui'
import ExportDropdownButton from '@/components/shared/ExportDropdownButton'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { perawatanArmadaService, RekapPerawatanUnit, FormatLaporan } from '@/services/perawatanArmada.service'

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'
const TH_AMOUNT = 'py-2.5 px-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

export default function LaporanPerUnitTab() {
    const [rows, setRows]       = useState<RekapPerawatanUnit[]>([])
    const [loading, setLoading] = useState(false)
    const [mengunduh, setMengunduh] = useState<FormatLaporan | null>(null)
    const [tanggalDari, setTanggalDari]     = useState<Date | null>(null)
    const [tanggalSampai, setTanggalSampai] = useState<Date | null>(null)

    const periode = useCallback(() => ({
        tanggal_dari: tanggalDari ? dayjs(tanggalDari).format('YYYY-MM-DD') : undefined,
        tanggal_sampai: tanggalSampai ? dayjs(tanggalSampai).format('YYYY-MM-DD') : undefined,
    }), [tanggalDari, tanggalSampai])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            setRows(await perawatanArmadaService.rekapPerUnit(periode()))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [periode])

    useEffect(() => { fetchData() }, [fetchData])

    const unduh = async (format: FormatLaporan) => {
        setMengunduh(format)
        try {
            await perawatanArmadaService.downloadRekapPerUnit(format, periode())
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(null)
        }
    }

    const totalJumlah    = rows.reduce((s, r) => s + r.jumlah_perawatan, 0)
    const totalJasa      = rows.reduce((s, r) => s + r.biaya_jasa, 0)
    const totalSparepart = rows.reduce((s, r) => s + r.biaya_sparepart, 0)
    const totalSemua     = rows.reduce((s, r) => s + r.total_biaya, 0)

    return (
        <Card bodyClass="p-0">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="w-full sm:w-40 shrink-0">
                    <DatePicker placeholder="Dari tanggal" value={tanggalDari} onChange={setTanggalDari} />
                </div>
                <div className="w-full sm:w-40 shrink-0">
                    <DatePicker placeholder="Sampai tanggal" value={tanggalSampai} onChange={setTanggalSampai} />
                </div>
                <div className="flex-1" />
                <ExportDropdownButton
                    loading={mengunduh}
                    onExportExcel={() => unduh('excel')}
                    onExportPdf={() => unduh('pdf')}
                />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-blue-50 dark:bg-blue-500/10">
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                            <th className={`${TH_CLASS} w-12`}>No</th>
                            <th className={TH_CLASS}>Armada</th>
                            <th className={TH_CLASS}>Merk</th>
                            <th className={TH_AMOUNT}>Jumlah Perawatan</th>
                            <th className={TH_AMOUNT}>Biaya Jasa</th>
                            <th className={TH_AMOUNT}>Biaya Sparepart</th>
                            <th className={TH_AMOUNT}>Total Biaya</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="py-10 text-center">
                                    <Spinner className="inline-block" size={28} />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-10 text-center text-gray-400">
                                    Tidak ada data perawatan pada periode ini
                                </td>
                            </tr>
                        ) : (
                            <>
                                {rows.map((r, i) => (
                                    <tr key={r.id_armada}>
                                        <td className="py-2.5 px-3">{i + 1}</td>
                                        <td className="py-2.5 px-3">
                                            <span className="font-mono text-xs font-semibold">{r.nopol}</span>
                                        </td>
                                        <td className="py-2.5 px-3">{r.merk ?? '—'}</td>
                                        <td className="py-2.5 px-3 text-right">{formatNum(r.jumlah_perawatan)}</td>
                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(r.biaya_jasa)}</td>
                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(r.biaya_sparepart)}</td>
                                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-semibold">{formatRupiah(r.total_biaya)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-blue-50/60 dark:bg-blue-500/10 font-bold">
                                    <td colSpan={3} className="py-2.5 px-3">TOTAL</td>
                                    <td className="py-2.5 px-3 text-right">{formatNum(totalJumlah)}</td>
                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(totalJasa)}</td>
                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(totalSparepart)}</td>
                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(totalSemua)}</td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
