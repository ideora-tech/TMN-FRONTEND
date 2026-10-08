'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { Card, Spinner, Tag, toast, Notification } from '@/components/ui'
import {
    PiCurrencyCircleDollarDuotone,
    PiClockCountdownDuotone,
    PiFireDuotone,
    PiHandCoinsDuotone,
    PiReceiptDuotone,
} from 'react-icons/pi'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { fakturService, OutstandingFaktur, KelompokUmurPiutang } from '@/services/faktur.service'
import { invoiceVendorService, MonitoringInvoiceVendor } from '@/services/invoice-vendor.service'

const UMUR: { kunci: KelompokUmurPiutang; label: string; warna: string; titik: string }[] = [
    { kunci: 'belum_jatuh_tempo', label: 'Belum jatuh tempo', warna: 'bg-emerald-500', titik: 'bg-emerald-500' },
    { kunci: 'hari_1_30',         label: '1-30 hari',         warna: 'bg-amber-400',   titik: 'bg-amber-400' },
    { kunci: 'hari_31_60',        label: '31-60 hari',        warna: 'bg-orange-500',  titik: 'bg-orange-500' },
    { kunci: 'di_atas_60',        label: '> 60 hari',         warna: 'bg-red-500',     titik: 'bg-red-500' },
]

const LABEL = 'text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide'
const TH = 'py-2 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

function BatangUmur({ aging, total }: { aging: Record<KelompokUmurPiutang, { jumlah: number; nominal: number }>; total: number }) {
    return (
        <div>
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                {total > 0 && UMUR.map(u => aging[u.kunci].nominal > 0 && (
                    <div key={u.kunci} className={u.warna} style={{ width: `${aging[u.kunci].nominal / total * 100}%` }} />
                ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 mt-3">
                {UMUR.map(u => (
                    <div key={u.kunci} className="flex items-start gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${u.titik}`} />
                        <div className="min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{u.label}</p>
                            <p className="text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-100">{formatRupiah(aging[u.kunci].nominal)}</p>
                            <p className="text-xs text-gray-400">{formatNum(aging[u.kunci].jumlah)} invoice</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function DashboardKeuanganTab({ tampilHutang }: { tampilHutang: boolean }) {
    const [piutang, setPiutang] = useState<OutstandingFaktur | null>(null)
    const [hutang, setHutang]   = useState<MonitoringInvoiceVendor | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let batal = false
        const muat = async () => {
            try {
                const [dataPiutang, dataHutang] = await Promise.all([
                    fakturService.outstanding({ limit: 5 }),
                    tampilHutang ? invoiceVendorService.monitoring().catch(() => null) : Promise.resolve(null),
                ])
                if (batal) return
                setPiutang(dataPiutang)
                setHutang(dataHutang)
            } catch (err) {
                if (!batal) toast.push(<Notification type="danger" title={parseApiError(err)} />)
            } finally {
                if (!batal) setLoading(false)
            }
        }
        muat()
        return () => { batal = true }
    }, [tampilHutang])

    if (loading) return <div className="flex justify-center py-16"><Spinner size={32} /></div>
    if (!piutang) return <p className="text-gray-400 text-sm py-10 text-center">Data keuangan tidak tersedia.</p>

    const r = piutang.ringkasan
    const kartu = [
        {
            label: 'Piutang Klien', nilai: formatRupiah(r.total_outstanding), sub: `${formatNum(r.jumlah_invoice)} invoice belum lunas`,
            icon: <PiCurrencyCircleDollarDuotone className="text-3xl text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400',
        },
        {
            label: 'Lewat Jatuh Tempo', nilai: formatRupiah(r.lewat_jatuh_tempo.nominal), sub: `${formatNum(r.lewat_jatuh_tempo.jumlah)} invoice perlu ditagih`,
            icon: <PiFireDuotone className="text-3xl text-red-500" />, bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400',
        },
        {
            label: 'Jatuh Tempo dalam 7 Hari', nilai: formatRupiah(r.jatuh_tempo_7_hari.nominal), sub: `${formatNum(r.jatuh_tempo_7_hari.jumlah)} invoice`,
            icon: <PiClockCountdownDuotone className="text-3xl text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400',
        },
        {
            label: 'Diterima Bulan Ini', nilai: formatRupiah(r.diterima_bulan_ini), sub: 'uang masuk dari klien',
            icon: <PiHandCoinsDuotone className="text-3xl text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400',
        },
    ]
    const tautanOutstanding = ROUTES.PIUTANG
    const hutangTerlambat = hutang
        ? hutang.ringkasan.aging.hari_1_30.nominal + hutang.ringkasan.aging.hari_31_60.nominal + hutang.ringkasan.aging.di_atas_60.nominal
        : 0

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {kartu.map(k => (
                    <Card key={k.label} className={k.bg}>
                        <div className="flex flex-col gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>{k.icon}</div>
                            <div className={`font-bold text-lg ${k.text}`}>{k.nilai}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{k.label} · {k.sub}</div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className={LABEL}>Umur Piutang Klien</p>
                    <Link href={tautanOutstanding} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">Lihat rincian</Link>
                </div>
                {r.jumlah_invoice === 0
                    ? <p className="text-sm text-gray-400">Tidak ada piutang outstanding.</p>
                    : <BatangUmur aging={r.aging} total={r.total_outstanding} />}
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card bodyClass="p-0">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="font-semibold">Klien dengan Tunggakan Terbesar</p>
                    </div>
                    {piutang.per_klien.length === 0 ? (
                        <p className="text-gray-400 text-sm py-8 text-center">Tidak ada data.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className={TH}>Klien</th>
                                        <th className={`${TH} text-right`}>Outstanding</th>
                                        <th className={`${TH} text-right`}>Lewat Jatuh Tempo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {piutang.per_klien.slice(0, 5).map(k => (
                                        <tr key={k.id_klien ?? 'tanpa-klien'}>
                                            <td className="py-2.5 px-4">
                                                <p className="font-medium text-gray-800 dark:text-gray-200">{k.nama_klien}</p>
                                                <p className="text-xs text-gray-400">{formatNum(k.jumlah)} invoice</p>
                                            </td>
                                            <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{formatRupiah(k.outstanding)}</td>
                                            <td className={`py-2.5 px-4 text-right tabular-nums ${k.terlambat > 0 ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400'}`}>
                                                {k.terlambat > 0 ? formatRupiah(k.terlambat) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <Card bodyClass="p-0">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="font-semibold">Invoice Paling Lama Tertunggak</p>
                    </div>
                    {piutang.data.length === 0 ? (
                        <p className="text-gray-400 text-sm py-8 text-center">Tidak ada data.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className={TH}>Invoice</th>
                                        <th className={TH}>Jatuh Tempo</th>
                                        <th className={`${TH} text-right`}>Sisa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {piutang.data.map(inv => (
                                        <tr key={inv.id_faktur}>
                                            <td className="py-2.5 px-4">
                                                <Link href={ROUTES.FAKTUR_DETAIL(inv.id_faktur)} className="font-mono font-semibold text-xs text-blue-600 dark:text-blue-400 hover:underline">{inv.nomor_faktur}</Link>
                                                <p className="text-xs text-gray-400">{inv.nama_klien ?? '—'}</p>
                                            </td>
                                            <td className="py-2.5 px-4 whitespace-nowrap">
                                                {inv.jatuh_tempo ? dayjs(inv.jatuh_tempo).format('DD MMM YYYY') : <span className="text-gray-400">—</span>}
                                                {inv.hari_terlambat > 0 && (
                                                    <Tag className="ml-2 text-[10px] px-1.5 py-0 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-100">{formatNum(inv.hari_terlambat)} hari</Tag>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{formatRupiah(inv.sisa)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {r.jumlah_invoice > piutang.data.length && (
                        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                            <Link href={tautanOutstanding} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                Lihat semua {formatNum(r.jumlah_invoice)} invoice
                            </Link>
                        </div>
                    )}
                </Card>
            </div>

            {hutang && (
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <p className={LABEL}>Hutang ke Vendor</p>
                        <Link href={ROUTES.INVOICE_VENDOR} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">Buka Invoice Vendor</Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50 dark:bg-violet-500/10">
                                <PiReceiptDuotone className="text-2xl text-violet-500" />
                            </div>
                            <div>
                                <p className="font-bold text-lg tabular-nums text-gray-800 dark:text-gray-100">{formatRupiah(hutang.ringkasan.total_outstanding)}</p>
                                <p className="text-xs text-gray-400">{formatNum(hutang.ringkasan.jumlah_invoice)} invoice vendor belum lunas</p>
                            </div>
                        </div>
                        <div>
                            <p className={`font-bold text-lg tabular-nums ${hutangTerlambat > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>{formatRupiah(hutangTerlambat)}</p>
                            <p className="text-xs text-gray-400">sudah lewat jatuh tempo</p>
                        </div>
                    </div>
                    {hutang.ringkasan.jumlah_invoice > 0 && <BatangUmur aging={hutang.ringkasan.aging} total={hutang.ringkasan.total_outstanding} />}
                </Card>
            )}
        </div>
    )
}
