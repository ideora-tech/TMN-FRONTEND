'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Alert, Card, Button, Input, Tooltip, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import Tabs from '@/components/ui/Tabs'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX, HiOutlineDownload, HiOutlineExternalLink } from 'react-icons/hi'
import {
    PiArrowCircleUpDuotone, PiArrowCircleDownDuotone, PiScalesDuotone,
    PiHandCoinsDuotone, PiUsersDuotone, PiReceiptDuotone,
} from 'react-icons/pi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { rekapPajakService, BarisPajak, JenisPajak, RekapPajak, RincianPajak } from '@/services/rekapPajak.service'
import { BULAN_OPTIONS } from '../kasbon/kasbonMeta'

type Opsi = { value: string; label: string }

const TH = 'py-2.5 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'
const SETAHUN = 'setahun'

const OPSI_MASA: Opsi[] = [{ value: SETAHUN, label: 'Setahun Penuh' }, ...BULAN_OPTIONS]
const TAHUN_SEKARANG = Number(dayjs().format('YYYY'))
const OPSI_TAHUN: Opsi[] = [TAHUN_SEKARANG - 3, TAHUN_SEKARANG - 2, TAHUN_SEKARANG - 1, TAHUN_SEKARANG]
    .map(t => ({ value: String(t), label: String(t) }))

const META_JENIS: Record<JenisPajak, { tab: string; pihak: string; dasar: string; catatan: string }> = {
    ppn_keluaran:       { tab: 'PPN Keluaran',       pihak: 'Klien',             dasar: 'DPP',               catatan: 'Dari invoice klien berstatus terkirim atau lunas, menurut tanggal invoice.' },
    ppn_masukan:        { tab: 'PPN Masukan',        pihak: 'Vendor / Supplier', dasar: 'DPP',               catatan: 'Dari invoice vendor terverifikasi dan pembelian yang sudah dibeli, menurut tanggal invoice / pembelian.' },
    pph_vendor:         { tab: 'PPh Vendor',         pihak: 'Vendor',            dasar: 'DPP',               catatan: 'PPh yang dipotong perusahaan dari invoice vendor terverifikasi — wajib disetor ke kas negara.' },
    pph21:              { tab: 'PPh 21',             pihak: 'Karyawan',          dasar: 'Penghasilan Bruto', catatan: 'Dari slip gaji pada periode payroll yang sudah final, menurut tanggal akhir periode.' },
    pph_dipotong_klien: { tab: 'PPh Dipotong Klien', pihak: 'Klien',             dasar: 'Uang Diterima',     catatan: 'Potongan pembayaran invoice yang keterangannya memuat "PPh" — bisa dikreditkan bila bukti potong diterima.' },
    pajak_lain:         { tab: 'Pajak Lain',         pihak: 'Klien',             dasar: 'DPP',               catatan: 'Baris pajak di invoice klien yang namanya bukan PPN — periksa penamaannya.' },
}

const URUTAN_JENIS: JenisPajak[] = ['ppn_keluaran', 'ppn_masukan', 'pph_vendor', 'pph21', 'pph_dipotong_klien', 'pajak_lain']

export default function RekapPajakPage() {
    const [masa, setMasa]   = useState(dayjs().format('MM'))
    const [tahun, setTahun] = useState(String(TAHUN_SEKARANG))
    const [rekap, setRekap] = useState<RekapPajak | null>(null)
    const [loading, setLoading]     = useState(true)
    const [mengunduh, setMengunduh] = useState(false)

    const [jenis, setJenis]     = useState<JenisPajak>('ppn_keluaran')
    const [rincian, setRincian] = useState<RincianPajak | null>(null)
    const [loadingRincian, setLoadingRincian] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)

    const permintaanRekap   = useRef(0)
    const permintaanRincian = useRef(0)

    const rentang = useMemo(() => (
        masa === SETAHUN
            ? { dari: `${tahun}-01`, sampai: `${tahun}-12` }
            : { dari: `${tahun}-${masa}`, sampai: `${tahun}-${masa}` }
    ), [masa, tahun])

    const muatRekap = useCallback(async () => {
        const urutan = ++permintaanRekap.current
        setLoading(true)
        try {
            const res = await rekapPajakService.rekap(rentang)
            if (urutan !== permintaanRekap.current) return
            setRekap(res)
        } catch (err) {
            if (urutan !== permintaanRekap.current) return
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (urutan === permintaanRekap.current) setLoading(false)
        }
    }, [rentang])

    const muatRincian = useCallback(async () => {
        const urutan = ++permintaanRincian.current
        setLoadingRincian(true)
        try {
            const res = await rekapPajakService.rincian(jenis, rentang, currentPage, pageSize, search)
            if (urutan !== permintaanRincian.current) return
            setRincian(res)
        } catch (err) {
            if (urutan !== permintaanRincian.current) return
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (urutan === permintaanRincian.current) setLoadingRincian(false)
        }
    }, [jenis, rentang, currentPage, pageSize, search])

    useEffect(() => { muatRekap() }, [muatRekap])
    useEffect(() => { muatRincian() }, [muatRincian])

    const gantiMasa = (nilai: string) => { setMasa(nilai); setCurrentPage(1) }
    const gantiTahun = (nilai: string) => { setTahun(nilai); setCurrentPage(1) }
    const gantiJenis = (nilai: JenisPajak) => {
        setJenis(nilai)
        setRincian(null)
        setSearchInput('')
        setSearch('')
        setCurrentPage(1)
    }

    const unduhExcel = async () => {
        setMengunduh(true)
        try {
            await rekapPajakService.exportExcel(rentang)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(false)
        }
    }

    const r = rekap?.ringkasan
    const kurangBayar = r?.ppn_kurang_bayar ?? 0
    const jenisTampil = URUTAN_JENIS.filter(j => j !== 'pajak_lain' || (r?.pajak_lain.jumlah ?? 0) > 0 || jenis === 'pajak_lain')
    const meta = META_JENIS[jenis]

    const kartu = r ? [
        {
            label: 'PPN Keluaran', nilai: r.ppn_keluaran.pajak, catatan: `${formatNum(r.ppn_keluaran.jumlah)} baris · DPP ${formatRupiah(r.ppn_keluaran.dpp)}`,
            icon: <PiArrowCircleUpDuotone className="text-3xl text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400',
        },
        {
            label: 'PPN Masukan', nilai: r.ppn_masukan.pajak, catatan: `${formatNum(r.ppn_masukan.jumlah)} baris · DPP ${formatRupiah(r.ppn_masukan.dpp)}`,
            icon: <PiArrowCircleDownDuotone className="text-3xl text-indigo-500" />, bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400',
        },
        kurangBayar === 0
            ? {
                label: 'PPN Nihil', nilai: 0, catatan: 'keluaran sama dengan masukan — tidak ada yang disetor',
                icon: <PiScalesDuotone className="text-3xl text-gray-500" />, bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-600 dark:text-gray-300',
            }
            : {
                label: kurangBayar > 0 ? 'PPN Kurang Bayar' : 'PPN Lebih Bayar', nilai: Math.abs(kurangBayar),
                catatan: kurangBayar > 0 ? 'keluaran dikurangi masukan — perlu disetor' : 'masukan melebihi keluaran — bisa dikompensasi',
                icon: <PiScalesDuotone className={`text-3xl ${kurangBayar > 0 ? 'text-red-500' : 'text-emerald-500'}`} />,
                bg: kurangBayar > 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10',
                text: kurangBayar > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
            },
        {
            label: 'PPh Dipotong dari Vendor', nilai: r.pph_vendor.pajak, catatan: `${formatNum(r.pph_vendor.jumlah)} invoice — wajib disetor`,
            icon: <PiHandCoinsDuotone className="text-3xl text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400',
        },
        {
            label: 'PPh 21 Karyawan', nilai: r.pph21.pajak, catatan: `${formatNum(r.pph21.jumlah)} slip gaji — wajib disetor`,
            icon: <PiUsersDuotone className="text-3xl text-orange-500" />, bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400',
        },
        {
            label: 'PPh Dipotong oleh Klien', nilai: r.pph_dipotong_klien.pajak, catatan: `${formatNum(r.pph_dipotong_klien.jumlah)} pembayaran — kredit pajak`,
            icon: <PiReceiptDuotone className="text-3xl text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400',
        },
    ] : []

    const columns: ColumnDef<BarisPajak>[] = [
        { header: 'No', id: 'no', size: 50,
            cell: ({ row }: CellContext<BarisPajak, unknown>) => (currentPage - 1) * pageSize + row.index + 1 },
        { header: 'Tanggal', accessorKey: 'tanggal', size: 120,
            cell: ({ row }: CellContext<BarisPajak, unknown>) => <span className="whitespace-nowrap">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span> },
        { header: jenis === 'pph21' ? 'Periode Payroll' : 'Nomor', accessorKey: 'nomor', size: 200,
            cell: ({ row }: CellContext<BarisPajak, unknown>) => (
                <div className="flex flex-col items-start">
                    <a href={row.original.link} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono font-semibold text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        {row.original.nomor} <HiOutlineExternalLink className="text-xs" />
                    </a>
                    <span className="text-xs text-gray-400">{row.original.sumber}</span>
                </div>
            ),
        },
        { header: meta.pihak, accessorKey: 'pihak', size: 220,
            cell: ({ row }: CellContext<BarisPajak, unknown>) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.pihak ?? '—'}</span>
                    {row.original.npwp && <span className="font-mono text-xs text-gray-400">NPWP {row.original.npwp}</span>}
                </div>
            ),
        },
        { header: 'Keterangan', accessorKey: 'keterangan', size: 200,
            cell: ({ row }: CellContext<BarisPajak, unknown>) => row.original.keterangan
                ? (
                    <Tooltip title={row.original.keterangan}>
                        <span className="block truncate max-w-52">{row.original.keterangan}</span>
                    </Tooltip>
                )
                : <span className="text-gray-400">—</span>,
        },
        { header: meta.dasar, accessorKey: 'dpp', size: 150,
            cell: ({ row }: CellContext<BarisPajak, unknown>) => <span className="tabular-nums whitespace-nowrap">{formatRupiah(row.original.dpp)}</span> },
        { header: 'Tarif', accessorKey: 'tarif', size: 80,
            cell: ({ row }: CellContext<BarisPajak, unknown>) => row.original.tarif !== null
                ? <span className="tabular-nums">{formatNum(row.original.tarif, Number.isInteger(row.original.tarif) ? 0 : 2)}%</span>
                : <span className="text-gray-400">—</span>,
        },
        { header: 'Pajak', accessorKey: 'pajak', size: 150,
            cell: ({ row }: CellContext<BarisPajak, unknown>) => <span className="tabular-nums font-semibold whitespace-nowrap">{formatRupiah(row.original.pajak)}</span> },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Rekap Pajak</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                    Rekap PPN dan PPh per masa pajak dari invoice klien, invoice vendor, pembelian, dan payroll — bahan pelaporan SPT Masa
                </p>
            </div>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                    <div className="w-44 shrink-0">
                        <Select<Opsi> isSearchable={false} options={OPSI_MASA}
                            value={OPSI_MASA.find(o => o.value === masa) ?? null}
                            onChange={opt => gantiMasa((opt as Opsi).value)} />
                    </div>
                    <div className="w-28 shrink-0">
                        <Select<Opsi> isSearchable={false} options={OPSI_TAHUN}
                            value={OPSI_TAHUN.find(o => o.value === tahun) ?? null}
                            onChange={opt => gantiTahun((opt as Opsi).value)} />
                    </div>
                    {rekap && <span className="text-sm text-gray-500">{rekap.periode.label}</span>}
                    {loading && <Spinner size={20} />}
                    <div className="flex-1" />
                    <Button size="sm" variant="solid" icon={<HiOutlineDownload />} loading={mengunduh} disabled={!rekap} onClick={unduhExcel}>
                        Unduh Excel
                    </Button>
                </div>
            </Card>

            {!rekap || !r ? (
                <div className="flex justify-center py-16">
                    {loading ? <Spinner size={32} /> : <p className="text-gray-400 text-sm">Rekap pajak tidak tersedia.</p>}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {kartu.map(k => (
                            <Card key={k.label} className={k.bg}>
                                <div className="flex flex-col gap-2">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>{k.icon}</div>
                                    <div className={`font-bold text-lg tabular-nums ${k.text}`}>{formatRupiah(k.nilai)}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{k.label}</div>
                                    <div className="text-xs text-gray-400">{k.catatan}</div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {r.invoice_tanpa_pajak.jumlah > 0 && (
                        <Alert type="warning" showIcon>
                            {formatNum(r.invoice_tanpa_pajak.jumlah)} invoice klien senilai {formatRupiah(r.invoice_tanpa_pajak.dpp)} tidak memuat
                            baris pajak, jadi tidak ikut PPN Keluaran. Bila seharusnya kena PPN, lengkapi pajaknya di invoice tersebut.
                        </Alert>
                    )}
                    {r.pajak_lain.jumlah > 0 && (
                        <Alert type="warning" showIcon>
                            Ada {formatNum(r.pajak_lain.jumlah)} baris pajak di invoice klien senilai {formatRupiah(r.pajak_lain.pajak)} yang namanya
                            bukan PPN. Rinciannya ada di tab Pajak Lain.
                        </Alert>
                    )}
                    {r.potongan_lain_klien.jumlah > 0 && (
                        <Alert type="info" showIcon>
                            {formatNum(r.potongan_lain_klien.jumlah)} potongan pembayaran klien senilai {formatRupiah(r.potongan_lain_klien.nominal)} tidak
                            dihitung sebagai PPh karena keterangannya tidak memuat kata &quot;PPh&quot; (misalnya biaya transfer).
                        </Alert>
                    )}

                    {rekap.per_masa.length > 1 && (
                        <Card bodyClass="p-0">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                <p className="font-semibold">Rekap per Masa Pajak</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-50 dark:bg-blue-500/10">
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <th className={TH}>Masa</th>
                                            <th className={`${TH} text-right`}>PPN Keluaran</th>
                                            <th className={`${TH} text-right`}>PPN Masukan</th>
                                            <th className={`${TH} text-right`}>Kurang / (Lebih) Bayar</th>
                                            <th className={`${TH} text-right`}>PPh Vendor</th>
                                            <th className={`${TH} text-right`}>PPh 21</th>
                                            <th className={`${TH} text-right`}>PPh Dipotong Klien</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {rekap.per_masa.map(m => (
                                            <tr key={m.masa}>
                                                <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{m.label}</td>
                                                <td className="py-2.5 px-4 text-right tabular-nums">{formatRupiah(m.ppn_keluaran)}</td>
                                                <td className="py-2.5 px-4 text-right tabular-nums">{formatRupiah(m.ppn_masukan)}</td>
                                                <td className={`py-2.5 px-4 text-right tabular-nums font-semibold ${m.ppn_kurang_bayar > 0 ? 'text-red-500 dark:text-red-400' : m.ppn_kurang_bayar < 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                                                    {m.ppn_kurang_bayar < 0 ? `(${formatRupiah(Math.abs(m.ppn_kurang_bayar))})` : formatRupiah(m.ppn_kurang_bayar)}
                                                </td>
                                                <td className="py-2.5 px-4 text-right tabular-nums">{formatRupiah(m.pph_vendor)}</td>
                                                <td className="py-2.5 px-4 text-right tabular-nums">{formatRupiah(m.pph21)}</td>
                                                <td className="py-2.5 px-4 text-right tabular-nums">{formatRupiah(m.pph_dipotong_klien)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                                            <td className="py-2.5 px-4">Total</td>
                                            <td className="py-2.5 px-4 text-right tabular-nums">{formatRupiah(r.ppn_keluaran.pajak)}</td>
                                            <td className="py-2.5 px-4 text-right tabular-nums">{formatRupiah(r.ppn_masukan.pajak)}</td>
                                            <td className="py-2.5 px-4 text-right tabular-nums">
                                                {kurangBayar < 0 ? `(${formatRupiah(Math.abs(kurangBayar))})` : formatRupiah(kurangBayar)}
                                            </td>
                                            <td className="py-2.5 px-4 text-right tabular-nums">{formatRupiah(r.pph_vendor.pajak)}</td>
                                            <td className="py-2.5 px-4 text-right tabular-nums">{formatRupiah(r.pph21.pajak)}</td>
                                            <td className="py-2.5 px-4 text-right tabular-nums">{formatRupiah(r.pph_dipotong_klien.pajak)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    <Card bodyClass="p-0">
                        <div className="px-4 pt-3">
                            <Tabs value={jenis} onChange={val => gantiJenis(val as JenisPajak)}>
                                <Tabs.TabList>
                                    {jenisTampil.map(j => (
                                        <Tabs.TabNav key={j} value={j}>
                                            {META_JENIS[j].tab}
                                            <span className="ml-1.5 text-xs text-gray-400">{formatNum(r[j].jumlah)}</span>
                                        </Tabs.TabNav>
                                    ))}
                                </Tabs.TabList>
                            </Tabs>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <Input
                                className="flex-1 min-w-60"
                                maxLength={100}
                                placeholder={`Cari nomor, ${meta.pihak.toLowerCase()}, atau NPWP... (tekan Enter)`}
                                suffix={
                                    searchInput
                                        ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setSearchInput(''); setSearch(''); setCurrentPage(1) }} />
                                        : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setSearch(searchInput.trim()); setCurrentPage(1) }} />
                                }
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput.trim()); setCurrentPage(1) } }}
                            />
                            {rincian && (
                                <div className="text-sm text-gray-500 whitespace-nowrap">
                                    {meta.dasar} <span className="font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{formatRupiah(rincian.total.dpp)}</span>
                                    {' · '}Pajak <span className="font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{formatRupiah(rincian.total.pajak)}</span>
                                </div>
                            )}
                        </div>
                        <p className="px-4 pb-3 text-xs text-gray-400">{meta.catatan}</p>
                        <DataTable
                            columns={columns}
                            data={(rincian?.data ?? []) as unknown[]}
                            loading={loadingRincian}
                            noData={!loadingRincian && (rincian?.data.length ?? 0) === 0}
                            pagingData={{ total: rincian?.meta.total ?? 0, pageIndex: currentPage, pageSize }}
                            onPaginationChange={setCurrentPage}
                            onSelectChange={size => { setPageSize(size); setCurrentPage(1) }}
                        />
                    </Card>
                </>
            )}
        </div>
    )
}
