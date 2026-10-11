'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Card, Button, Input, Tag, Tooltip, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import { HiOutlineSearch, HiOutlineX, HiOutlineDownload, HiOutlineExternalLink, HiOutlinePaperClip } from 'react-icons/hi'
import { PiReceiptDuotone, PiBankDuotone, PiPiggyBankDuotone, PiArrowsLeftRightDuotone } from 'react-icons/pi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { laporanPengeluaranService, BarisPengeluaran, LaporanPengeluaran } from '@/services/laporanPengeluaran.service'

type Opsi = { value: string; label: string }

const TH = 'py-2.5 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'
const BATAS_KATEGORI = 6

const OPSI_SUMBER_DANA: Opsi[] = [
    { value: '', label: 'Semua Sumber Dana' },
    { value: 'rekening', label: 'Rekening' },
    { value: 'kas_kecil', label: 'Kas Kecil' },
]

const TAG_SUMBER_DANA: Record<string, string> = {
    rekening:  'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    kas_kecil: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
}

const TAG_MUTASI = 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'

export default function LaporanPengeluaranPage() {
    const { klik } = usePratinjauBerkas()
    const [laporan, setLaporan] = useState<LaporanPengeluaran | null>(null)
    const [loading, setLoading] = useState(true)
    const [mengunduh, setMengunduh] = useState(false)
    const [dari, setDari]     = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
    const [sampai, setSampai] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
    const [sumberDana, setSumberDana] = useState('')
    const [kategori, setKategori]     = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [semuaKategori, setSemuaKategori] = useState(false)

    const permintaanTerbaru = useRef(0)

    const fetchData = useCallback(async () => {
        if (!dari || !sampai) return
        const urutan = ++permintaanTerbaru.current
        setLoading(true)
        try {
            const res = await laporanPengeluaranService.laporan(currentPage, pageSize, {
                dari, sampai, sumber_dana: sumberDana, kategori, search,
            })
            if (urutan !== permintaanTerbaru.current) return
            if (res.data.length === 0 && currentPage > 1 && res.meta.total > 0) {
                setCurrentPage(res.meta.totalPages)
                return
            }
            setLaporan(res)
        } catch (err) {
            if (urutan !== permintaanTerbaru.current) return
            setLaporan(null)
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (urutan === permintaanTerbaru.current) setLoading(false)
        }
    }, [currentPage, pageSize, dari, sampai, sumberDana, kategori, search])

    useEffect(() => { fetchData() }, [fetchData])

    const ubahDari = (nilai: string) => {
        setDari(nilai)
        if (nilai && sampai && nilai > sampai) setSampai(nilai)
        setCurrentPage(1)
    }
    const ubahSampai = (nilai: string) => {
        setSampai(nilai)
        if (nilai && dari && nilai < dari) setDari(nilai)
        setCurrentPage(1)
    }

    const pilihKategori = (nilai: string) => {
        setKategori(k => (k === nilai ? '' : nilai))
        setCurrentPage(1)
    }

    const unduhExcel = async () => {
        setMengunduh(true)
        try {
            await laporanPengeluaranService.exportExcel({ dari, sampai, sumber_dana: sumberDana, kategori, search })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(false)
        }
    }

    const opsiKategori: Opsi[] = [{ value: '', label: 'Semua Kategori' }, ...(laporan?.opsi_kategori ?? [])]
    const ringkasan = laporan?.ringkasan
    const perKategori = laporan?.per_kategori ?? []
    const kategoriTampil = semuaKategori ? perKategori : perKategori.slice(0, BATAS_KATEGORI)

    const kartu = ringkasan ? [
        {
            label: 'Total Pengeluaran', nilai: ringkasan.total_pengeluaran, catatan: `${formatNum(ringkasan.jumlah_transaksi)} transaksi pada periode ini`,
            icon: <PiReceiptDuotone className="text-3xl text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400',
        },
        {
            label: 'Dibayar dari Rekening', nilai: ringkasan.dari_rekening, catatan: 'transfer lewat Proses Pembayaran',
            icon: <PiBankDuotone className="text-3xl text-indigo-500" />, bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400',
        },
        {
            label: 'Dibayar dari Kas Kecil', nilai: ringkasan.dari_kas_kecil, catatan: 'pengeluaran tunai harian',
            icon: <PiPiggyBankDuotone className="text-3xl text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Pengisian Kas Kecil', nilai: ringkasan.mutasi_kas_kecil, catatan: 'pindah dana — tidak dihitung sebagai pengeluaran',
            icon: <PiArrowsLeftRightDuotone className="text-3xl text-gray-500" />, bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-600 dark:text-gray-300',
        },
    ] : []

    const columns: ColumnDef<BarisPengeluaran>[] = [
        { header: 'No', id: 'no', size: 50,
            cell: ({ row }: CellContext<BarisPengeluaran, unknown>) => (currentPage - 1) * pageSize + row.index + 1 },
        { header: 'Tanggal', accessorKey: 'tanggal', size: 150,
            cell: ({ row }: CellContext<BarisPengeluaran, unknown>) => (
                <div className="flex flex-col">
                    <span className="whitespace-nowrap">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>
                    <span className="font-mono text-xs text-gray-400">{row.original.nomor}</span>
                </div>
            ),
        },
        { header: 'Kategori', accessorKey: 'label_kategori', size: 220,
            cell: ({ row }: CellContext<BarisPengeluaran, unknown>) => (
                <div className="flex flex-col items-start gap-1">
                    <span>{row.original.label_kategori}</span>
                    <div className="flex flex-wrap items-center gap-1">
                        <Tag className={`text-[10px] font-semibold ${TAG_SUMBER_DANA[row.original.sumber_dana] ?? TAG_MUTASI}`}>
                            {row.original.label_sumber_dana}
                        </Tag>
                        {row.original.mutasi && (
                            <Tooltip title="Pindah dana dari rekening ke kas kecil — tidak dihitung sebagai pengeluaran">
                                <Tag className={`text-[10px] font-semibold ${TAG_MUTASI}`}>Pindah dana</Tag>
                            </Tooltip>
                        )}
                    </div>
                </div>
            ),
        },
        { header: 'Penerima', accessorKey: 'penerima', size: 180,
            cell: ({ row }: CellContext<BarisPengeluaran, unknown>) => row.original.penerima || '—' },
        { header: 'Keterangan', accessorKey: 'keterangan', size: 240,
            cell: ({ row }: CellContext<BarisPengeluaran, unknown>) => row.original.keterangan
                ? (
                    <Tooltip title={row.original.keterangan}>
                        <span className="block truncate max-w-60">{row.original.keterangan}</span>
                    </Tooltip>
                )
                : <span className="text-gray-400">—</span>,
        },
        { header: 'Nominal', accessorKey: 'nominal', size: 150,
            cell: ({ row }: CellContext<BarisPengeluaran, unknown>) => (
                <span className={`tabular-nums font-semibold whitespace-nowrap ${row.original.mutasi ? 'text-gray-400' : ''}`}>
                    {formatRupiah(row.original.nominal)}
                </span>
            ),
        },
        { header: 'Diproses Oleh', accessorKey: 'oleh', size: 130,
            cell: ({ row }: CellContext<BarisPengeluaran, unknown>) => row.original.oleh ?? '—' },
        { header: 'Tautan', id: 'tautan', size: 210,
            cell: ({ row }: CellContext<BarisPengeluaran, unknown>) => {
                const b = row.original
                return (
                    <div className="flex flex-col items-start gap-1">
                        <a href={b.link_dokumen} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                            {b.label_dokumen} <HiOutlineExternalLink className="text-xs" />
                        </a>
                        {b.url_bukti ? (
                            <a href={b.url_bukti} target="_blank" rel="noreferrer"
                                onClick={klik(b.url_bukti, `Bukti ${b.nomor}`, `bukti-${b.nomor}`)}
                                className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-300 hover:underline whitespace-nowrap">
                                <HiOutlinePaperClip /> Lihat bukti
                            </a>
                        ) : (
                            <span className="text-xs text-gray-400">Tanpa bukti</span>
                        )}
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Laporan Pengeluaran</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                    Semua uang keluar yang sudah dibayar — dari rekening maupun kas kecil — lengkap dengan tautan dokumen dan buktinya
                </p>
            </div>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40" clearable={false}
                            value={dari ? dayjs(dari).toDate() : null}
                            onChange={date => ubahDari(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        <span className="text-gray-400 text-sm">s/d</span>
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40" clearable={false}
                            value={sampai ? dayjs(sampai).toDate() : null}
                            onChange={date => ubahSampai(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </div>
                    <div className="w-full sm:w-52 shrink-0">
                        <Select<Opsi> isSearchable={false} options={OPSI_SUMBER_DANA}
                            value={OPSI_SUMBER_DANA.find(o => o.value === sumberDana) ?? OPSI_SUMBER_DANA[0]}
                            onChange={opt => { setSumberDana((opt as Opsi | null)?.value ?? ''); setCurrentPage(1) }} />
                    </div>
                    {loading && <Spinner size={20} />}
                    <div className="flex-1" />
                    <Button size="sm" variant="solid" icon={<HiOutlineDownload />} loading={mengunduh} disabled={!laporan} onClick={unduhExcel}>
                        Unduh Excel
                    </Button>
                </div>
            </Card>

            {!laporan ? (
                <div className="flex justify-center py-16">
                    {loading ? <Spinner size={32} /> : <p className="text-gray-400 text-sm">Laporan pengeluaran tidak tersedia.</p>}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

                    <Card bodyClass="p-0">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                            <p className="font-semibold">Pengeluaran per Kategori</p>
                            <p className="text-xs text-gray-400 mt-0.5">Klik baris untuk menyaring rincian di bawah — ringkasan ini tetap menampilkan seluruh kategori</p>
                        </div>
                        {perKategori.length === 0 ? (
                            <p className="text-gray-400 text-sm py-8 text-center">Tidak ada pengeluaran pada periode ini.</p>
                        ) : (
                            <div className={`overflow-x-auto ${semuaKategori ? 'max-h-96 overflow-y-auto' : ''}`}>
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <th className={TH}>Kategori</th>
                                            <th className={TH}>Sumber Dana</th>
                                            <th className={`${TH} text-right`}>Transaksi</th>
                                            <th className={`${TH} text-right`}>Total</th>
                                            <th className={`${TH} text-right`}>Porsi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {kategoriTampil.map(k => {
                                            const aktif = kategori === k.nilai_filter
                                            const porsi = !k.mutasi && ringkasan && ringkasan.total_pengeluaran > 0
                                                ? `${formatNum((k.total / ringkasan.total_pengeluaran) * 100, 1)}%`
                                                : '—'
                                            return (
                                                <tr key={`${k.kategori}-${k.sub_kategori ?? ''}`}
                                                    className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${aktif ? 'bg-blue-50/60 dark:bg-blue-500/10' : ''}`}
                                                    onClick={() => pilihKategori(k.nilai_filter)}>
                                                    <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">
                                                        {k.label}
                                                        {k.mutasi && <Tag className={`ml-2 text-[10px] font-semibold ${TAG_MUTASI}`}>Pindah dana</Tag>}
                                                    </td>
                                                    <td className="py-2.5 px-4">{k.label_sumber_dana}</td>
                                                    <td className="py-2.5 px-4 text-right tabular-nums">{formatNum(k.jumlah)}</td>
                                                    <td className={`py-2.5 px-4 text-right tabular-nums font-semibold ${k.mutasi ? 'text-gray-400' : ''}`}>{formatRupiah(k.total)}</td>
                                                    <td className="py-2.5 px-4 text-right tabular-nums text-gray-500">{porsi}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {perKategori.length > BATAS_KATEGORI && (
                            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                                <button type="button" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline" onClick={() => setSemuaKategori(v => !v)}>
                                    {semuaKategori ? `Tampilkan ${BATAS_KATEGORI} teratas` : `Tampilkan semua (${formatNum(perKategori.length)} kategori)`}
                                </button>
                            </div>
                        )}
                    </Card>

                    <Card bodyClass="p-0">
                        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <div className="shrink-0">
                                <p className="font-semibold">Rincian Pengeluaran</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {formatNum(laporan.rincian.jumlah)} baris · {formatRupiah(laporan.rincian.total)}
                                    {laporan.rincian.mutasi > 0 && <> · pindah dana {formatRupiah(laporan.rincian.mutasi)} tidak dihitung</>}
                                </p>
                            </div>
                            <div className="w-full sm:w-64 shrink-0">
                                <Select<Opsi> options={opsiKategori}
                                    value={opsiKategori.find(o => o.value === kategori) ?? opsiKategori[0]}
                                    onChange={opt => { setKategori((opt as Opsi | null)?.value ?? ''); setCurrentPage(1) }} />
                            </div>
                            <Input
                                className="flex-1 min-w-60"
                                maxLength={100}
                                placeholder="Cari nomor, penerima, atau keterangan... (tekan Enter)"
                                suffix={
                                    searchInput
                                        ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setSearchInput(''); setSearch(''); setCurrentPage(1) }} />
                                        : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setSearch(searchInput.trim()); setCurrentPage(1) }} />
                                }
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput.trim()); setCurrentPage(1) } }}
                            />
                        </div>
                        <DataTable
                            columns={columns}
                            data={laporan.data as unknown[]}
                            loading={loading}
                            noData={!loading && laporan.data.length === 0}
                            pagingData={{ total: laporan.meta.total, pageIndex: currentPage, pageSize }}
                            onPaginationChange={setCurrentPage}
                            onSelectChange={size => { setPageSize(size); setCurrentPage(1) }}
                        />
                    </Card>
                </>
            )}
        </div>
    )
}
