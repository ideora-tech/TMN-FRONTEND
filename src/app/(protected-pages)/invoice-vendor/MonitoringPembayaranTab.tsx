'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Tag, Tooltip, toast, Notification, Spinner } from '@/components/ui'
import { HiOutlineEye } from 'react-icons/hi'
import {
    PiCurrencyCircleDollarDuotone,
    PiClockCountdownDuotone,
    PiWarningCircleDuotone,
    PiFireDuotone,
    PiCalendarCheckDuotone,
} from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { invoiceVendorService, MonitoringInvoiceVendor } from '@/services/invoice-vendor.service'
import { BAYAR_TAG, BAYAR_LABEL } from './DaftarInvoiceTab'

export default function MonitoringPembayaranTab() {
    const router = useRouter()
    const [data, setData]       = useState<MonitoringInvoiceVendor | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            setData(await invoiceVendorService.monitoring())
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    if (loading) {
        return (
            <div className="flex justify-center py-16"><Spinner size={32} /></div>
        )
    }

    if (!data) {
        return <p className="text-gray-400 text-sm py-10 text-center">Data monitoring tidak tersedia.</p>
    }

    const { ringkasan, outstanding } = data
    const cards = [
        {
            label: 'Total Outstanding',
            value: formatRupiah(ringkasan.total_outstanding),
            sub:   `${formatNum(ringkasan.jumlah_invoice)} invoice`,
            icon:  <PiCurrencyCircleDollarDuotone className="text-3xl text-blue-500" />,
            bg:    'bg-blue-50 dark:bg-blue-500/10',
            text:  'text-blue-600 dark:text-blue-400',
        },
        {
            label: 'Belum Jatuh Tempo',
            value: formatRupiah(ringkasan.aging.belum_jatuh_tempo.nominal),
            sub:   `${formatNum(ringkasan.aging.belum_jatuh_tempo.jumlah)} invoice`,
            icon:  <PiCalendarCheckDuotone className="text-3xl text-emerald-500" />,
            bg:    'bg-emerald-50 dark:bg-emerald-500/10',
            text:  'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Terlambat 1-30 Hari',
            value: formatRupiah(ringkasan.aging.hari_1_30.nominal),
            sub:   `${formatNum(ringkasan.aging.hari_1_30.jumlah)} invoice`,
            icon:  <PiClockCountdownDuotone className="text-3xl text-amber-500" />,
            bg:    'bg-amber-50 dark:bg-amber-500/10',
            text:  'text-amber-600 dark:text-amber-400',
        },
        {
            label: 'Terlambat 31-60 Hari',
            value: formatRupiah(ringkasan.aging.hari_31_60.nominal),
            sub:   `${formatNum(ringkasan.aging.hari_31_60.jumlah)} invoice`,
            icon:  <PiWarningCircleDuotone className="text-3xl text-orange-500" />,
            bg:    'bg-orange-50 dark:bg-orange-500/10',
            text:  'text-orange-600 dark:text-orange-400',
        },
        {
            label: 'Terlambat > 60 Hari',
            value: formatRupiah(ringkasan.aging.di_atas_60.nominal),
            sub:   `${formatNum(ringkasan.aging.di_atas_60.jumlah)} invoice`,
            icon:  <PiFireDuotone className="text-3xl text-red-500" />,
            bg:    'bg-red-50 dark:bg-red-500/10',
            text:  'text-red-600 dark:text-red-400',
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {cards.map(card => (
                    <Card key={card.label} className={card.bg}>
                        <div className="flex flex-col gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                                {card.icon}
                            </div>
                            <div className={`font-bold text-lg ${card.text}`}>{card.value}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {card.label} · {card.sub}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-semibold">Invoice Outstanding</p>
                    <p className="text-xs text-gray-400 mt-0.5">Invoice terverifikasi yang belum lunas, diurutkan dari jatuh tempo terdekat</p>
                </div>
                {outstanding.length === 0 ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Tidak ada invoice outstanding.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Nomor</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Vendor</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Jatuh Tempo</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Hari Terlambat</th>
                                    <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Total</th>
                                    <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Dibayar</th>
                                    <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Sisa</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Status</th>
                                    <th className="py-2.5 px-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {outstanding.map(inv => (
                                    <tr key={inv.id_invoice_vendor}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                        onClick={() => router.push(ROUTES.INVOICE_VENDOR_DETAIL(inv.id_invoice_vendor))}>
                                        <td className="py-3 px-4 font-mono font-semibold text-gray-800 dark:text-gray-100">{inv.nomor_invoice}</td>
                                        <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">{inv.vendor_nama}</td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {inv.jatuh_tempo
                                                ? <span className={inv.hari_terlambat > 0 ? 'text-red-500 font-medium' : ''}>{dayjs(inv.jatuh_tempo).format('DD MMM YYYY')}</span>
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 px-4">
                                            {inv.hari_terlambat > 0
                                                ? <Tag className="bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-100">{formatNum(inv.hari_terlambat)} hari</Tag>
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 px-4 text-right tabular-nums">{formatRupiah(inv.total)}</td>
                                        <td className="py-3 px-4 text-right tabular-nums">{formatRupiah(inv.dibayar)}</td>
                                        <td className="py-3 px-4 text-right tabular-nums font-semibold">{formatRupiah(inv.sisa)}</td>
                                        <td className="py-3 px-4">
                                            <Tag className={BAYAR_TAG[inv.status_pembayaran] ?? 'bg-gray-100 text-gray-600'}>
                                                {BAYAR_LABEL[inv.status_pembayaran] ?? inv.status_pembayaran}
                                            </Tag>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Tooltip title="Detail">
                                                <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors">
                                                    <HiOutlineEye className="text-lg" />
                                                </span>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
