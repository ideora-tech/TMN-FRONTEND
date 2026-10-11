'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Alert, Card, Button, Input, Tooltip, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import { HiOutlineSearch, HiOutlineX, HiOutlineDownload, HiOutlineExternalLink, HiOutlinePaperClip } from 'react-icons/hi'
import { PiCoinsDuotone, PiReceiptDuotone, PiHandCoinsDuotone, PiScissorsDuotone } from 'react-icons/pi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { laporanPemasukanService, BarisPemasukan, LaporanPemasukan } from '@/services/laporanPemasukan.service'

type Opsi = { value: string; label: string }

const TH = 'py-2.5 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'
const BATAS_KATEGORI = 6

export default function LaporanPemasukanPage() {
    const { klik } = usePratinjauBerkas()
    const [laporan, setLaporan] = useState<LaporanPemasukan | null>(null)
    const [loading, setLoading] = useState(true)
    const [mengunduh, setMengunduh] = useState(false)
    const [dari, setDari]     = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
    const [sampai, setSampai] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
    const [kategori, setKategori] = useState('')
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
            const res = await laporanPemasukanService.laporan(currentPage, pageSize, { dari, sampai, kategori, search })
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
    }, [currentPage, pageSize, dari, sampai, kategori, search])

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
            await laporanPemasukanService.exportExcel({ dari, sampai, kategori, search })
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
            label: 'Total Pemasukan', nilai: ringkasan.total_pemasukan, catatan: `${formatNum(ringkasan.jumlah_transaksi)} penerimaan pada periode ini`,
            icon: <PiCoinsDuotone className="text-3xl text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Dari Pembayaran Invoice', nilai: ringkasan.dari_invoice, catatan: 'uang yang dibayar klien',
            icon: <PiReceiptDuotone className="text-3xl text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400',
        },
        {
            label: 'Pemasukan Lain', nilai: ringkasan.pemasukan_lain, catatan: 'dicatat manual di Arus Kas',
            icon: <PiHandCoinsDuotone className="text-3xl text-indigo-500" />, bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400',
        },
        {
            label: 'Potongan oleh Klien', nilai: ringkasan.potongan_klien, catatan: 'mis. PPh — tidak diterima, tidak dihitung',
            icon: <PiScissorsDuotone className="text-3xl text-gray-500" />, bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-600 dark:text-gray-300',
        },
    ] : []

    const columns: ColumnDef<BarisPemasukan>[] = [
        { header: 'No', id: 'no', size: 50,
            cell: ({ row }: CellContext<BarisPemasukan, unknown>) => (currentPage - 1) * pageSize + row.index + 1 },
        { header: 'Tanggal', accessorKey: 'tanggal', size: 150,
            cell: ({ row }: CellContext<BarisPemasukan, unknown>) => (
                <div className="flex flex-col">
                    <span className="whitespace-nowrap">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>
                    <span className="font-mono text-xs text-gray-400">{row.original.nomor}</span>
                </div>
            ),
        },
        { header: 'Kategori', accessorKey: 'label_kategori', size: 200 },
        { header: 'Diterima Dari', accessorKey: 'pihak', size: 190,
            cell: ({ row }: CellContext<BarisPemasukan, unknown>) => row.original.pihak || '—' },
        { header: 'Keterangan', accessorKey: 'keterangan', size: 240,
            cell: ({ row }: CellContext<BarisPemasukan, unknown>) => {
                const teks = [row.original.no_referensi, row.original.keterangan].filter(Boolean).join(' — ')
                return teks
                    ? (
                        <Tooltip title={teks}>
                            <span className="block truncate max-w-60">{teks}</span>
                        </Tooltip>
                    )
                    : <span className="text-gray-400">—</span>
            },
        },
        { header: 'Nominal', accessorKey: 'nominal', size: 170,
            cell: ({ row }: CellContext<BarisPemasukan, unknown>) => (
                <div className="flex flex-col">
                    <span className="tabular-nums font-semibold whitespace-nowrap">{formatRupiah(row.original.nominal)}</span>
                    {row.original.potongan > 0 && (
                        <span className="text-xs text-gray-400">
                            dipotong {formatRupiah(row.original.potongan)}{row.original.keterangan_potongan ? ` (${row.original.keterangan_potongan})` : ''}
                        </span>
                    )}
                </div>
            ),
        },
        { header: 'Dicatat Oleh', accessorKey: 'oleh', size: 130,
            cell: ({ row }: CellContext<BarisPemasukan, unknown>) => row.original.oleh ?? '—' },
        { header: 'Tautan', id: 'tautan', size: 190,
            cell: ({ row }: CellContext<BarisPemasukan, unknown>) => {
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
                <h3 className="font-bold">Laporan Pemasukan</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                    Semua uang yang benar-benar diterima — pembayaran invoice klien dan pemasukan lain — lengkap dengan tautan dokumen dan buktinya
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
                    {loading && <Spinner size={20} />}
                    <div className="flex-1" />
                    <Button size="sm" variant="solid" icon={<HiOutlineDownload />} loading={mengunduh} disabled={!laporan} onClick={unduhExcel}>
                        Unduh Excel
                    </Button>
                </div>
            </Card>

            {!laporan || !ringkasan ? (
                <div className="flex justify-center py-16">
                    {loading ? <Spinner size={32} /> : <p className="text-gray-400 text-sm">Laporan pemasukan tidak tersedia.</p>}
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

                    <Alert type="info" showIcon>
                        Laporan ini menghitung uang yang sudah diterima. Halaman{' '}
                        <a href={ROUTES.ARUS_KAS} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Arus Kas</a>{' '}
                        masih mencatat invoice sebagai pemasukan pada tanggal invoice, termasuk yang masih draft —{' '}
                        {ringkasan.invoice_terbit.jumlah > 0
                            ? <>untuk periode ini Arus Kas menghitung {formatNum(ringkasan.invoice_terbit.jumlah)} invoice senilai{' '}
                                <span className="font-semibold">{formatRupiah(ringkasan.invoice_terbit.total)}</span></>
                            : <>pada periode ini tidak ada invoice yang tercatat</>}
                        {' '}— jadi angka pemasukan dari klien di kedua halaman bisa berbeda.
                    </Alert>

                    <Card bodyClass="p-0">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                            <p className="font-semibold">Pemasukan per Kategori</p>
                            <p className="text-xs text-gray-400 mt-0.5">Klik baris untuk menyaring rincian di bawah — ringkasan ini tetap menampilkan seluruh kategori</p>
                        </div>
                        {perKategori.length === 0 ? (
                            <p className="text-gray-400 text-sm py-8 text-center">Tidak ada pemasukan pada periode ini.</p>
                        ) : (
                            <div className={`overflow-x-auto ${semuaKategori ? 'max-h-96 overflow-y-auto' : ''}`}>
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <th className={TH}>Kategori</th>
                                            <th className={`${TH} text-right`}>Transaksi</th>
                                            <th className={`${TH} text-right`}>Total</th>
                                            <th className={`${TH} text-right`}>Porsi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {kategoriTampil.map(k => (
                                            <tr key={k.kategori}
                                                className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${kategori === k.kategori ? 'bg-blue-50/60 dark:bg-blue-500/10' : ''}`}
                                                onClick={() => pilihKategori(k.kategori)}>
                                                <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">{k.label}</td>
                                                <td className="py-2.5 px-4 text-right tabular-nums">{formatNum(k.jumlah)}</td>
                                                <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{formatRupiah(k.total)}</td>
                                                <td className="py-2.5 px-4 text-right tabular-nums text-gray-500">
                                                    {ringkasan.total_pemasukan > 0 ? `${formatNum((k.total / ringkasan.total_pemasukan) * 100, 1)}%` : '—'}
                                                </td>
                                            </tr>
                                        ))}
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
                                <p className="font-semibold">Rincian Pemasukan</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {formatNum(laporan.rincian.jumlah)} baris · {formatRupiah(laporan.rincian.total)}
                                    {laporan.rincian.potongan > 0 && <> · dipotong klien {formatRupiah(laporan.rincian.potongan)}</>}
                                </p>
                            </div>
                            <div className="w-full sm:w-64 shrink-0">
                                <Select<Opsi> isSearchable={false} options={opsiKategori}
                                    value={opsiKategori.find(o => o.value === kategori) ?? opsiKategori[0]}
                                    onChange={opt => { setKategori((opt as Opsi | null)?.value ?? ''); setCurrentPage(1) }} />
                            </div>
                            <Input
                                className="flex-1 min-w-60"
                                maxLength={100}
                                placeholder="Cari nomor, pengirim, referensi, atau keterangan... (tekan Enter)"
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
