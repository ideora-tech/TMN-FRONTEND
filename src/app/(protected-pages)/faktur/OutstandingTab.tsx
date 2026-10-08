'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, Spinner, toast, Notification } from '@/components/ui'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlineDownload } from 'react-icons/hi'
import {
    PiCurrencyCircleDollarDuotone,
    PiClockCountdownDuotone,
    PiWarningCircleDuotone,
    PiFireDuotone,
    PiCalendarCheckDuotone,
} from 'react-icons/pi'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { fakturService, OutstandingFaktur, OutstandingFakturBaris } from '@/services/faktur.service'

type Opsi = { value: string; label: string }

const OPSI_KELOMPOK: Opsi[] = [
    { value: '',                  label: 'Semua Umur' },
    { value: 'terlambat',         label: 'Lewat Jatuh Tempo' },
    { value: 'belum_jatuh_tempo', label: 'Belum Jatuh Tempo' },
    { value: 'hari_1_30',         label: 'Terlambat 1-30 Hari' },
    { value: 'hari_31_60',        label: 'Terlambat 31-60 Hari' },
    { value: 'di_atas_60',        label: 'Terlambat > 60 Hari' },
]

const BATAS_KLIEN = 5
const TH = 'py-2.5 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

export default function OutstandingTab() {
    const router = useRouter()
    const [data, setData]       = useState<OutstandingFaktur | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]   = useState('')
    const [kelompok, setKelompok] = useState('')
    const [idKlien, setIdKlien] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [semuaKlien, setSemuaKlien] = useState(false)
    const [mengunduh, setMengunduh] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            setData(await fakturService.outstanding({
                page: currentPage, limit: pageSize,
                search: search || undefined, kelompok: kelompok || undefined, id_klien: idKlien || undefined,
            }))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, kelompok, idKlien])

    useEffect(() => { fetchData() }, [fetchData])

    const pilihKelompok = (nilai: string) => { setKelompok(k => (k === nilai ? '' : nilai)); setCurrentPage(1) }
    const pilihKlien = (nilai: string) => { setIdKlien(k => (k === nilai ? '' : nilai)); setCurrentPage(1) }

    const unduhExcel = async () => {
        if (mengunduh) return
        setMengunduh(true)
        try {
            const blob = await fakturService.unduhOutstanding({ search: search || undefined, kelompok: kelompok || undefined, id_klien: idKlien || undefined })
            const href = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = href
            link.download = `piutang-outstanding-${dayjs().format('YYYYMMDD')}.xlsx`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(false)
        }
    }

    if (!data) {
        return loading
            ? <div className="flex justify-center py-16"><Spinner size={32} /></div>
            : <p className="text-gray-400 text-sm py-10 text-center">Data outstanding tidak tersedia.</p>
    }

    const { ringkasan, per_klien: perKlien } = data
    const kartu = [
        {
            kunci: '', label: 'Total Outstanding', nilai: ringkasan.total_outstanding, jumlah: ringkasan.jumlah_invoice,
            icon: <PiCurrencyCircleDollarDuotone className="text-3xl text-blue-500" />,
            bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-400',
        },
        {
            kunci: 'belum_jatuh_tempo', label: 'Belum Jatuh Tempo', nilai: ringkasan.aging.belum_jatuh_tempo.nominal, jumlah: ringkasan.aging.belum_jatuh_tempo.jumlah,
            icon: <PiCalendarCheckDuotone className="text-3xl text-emerald-500" />,
            bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400',
        },
        {
            kunci: 'hari_1_30', label: 'Terlambat 1-30 Hari', nilai: ringkasan.aging.hari_1_30.nominal, jumlah: ringkasan.aging.hari_1_30.jumlah,
            icon: <PiClockCountdownDuotone className="text-3xl text-amber-500" />,
            bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-400',
        },
        {
            kunci: 'hari_31_60', label: 'Terlambat 31-60 Hari', nilai: ringkasan.aging.hari_31_60.nominal, jumlah: ringkasan.aging.hari_31_60.jumlah,
            icon: <PiWarningCircleDuotone className="text-3xl text-orange-500" />,
            bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-400',
        },
        {
            kunci: 'di_atas_60', label: 'Terlambat > 60 Hari', nilai: ringkasan.aging.di_atas_60.nominal, jumlah: ringkasan.aging.di_atas_60.jumlah,
            icon: <PiFireDuotone className="text-3xl text-red-500" />,
            bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-400',
        },
    ]

    const opsiKlien: Opsi[] = [
        { value: '', label: 'Semua Klien' },
        ...perKlien.filter(k => k.id_klien).map(k => ({ value: k.id_klien as string, label: k.nama_klien })),
    ]
    const klienTampil = semuaKlien ? perKlien : perKlien.slice(0, BATAS_KLIEN)

    const columns: ColumnDef<OutstandingFakturBaris>[] = [
        {
            header: 'Nomor Invoice', accessorKey: 'nomor_faktur', size: 190,
            cell: ({ row }: CellContext<OutstandingFakturBaris, unknown>) => <span className="font-mono font-semibold">{row.original.nomor_faktur}</span>,
        },
        {
            header: 'Klien', accessorKey: 'nama_klien', size: 200,
            cell: ({ row }: CellContext<OutstandingFakturBaris, unknown>) => (
                <div>
                    <div className="text-gray-800 dark:text-gray-200">{row.original.nama_klien ?? '-'}</div>
                    {row.original.nama_proyek && <div className="text-xs text-gray-400">{row.original.nama_proyek}</div>}
                </div>
            ),
        },
        {
            header: 'Jatuh Tempo', accessorKey: 'jatuh_tempo', size: 130,
            cell: ({ row }: CellContext<OutstandingFakturBaris, unknown>) => row.original.jatuh_tempo
                ? <span className={row.original.hari_terlambat > 0 ? 'text-red-500 font-medium' : ''}>{dayjs(row.original.jatuh_tempo).format('DD MMM YYYY')}</span>
                : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Terlambat', accessorKey: 'hari_terlambat', size: 110,
            cell: ({ row }: CellContext<OutstandingFakturBaris, unknown>) => row.original.hari_terlambat > 0
                ? <Tag className="bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-100">{formatNum(row.original.hari_terlambat)} hari</Tag>
                : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Total', accessorKey: 'total', size: 140,
            cell: ({ row }: CellContext<OutstandingFakturBaris, unknown>) => <span className="tabular-nums">{formatRupiah(row.original.total)}</span>,
        },
        {
            header: 'Dibayar', accessorKey: 'terbayar', size: 140,
            cell: ({ row }: CellContext<OutstandingFakturBaris, unknown>) => <span className="tabular-nums">{formatRupiah(row.original.terbayar)}</span>,
        },
        {
            header: 'Sisa', accessorKey: 'sisa', size: 140,
            cell: ({ row }: CellContext<OutstandingFakturBaris, unknown>) => <span className="tabular-nums font-semibold">{formatRupiah(row.original.sisa)}</span>,
        },
        {
            header: '', id: 'action', size: 60,
            cell: ({ row }: CellContext<OutstandingFakturBaris, unknown>) => (
                <Tooltip title="Detail">
                    <span
                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                        onClick={() => router.push(ROUTES.FAKTUR_DETAIL(row.original.id_faktur))}
                    >
                        <HiOutlineEye className="text-lg" />
                    </span>
                </Tooltip>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {kartu.map(k => {
                    const aktif = k.kunci !== '' && kelompok === k.kunci
                    return (
                        <Card key={k.label} clickable={k.kunci !== ''} onClick={k.kunci !== '' ? () => pilihKelompok(k.kunci) : undefined}
                            className={`${k.bg} transition-shadow ${aktif ? `ring-2 ${k.ring}` : ''}`}>
                            <div className="flex flex-col gap-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>{k.icon}</div>
                                <div className={`font-bold text-lg ${k.text}`}>{formatRupiah(k.nilai)}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{k.label} · {formatNum(k.jumlah)} invoice</div>
                            </div>
                        </Card>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Lewat Jatuh Tempo</p>
                    <p className="font-bold text-lg tabular-nums text-red-500 dark:text-red-400">{formatRupiah(ringkasan.lewat_jatuh_tempo.nominal)}</p>
                    <p className="text-xs text-gray-400">{formatNum(ringkasan.lewat_jatuh_tempo.jumlah)} invoice perlu ditagih</p>
                </Card>
                <Card>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Jatuh Tempo dalam 7 Hari</p>
                    <p className="font-bold text-lg tabular-nums text-amber-600 dark:text-amber-400">{formatRupiah(ringkasan.jatuh_tempo_7_hari.nominal)}</p>
                    <p className="text-xs text-gray-400">{formatNum(ringkasan.jatuh_tempo_7_hari.jumlah)} invoice</p>
                </Card>
                <Card>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Diterima Bulan Ini</p>
                    <p className="font-bold text-lg tabular-nums text-emerald-600 dark:text-emerald-400">{formatRupiah(ringkasan.diterima_bulan_ini)}</p>
                    <p className="text-xs text-gray-400">uang masuk dari klien</p>
                </Card>
            </div>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-semibold">Outstanding per Klien</p>
                    <p className="text-xs text-gray-400 mt-0.5">Klik baris untuk menyaring daftar invoice di bawah</p>
                </div>
                {perKlien.length === 0 ? (
                    <p className="text-gray-400 text-sm py-8 text-center">Tidak ada piutang outstanding.</p>
                ) : (
                    <div className={`overflow-x-auto ${semuaKlien ? 'max-h-96 overflow-y-auto' : ''}`}>
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className={TH}>Klien</th>
                                    <th className={`${TH} text-right`}>Invoice</th>
                                    <th className={`${TH} text-right`}>Outstanding</th>
                                    <th className={`${TH} text-right`}>Lewat Jatuh Tempo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {klienTampil.map(k => {
                                    const aktif = !!k.id_klien && idKlien === k.id_klien
                                    return (
                                        <tr key={k.id_klien ?? 'tanpa-klien'}
                                            className={`transition-colors ${k.id_klien ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''} ${aktif ? 'bg-blue-50/60 dark:bg-blue-500/10' : ''}`}
                                            onClick={() => k.id_klien && pilihKlien(k.id_klien)}>
                                            <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">{k.nama_klien}</td>
                                            <td className="py-2.5 px-4 text-right tabular-nums">{formatNum(k.jumlah)}</td>
                                            <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{formatRupiah(k.outstanding)}</td>
                                            <td className={`py-2.5 px-4 text-right tabular-nums ${k.terlambat > 0 ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400'}`}>
                                                {k.terlambat > 0 ? formatRupiah(k.terlambat) : '—'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {perKlien.length > BATAS_KLIEN && (
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                        <button type="button" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline" onClick={() => setSemuaKlien(v => !v)}>
                            {semuaKlien ? 'Tampilkan 5 teratas' : `Tampilkan semua (${formatNum(perKlien.length)} klien)`}
                        </button>
                    </div>
                )}
            </Card>

            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nomor invoice / klien... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setSearchInput(''); setSearch(''); setCurrentPage(1) }} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setSearch(searchInput); setCurrentPage(1) }} />
                        }
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setCurrentPage(1) } }}
                    />
                    <div className="w-full sm:w-52 shrink-0">
                        <Select<Opsi> options={opsiKlien}
                            value={opsiKlien.find(o => o.value === idKlien) ?? opsiKlien[0]}
                            onChange={opt => { setIdKlien((opt as Opsi).value); setCurrentPage(1) }} />
                    </div>
                    <div className="w-full sm:w-52 shrink-0">
                        <Select<Opsi> isSearchable={false} options={OPSI_KELOMPOK}
                            value={OPSI_KELOMPOK.find(o => o.value === kelompok) ?? OPSI_KELOMPOK[0]}
                            onChange={opt => { setKelompok((opt as Opsi).value); setCurrentPage(1) }} />
                    </div>
                    <Button size="sm" variant="solid" icon={<HiOutlineDownload />} loading={mengunduh} onClick={unduhExcel}>
                        Unduh Excel
                    </Button>
                </div>
                <DataTable
                    columns={columns}
                    data={data.data as unknown[]}
                    loading={loading}
                    noData={!loading && data.data.length === 0}
                    pagingData={{ total: data.meta.total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>
        </div>
    )
}
