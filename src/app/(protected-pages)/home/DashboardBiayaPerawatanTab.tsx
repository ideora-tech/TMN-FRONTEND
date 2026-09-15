'use client'
import { useEffect, useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { Button, Card, DatePicker, Spinner, Tooltip, toast, Notification } from '@/components/ui'
import Chart from '@/components/shared/Chart'
import { HiOutlineDownload, HiOutlineEye } from 'react-icons/hi'
import {
    PiWalletDuotone,
    PiWrenchDuotone,
    PiPackageDuotone,
    PiClipboardTextDuotone,
    PiTruckDuotone,
} from 'react-icons/pi'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { parseApiError } from '@/utils/error.util'
import { perawatanArmadaService, type RekapPerawatanUnit, type ParamPeriode } from '@/services/perawatanArmada.service'
import DetailBiayaUnitDrawer from './DetailBiayaUnitDrawer'
import { TH_KIRI, TH_KANAN, formatRupiahRingkas } from './biayaPerawatan.shared'

const MAKS_UNIT_GRAFIK = 10

export default function DashboardBiayaPerawatanTab() {
    const [rows, setRows]       = useState<RekapPerawatanUnit[]>([])
    const [loading, setLoading] = useState(true)
    const [mengunduh, setMengunduh] = useState(false)
    const [tanggalDari, setTanggalDari]     = useState<Date | null>(dayjs().startOf('year').toDate())
    const [tanggalSampai, setTanggalSampai] = useState<Date | null>(new Date())
    const [unitTerpilih, setUnitTerpilih]   = useState<RekapPerawatanUnit | null>(null)

    const periode = useMemo<ParamPeriode>(() => ({
        tanggal_dari: tanggalDari ? dayjs(tanggalDari).format('YYYY-MM-DD') : undefined,
        tanggal_sampai: tanggalSampai ? dayjs(tanggalSampai).format('YYYY-MM-DD') : undefined,
    }), [tanggalDari, tanggalSampai])

    useEffect(() => {
        let aktif = true
        setLoading(true)
        perawatanArmadaService.rekapPerUnit(periode)
            .then(data => { if (aktif) setRows([...data].sort((a, b) => b.total_biaya - a.total_biaya)) })
            .catch(err => { if (aktif) toast.push(<Notification type="danger" title={parseApiError(err)} />) })
            .finally(() => { if (aktif) setLoading(false) })
        return () => { aktif = false }
    }, [periode])

    const unduhExcel = async () => {
        setMengunduh(true)
        try {
            await perawatanArmadaService.downloadRekapPerUnit('excel', periode)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(false)
        }
    }

    const totalJumlah    = rows.reduce((s, r) => s + r.jumlah_perawatan, 0)
    const totalItem      = rows.reduce((s, r) => s + r.qty_sparepart, 0)
    const totalJasa      = rows.reduce((s, r) => s + r.biaya_jasa, 0)
    const totalSparepart = rows.reduce((s, r) => s + r.biaya_sparepart, 0)
    const totalSemua     = rows.reduce((s, r) => s + r.total_biaya, 0)
    const unitTertinggi  = rows[0] ?? null

    const cards = [
        { label: 'Total Biaya Keluar', value: formatRupiah(totalSemua),     sub: `${formatNum(rows.length)} unit`,                  icon: <PiWalletDuotone className="text-3xl text-red-500" />,           bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-400' },
        { label: 'Biaya Jasa',         value: formatRupiah(totalJasa),      sub: totalSemua > 0 ? `${Math.round(totalJasa / totalSemua * 100)}% dari total` : '—', icon: <PiWrenchDuotone className="text-3xl text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
        { label: 'Biaya Sparepart',    value: formatRupiah(totalSparepart), sub: `${formatNum(totalItem)} item dipakai`,             icon: <PiPackageDuotone className="text-3xl text-violet-500" />,      bg: 'bg-violet-50 dark:bg-violet-500/10',   text: 'text-violet-600 dark:text-violet-400' },
        { label: 'Jumlah Perawatan',   value: formatNum(totalJumlah),       sub: 'catatan servis / perbaikan',                        icon: <PiClipboardTextDuotone className="text-3xl text-blue-500" />,  bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400' },
        { label: 'Unit Biaya Tertinggi', value: unitTertinggi ? unitTertinggi.nopol : '—', sub: unitTertinggi ? formatRupiah(unitTertinggi.total_biaya) : 'belum ada data', icon: <PiTruckDuotone className="text-3xl text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
    ]

    const dataGrafik = rows.slice(0, MAKS_UNIT_GRAFIK)

    return (
        <div className="flex flex-col gap-6">
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker inputFormat="DD/MM/YYYY" placeholder="Dari tanggal" value={tanggalDari} onChange={setTanggalDari} />
                    </div>
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker inputFormat="DD/MM/YYYY" placeholder="Sampai tanggal" value={tanggalSampai} onChange={setTanggalSampai} />
                    </div>
                    <div className="flex-1" />
                    <Button size="sm" variant="solid" icon={<HiOutlineDownload />} loading={mengunduh} onClick={unduhExcel}>
                        Unduh Excel
                    </Button>
                </div>
            </Card>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <div className="flex flex-col gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
                                <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                    {cards.map(card => (
                        <Card key={card.label} className={card.bg}>
                            <div className="flex flex-col gap-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                                    {card.icon}
                                </div>
                                <div className={`font-bold text-xl leading-tight ${card.text}`}>{card.value}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">{card.sub}</div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {!loading && dataGrafik.length > 0 && (
                <Card>
                    <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold">Biaya Perawatan per Unit</h5>
                        <span className="text-xs text-gray-400">{rows.length > MAKS_UNIT_GRAFIK ? `${MAKS_UNIT_GRAFIK} unit dengan biaya tertinggi` : `${rows.length} unit`}</span>
                    </div>
                    <Chart
                        type="bar"
                        height={280}
                        series={[
                            { name: 'Biaya Jasa', data: dataGrafik.map(r => r.biaya_jasa) },
                            { name: 'Biaya Sparepart', data: dataGrafik.map(r => r.biaya_sparepart) },
                        ]}
                        xAxis={dataGrafik.map(r => r.nopol)}
                        customOptions={{
                            chart: { stacked: true, toolbar: { show: false }, zoom: { enabled: false } },
                            plotOptions: { bar: { horizontal: false, columnWidth: '45%', borderRadius: 4, borderRadiusApplication: 'end' } },
                            dataLabels: { enabled: false },
                            legend: { position: 'top', horizontalAlign: 'left' },
                            yaxis: { labels: { formatter: (v: number) => formatRupiahRingkas(v) } },
                            tooltip: { y: { formatter: (v: number) => formatRupiah(v) } },
                        }}
                    />
                </Card>
            )}

            <Card bodyClass="p-0">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <h5 className="font-semibold">Biaya per Unit</h5>
                    <span className="text-xs text-gray-400">Klik baris untuk lihat riwayat & spare part unit</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className={`${TH_KIRI} w-12`}>No</th>
                                <th className={TH_KIRI}>Armada</th>
                                <th className={TH_KIRI}>Merk</th>
                                <th className={TH_KANAN}>Perawatan</th>
                                <th className={TH_KANAN}>Item Sparepart</th>
                                <th className={TH_KANAN}>KM Terakhir</th>
                                <th className={TH_KANAN}>Biaya Jasa</th>
                                <th className={TH_KANAN}>Biaya Sparepart</th>
                                <th className={TH_KANAN}>Total Keluar</th>
                                <th className={`${TH_KIRI} w-16`}></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="py-10 text-center">
                                        <Spinner className="inline-block" size={28} />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-10 text-center text-gray-400">
                                        Tidak ada data perawatan pada periode ini
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {rows.map((r, i) => (
                                        <tr key={r.id_armada}
                                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                            onClick={() => setUnitTerpilih(r)}>
                                            <td className="py-2.5 px-3">{i + 1}</td>
                                            <td className="py-2.5 px-3">
                                                <span className="font-mono text-xs font-semibold">{r.nopol}</span>
                                            </td>
                                            <td className="py-2.5 px-3">{r.merk ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-right">{formatNum(r.jumlah_perawatan)}</td>
                                            <td className="py-2.5 px-3 text-right">{formatNum(r.qty_sparepart)}</td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">{r.km_terakhir !== null ? `${formatNum(r.km_terakhir)} km` : '—'}</td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(r.biaya_jasa)}</td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(r.biaya_sparepart)}</td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap font-semibold">{formatRupiah(r.total_biaya)}</td>
                                            <td className="py-2.5 px-3">
                                                <Tooltip title="Riwayat & spare part unit">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors">
                                                        <HiOutlineEye className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-blue-50/60 dark:bg-blue-500/10 font-bold">
                                        <td colSpan={3} className="py-2.5 px-3">TOTAL</td>
                                        <td className="py-2.5 px-3 text-right">{formatNum(totalJumlah)}</td>
                                        <td className="py-2.5 px-3 text-right">{formatNum(totalItem)}</td>
                                        <td className="py-2.5 px-3" />
                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(totalJasa)}</td>
                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(totalSparepart)}</td>
                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(totalSemua)}</td>
                                        <td className="py-2.5 px-3" />
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <DetailBiayaUnitDrawer
                unit={unitTerpilih}
                periode={periode}
                onClose={() => setUnitTerpilih(null)}
            />
        </div>
    )
}
