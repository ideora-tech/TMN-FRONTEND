'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Card, Button, Tag, Tooltip, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiOutlineDownload, HiOutlineEye } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import {
    arusKasService,
    ArahArusKas,
    ArusKasRekap,
    KategoriPemasukan,
    KategoriPengajuan,
    PengajuanPengeluaran,
    SumberArusKas,
    TransaksiArusKas,
} from '@/services/arusKas.service'
import DetailPengajuanDialog from './DetailPengajuanDialog'
import DetailTransaksiDialog, { DetailTransaksi } from './DetailTransaksiDialog'
import { KATEGORI_PEMASUKAN_META, PEMASUKAN_MANUAL_TAG } from './pemasukanMeta'

type Option = { value: string; label: string }

const SUMBER_META: Record<SumberArusKas, { label: string; tag: string; route?: (id: string) => string }> = {
    faktur: {
        label: 'Invoice',
        tag: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
        route: id => ROUTES.FAKTUR_DETAIL(id),
    },
    pengajuan_pengeluaran: {
        label: 'Pengajuan',
        tag: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300',
        route: () => ROUTES.PROSES_PEMBAYARAN,
    },
    pembayaran_vendor: {
        label: 'Vendor',
        tag: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300',
        route: id => ROUTES.INVOICE_VENDOR_DETAIL(id),
    },
    pemasukan_manual: {
        label: 'Pemasukan Manual',
        tag: PEMASUKAN_MANUAL_TAG,
        route: () => `${ROUTES.ARUS_KAS}?tab=pemasukan`,
    },
}

const KATEGORI_TAG_META: Record<KategoriPengajuan, { label: string; tag: string }> = {
    uang_jalan: {
        label: 'Uang Jalan',
        tag: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300',
    },
    legalitas: {
        label: 'Legalitas',
        tag: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300',
    },
    perawatan: {
        label: 'Perawatan',
        tag: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    },
    sparepart: {
        label: 'Sparepart',
        tag: 'bg-lime-100 text-lime-600 dark:bg-lime-500/20 dark:text-lime-300',
    },
    penggajian: {
        label: 'Penggajian',
        tag: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
    },
    pembelian_aset: {
        label: 'Pembelian Aset',
        tag: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
    },
    pembayaran_pinjaman: {
        label: 'Pembayaran Pinjaman',
        tag: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300',
    },
    pembayaran_vendor: {
        label: 'Pembayaran Vendor',
        tag: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    },
    lainnya: {
        label: 'Lainnya',
        tag: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    },
}

const ARAH_OPTIONS: Option[] = [
    { value: '',       label: 'Semua Arah' },
    { value: 'masuk',  label: 'Pemasukan' },
    { value: 'keluar', label: 'Pengeluaran' },
]

const SUMBER_OPTIONS: Option[] = [
    { value: '', label: 'Semua Sumber' },
    ...(Object.keys(SUMBER_META) as SumberArusKas[]).map(value => ({ value, label: SUMBER_META[value].label })),
]

export default function RekapTab() {
    const [dari, setDari]     = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
    const [sampai, setSampai] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
    const [arah, setArah]     = useState('')
    const [sumber, setSumber] = useState('')

    const [rekap, setRekap]     = useState<ArusKasRekap | null>(null)
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [detailPengajuan, setDetailPengajuan] = useState<PengajuanPengeluaran | null>(null)
    const [detailTransaksi, setDetailTransaksi] = useState<DetailTransaksi | null>(null)
    const [logLoadingId, setLogLoadingId] = useState<string | null>(null)

    const bukaLog = async (t: TransaksiArusKas) => {
        if (t.sumber === 'pengajuan_pengeluaran' && t.referensi.id) {
            setLogLoadingId(t.referensi.id)
            try {
                setDetailPengajuan(await arusKasService.getPengajuan(t.referensi.id))
            } catch (err) {
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
            } finally {
                setLogLoadingId(null)
            }
            return
        }
        const meta = SUMBER_META[t.sumber]
        const kategoriLabel = t.sumber === 'pemasukan_manual' && t.kategori
            ? KATEGORI_PEMASUKAN_META[t.kategori as KategoriPemasukan].label
            : null
        setDetailTransaksi({
            tanggal: t.tanggal,
            arah: t.arah,
            sumberLabel: meta.label,
            sumberTagClass: meta.tag,
            kategoriLabel,
            nomor: t.referensi.label ?? null,
            referensiHref: t.referensi.id && meta.route ? meta.route(t.referensi.id) : null,
            sumberDana: null,
            keterangan: t.keterangan,
            nominal: t.nominal,
            url_bukti: t.url_bukti,
        })
    }

    const reqRef = useRef(0)
    const fetchRekap = useCallback(async () => {
        const reqId = ++reqRef.current
        setLoading(true)
        try {
            const data = await arusKasService.getRekap({
                dari,
                sampai,
                arah: (arah || undefined) as ArahArusKas | undefined,
                sumber: (sumber || undefined) as SumberArusKas | undefined,
            })
            if (reqRef.current !== reqId) return
            setRekap(data)
            setCurrentPage(1)
        } catch (err) {
            if (reqRef.current !== reqId) return
            setRekap(null)
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (reqRef.current === reqId) setLoading(false)
        }
    }, [dari, sampai, arah, sumber])

    useEffect(() => { fetchRekap() }, [fetchRekap])

    const handleExport = async () => {
        setExporting(true)
        try {
            await arusKasService.exportExcel({
                dari,
                sampai,
                arah: (arah || undefined) as ArahArusKas | undefined,
                sumber: (sumber || undefined) as SumberArusKas | undefined,
            })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setExporting(false)
        }
    }

    const transaksi = rekap?.transaksi ?? []
    const paged = transaksi.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const columns: ColumnDef<TransaksiArusKas>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Tanggal', accessorKey: 'tanggal', size: 130,
            cell: ({ row }) => <span className="whitespace-nowrap">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>,
        },
        {
            header: 'Sumber', accessorKey: 'sumber', size: 130,
            cell: ({ row }) => {
                const t = row.original
                if (t.sumber === 'pengajuan_pengeluaran' && t.kategori) {
                    const km = KATEGORI_TAG_META[t.kategori as KategoriPengajuan]
                    return <Tag className={`text-xs font-semibold ${km.tag}`}>{km.label}</Tag>
                }
                if (t.sumber === 'pemasukan_manual' && t.kategori) {
                    const km = KATEGORI_PEMASUKAN_META[t.kategori as KategoriPemasukan]
                    return <Tag className={`text-xs font-semibold ${km.tag}`}>{km.label}</Tag>
                }
                const meta = SUMBER_META[t.sumber]
                return <Tag className={`text-xs font-semibold ${meta.tag}`}>{meta.label}</Tag>
            },
        },
        {
            header: 'Referensi', id: 'referensi', size: 220,
            cell: ({ row }) => {
                const t = row.original
                const meta = SUMBER_META[t.sumber]
                const label = t.referensi.label ?? '—'
                if (!t.referensi.id || !meta.route) return label
                return (
                    <a href={meta.route(t.referensi.id)} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline">{label}</a>
                )
            },
        },
        {
            header: 'Keterangan', accessorKey: 'keterangan', size: 220,
            cell: ({ row }) => row.original.keterangan ?? '—',
        },
        {
            header: 'Nominal', id: 'nominal', size: 160,
            cell: ({ row }) => {
                const t = row.original
                const masuk = t.arah === 'masuk'
                return (
                    <span className={`tabular-nums font-semibold whitespace-nowrap ${
                        masuk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                    }`}>
                        {masuk ? '+ ' : '- '}{formatRupiah(t.nominal)}
                    </span>
                )
            },
        },
        {
            header: '', id: 'aksi', size: 70,
            cell: ({ row }) => {
                const t = row.original
                const loadingLog = logLoadingId !== null && logLoadingId === t.referensi.id
                return (
                    <div className="flex items-center justify-end">
                        <Tooltip title="Lihat Detail">
                            <span
                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                onClick={() => bukaLog(t)}>
                                {loadingLog ? <Spinner size={16} /> : <HiOutlineEye className="text-lg" />}
                            </span>
                        </Tooltip>
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40"
                            value={dari ? dayjs(dari).toDate() : null}
                            onChange={date => setDari(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        <span className="text-gray-400 text-sm">s/d</span>
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40"
                            value={sampai ? dayjs(sampai).toDate() : null}
                            onChange={date => setSampai(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </div>
                    <div className="w-full sm:w-44 shrink-0">
                        <Select
                            isSearchable={false}
                            options={ARAH_OPTIONS}
                            value={ARAH_OPTIONS.find(o => o.value === arah) ?? ARAH_OPTIONS[0]}
                            onChange={opt => setArah((opt as Option | null)?.value ?? '')}
                        />
                    </div>
                    <div className="w-full sm:w-48 shrink-0">
                        <Select
                            isSearchable={false}
                            options={SUMBER_OPTIONS}
                            value={SUMBER_OPTIONS.find(o => o.value === sumber) ?? SUMBER_OPTIONS[0]}
                            onChange={opt => setSumber((opt as Option | null)?.value ?? '')}
                        />
                    </div>
                    {loading && <Spinner size={20} />}
                    <div className="flex-1" />
                    <Button size="sm" variant="default" icon={<HiOutlineDownload />}
                        disabled={!rekap || transaksi.length === 0}
                        loading={exporting} onClick={handleExport}>
                        Export Excel
                    </Button>
                </div>

                {loading && !rekap ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Memuat...</p>
                ) : !rekap ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Tidak ada transaksi pada periode ini</p>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-3 px-4 py-3">
                            <div className="rounded-lg p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 min-w-[180px]">
                                <p className="text-xs font-medium text-emerald-500 dark:text-emerald-400 uppercase tracking-wide">Total Pemasukan</p>
                                <p className="font-bold text-base text-emerald-600 dark:text-emerald-300 mt-1">
                                    {formatRupiah(rekap.ringkasan.total_pemasukan)}
                                </p>
                            </div>
                            <div className="rounded-lg p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 min-w-[180px]">
                                <p className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wide">Total Pengeluaran</p>
                                <p className="font-bold text-base text-red-600 dark:text-red-300 mt-1">
                                    {formatRupiah(rekap.ringkasan.total_pengeluaran)}
                                </p>
                            </div>
                            <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 min-w-[180px]">
                                <p className="text-xs font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wide">Netto</p>
                                <p className="font-bold text-base text-blue-600 dark:text-blue-300 mt-1">
                                    {formatRupiah(rekap.ringkasan.netto)}
                                </p>
                            </div>
                        </div>

                        {transaksi.length === 0 ? (
                            <p className="text-gray-400 text-sm py-10 text-center">Tidak ada transaksi yang cocok dengan filter</p>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={paged as unknown[]}
                                loading={loading}
                                pagingData={{ total: transaksi.length, pageIndex: currentPage, pageSize }}
                                onPaginationChange={setCurrentPage}
                                onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                            />
                        )}
                    </>
                )}
            </Card>
            <DetailPengajuanDialog pengajuan={detailPengajuan} onClose={() => setDetailPengajuan(null)} readOnly />
            <DetailTransaksiDialog transaksi={detailTransaksi} onClose={() => setDetailTransaksi(null)} />
        </div>
    )
}
