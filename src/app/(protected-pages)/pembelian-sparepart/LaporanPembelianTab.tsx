'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, DatePicker, toast, Notification } from '@/components/ui'
import ExportDropdownButton from '@/components/shared/ExportDropdownButton'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { pembelianSparepartService, LaporanPembelian } from '@/services/pembelianSparepart.service'

export default function LaporanPembelianTab() {
    const [laporan, setLaporan] = useState<LaporanPembelian | null>(null)
    const [tanggalDari, setTanggalDari]     = useState<Date | null>(null)
    const [tanggalSampai, setTanggalSampai] = useState<Date | null>(null)
    const [mengunduh, setMengunduh] = useState<'excel' | 'pdf' | null>(null)

    const periode = useCallback(() => ({
        dari: tanggalDari ? dayjs(tanggalDari).format('YYYY-MM-DD') : undefined,
        sampai: tanggalSampai ? dayjs(tanggalSampai).format('YYYY-MM-DD') : undefined,
    }), [tanggalDari, tanggalSampai])

    const fetchData = useCallback(async () => {
        try {
            setLaporan(await pembelianSparepartService.laporan(periode()))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        }
    }, [periode])

    useEffect(() => { fetchData() }, [fetchData])

    const unduh = async (format: 'excel' | 'pdf') => {
        setMengunduh(format)
        try {
            await pembelianSparepartService.downloadLaporan(format, periode())
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(null)
        }
    }

    const selisihPositif = (laporan?.ringkasan.selisih ?? 0) > 0

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
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
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><p className="text-xs text-gray-400 uppercase tracking-wide">Total Estimasi</p>
                    <p className="text-lg font-bold mt-1">{formatRupiah(laporan?.ringkasan.total_estimasi ?? 0)}</p></Card>
                <Card><p className="text-xs text-gray-400 uppercase tracking-wide">Total Aktual</p>
                    <p className="text-lg font-bold mt-1">{formatRupiah(laporan?.ringkasan.total_aktual ?? 0)}</p></Card>
                <Card><p className="text-xs text-gray-400 uppercase tracking-wide">Selisih</p>
                    <p className={`text-lg font-bold mt-1 ${selisihPositif ? 'text-red-500' : 'text-emerald-600'}`}>
                        {formatRupiah(laporan?.ringkasan.selisih ?? 0)}</p></Card>
                <Card><p className="text-xs text-gray-400 uppercase tracking-wide">Jumlah Pembelian</p>
                    <p className="text-lg font-bold mt-1">{formatNum(laporan?.ringkasan.jumlah ?? 0)}</p></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <p className="font-semibold mb-3">Per Bulan</p>
                    <table className="w-full text-sm">
                        <thead><tr className="bg-blue-50 dark:bg-blue-500/10 text-left">
                            <th className="px-3 py-2">Bulan</th><th className="px-3 py-2 text-right">Estimasi</th>
                            <th className="px-3 py-2 text-right">Aktual</th><th className="px-3 py-2 text-right">Jumlah</th></tr></thead>
                        <tbody>{(laporan?.per_bulan ?? []).map(b => (
                            <tr key={b.bulan} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="px-3 py-2">{dayjs(b.bulan + '-01').format('MMM YYYY')}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(b.total_estimasi))}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(b.total_aktual))}</td>
                                <td className="px-3 py-2 text-right">{formatNum(Number(b.jumlah))}</td>
                            </tr>))}
                            {(laporan?.per_bulan ?? []).length === 0 && (
                                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Belum ada data</td></tr>)}
                        </tbody>
                    </table>
                </Card>
                <Card>
                    <p className="font-semibold mb-3">Per Kategori Sparepart</p>
                    <table className="w-full text-sm">
                        <thead><tr className="bg-blue-50 dark:bg-blue-500/10 text-left">
                            <th className="px-3 py-2">Kategori</th><th className="px-3 py-2 text-right">Total Aktual</th></tr></thead>
                        <tbody>{(laporan?.per_kategori ?? []).map(k => (
                            <tr key={k.kategori} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="px-3 py-2">{k.kategori}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(k.total_aktual))}</td>
                            </tr>))}
                            {(laporan?.per_kategori ?? []).length === 0 && (
                                <tr><td colSpan={2} className="px-3 py-6 text-center text-gray-400">Belum ada data</td></tr>)}
                        </tbody>
                    </table>
                </Card>
            </div>

            <Card>
                <p className="font-semibold mb-3">Per Armada</p>
                <table className="w-full text-sm">
                    <thead><tr className="bg-blue-50 dark:bg-blue-500/10 text-left">
                        <th className="px-3 py-2">Nopol</th><th className="px-3 py-2 text-right">Total Aktual</th>
                        <th className="px-3 py-2 text-right">Jumlah Pembelian</th></tr></thead>
                    <tbody>{(laporan?.per_armada ?? []).map(a => (
                        <tr key={a.nopol} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="px-3 py-2 font-semibold">{a.nopol}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(Number(a.total_aktual))}</td>
                            <td className="px-3 py-2 text-right">{formatNum(Number(a.jumlah))}</td>
                        </tr>))}
                        {(laporan?.per_armada ?? []).length === 0 && (
                            <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">Belum ada pembelian terkait armada</td></tr>)}
                    </tbody>
                </table>
            </Card>
        </div>
    )
}
