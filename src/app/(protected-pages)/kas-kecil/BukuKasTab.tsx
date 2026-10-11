'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Card, Button, Input, Tag, Tooltip, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import {
    HiOutlineSearch, HiOutlineX, HiOutlineTrash, HiOutlineEye, HiOutlinePencilAlt,
    HiOutlineDocumentDownload, HiOutlinePaperClip,
} from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kasKecilService, BukuKasKecil, OpsiKategoriKasKecil, TransaksiKasKecil } from '@/services/kasKecil.service'
import { JENIS_TRANSAKSI_TAG, OpsiTeks } from './kasKecilMeta'

const ARAH_OPTIONS: OpsiTeks[] = [
    { value: '', label: 'Semua Arah' },
    { value: 'masuk', label: 'Masuk' },
    { value: 'keluar', label: 'Keluar' },
]

const AKSI_CLASS = 'cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors'
const AKSI_BIRU = `${AKSI_CLASS} bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30`
const AKSI_MERAH = `${AKSI_CLASS} bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30`

type Props = {
    opsiKategori: OpsiKategoriKasKecil[]
    bolehSaldoAwal: boolean
    cariAwal: string
    tanggalAwal: string
    onBerubah: () => void
}

export default function BukuKasTab({ opsiKategori, bolehSaldoAwal, cariAwal, tanggalAwal, onBerubah }: Props) {
    const router = useRouter()
    const { klik } = usePratinjauBerkas()
    const acuan = tanggalAwal && dayjs(tanggalAwal).isValid() ? dayjs(tanggalAwal) : dayjs()

    const [buku, setBuku]       = useState<BukuKasKecil | null>(null)
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting]   = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [dari, setDari]     = useState(acuan.startOf('month').format('YYYY-MM-DD'))
    const [sampai, setSampai] = useState(acuan.endOf('month').format('YYYY-MM-DD'))
    const [arah, setArah]         = useState('')
    const [kategori, setKategori] = useState('')
    const [searchInput, setSearchInput] = useState(cariAwal)
    const [search, setSearch]           = useState(cariAwal)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [hapusTarget, setHapusTarget] = useState<TransaksiKasKecil | null>(null)

    const permintaanTerbaru = useRef(0)

    const kategoriOptions: OpsiTeks[] = [{ value: '', label: 'Semua Kategori' }, ...opsiKategori]

    const fetchData = useCallback(async () => {
        if (!dari || !sampai) return
        const urutan = ++permintaanTerbaru.current
        setLoading(true)
        try {
            const res = await kasKecilService.buku(currentPage, pageSize, { dari, sampai, arah, kategori, search })
            if (urutan !== permintaanTerbaru.current) return
            if (res.data.length === 0 && currentPage > 1 && res.meta.total > 0) {
                setCurrentPage(res.meta.totalPages)
                return
            }
            setBuku(res)
        } catch (err) {
            if (urutan !== permintaanTerbaru.current) return
            setBuku(null)
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (urutan === permintaanTerbaru.current) setLoading(false)
        }
    }, [currentPage, pageSize, dari, sampai, arah, kategori, search])

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

    const handleSearchSubmit = () => { setSearch(searchInput.trim()); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleExport = async () => {
        setExporting(true)
        try {
            await kasKecilService.exportBuku({ dari, sampai })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setExporting(false)
        }
    }

    const handleHapus = async () => {
        if (!hapusTarget) return
        setSubmitting(true)
        try {
            if (hapusTarget.jenis === 'saldo_awal') {
                await kasKecilService.hapusSaldoAwal()
            } else {
                await kasKecilService.deletePengeluaran(hapusTarget.id_transaksi)
            }
            toast.push(<Notification type="success" title={hapusTarget.jenis === 'saldo_awal' ? 'Saldo awal berhasil dihapus' : 'Pengeluaran berhasil dihapus'} />)
            setHapusTarget(null)
            fetchData()
            onBerubah()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setHapusTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<TransaksiKasKecil>[] = [
        { header: 'No', id: 'no', size: 50,
            cell: ({ row }: CellContext<TransaksiKasKecil, unknown>) => (currentPage - 1) * pageSize + row.index + 1 },
        { header: 'Tanggal', accessorKey: 'tanggal', size: 150,
            cell: ({ row }: CellContext<TransaksiKasKecil, unknown>) => (
                <div className="flex flex-col">
                    <span className="whitespace-nowrap">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>
                    <span className="font-mono text-xs text-gray-400">{row.original.nomor_transaksi}</span>
                </div>
            ),
        },
        { header: 'Jenis', id: 'jenis', size: 200,
            cell: ({ row }: CellContext<TransaksiKasKecil, unknown>) => {
                const t = row.original
                return (
                    <div className="flex flex-col items-start gap-1">
                        <Tag className={`text-xs font-semibold ${JENIS_TRANSAKSI_TAG[t.jenis]}`}>
                            {t.jenis === 'pengeluaran' ? (t.label_kategori ?? 'Pengeluaran') : t.label_jenis}
                        </Tag>
                        {t.jenis === 'pengeluaran' && !t.url_bukti && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">Tanpa bukti</span>
                        )}
                    </div>
                )
            },
        },
        { header: 'Keterangan', accessorKey: 'keterangan', size: 260,
            cell: ({ row }: CellContext<TransaksiKasKecil, unknown>) => (
                <div className="flex flex-col">
                    <Tooltip title={row.original.keterangan}>
                        <span className="block truncate max-w-64">{row.original.keterangan}</span>
                    </Tooltip>
                    {row.original.penerima && (
                        <span className="text-xs text-gray-400 truncate max-w-64">kepada {row.original.penerima}</span>
                    )}
                </div>
            ),
        },
        { header: 'Masuk', id: 'masuk', size: 130,
            cell: ({ row }: CellContext<TransaksiKasKecil, unknown>) => row.original.arah === 'masuk'
                ? <span className="tabular-nums font-semibold whitespace-nowrap text-emerald-600 dark:text-emerald-400">{formatRupiah(row.original.nominal)}</span>
                : <span className="text-gray-300 dark:text-gray-600">—</span>,
        },
        { header: 'Keluar', id: 'keluar', size: 130,
            cell: ({ row }: CellContext<TransaksiKasKecil, unknown>) => row.original.arah === 'keluar'
                ? <span className="tabular-nums font-semibold whitespace-nowrap text-red-500 dark:text-red-400">{formatRupiah(row.original.nominal)}</span>
                : <span className="text-gray-300 dark:text-gray-600">—</span>,
        },
        { header: 'Saldo', accessorKey: 'saldo', size: 140,
            cell: ({ row }: CellContext<TransaksiKasKecil, unknown>) => (
                <span className="tabular-nums whitespace-nowrap">{formatRupiah(row.original.saldo)}</span>
            ),
        },
        { header: 'Dicatat Oleh', accessorKey: 'dicatat_oleh', size: 130,
            cell: ({ row }: CellContext<TransaksiKasKecil, unknown>) => row.original.dicatat_oleh ?? '—' },
        { header: '', id: 'aksi', size: 130,
            cell: ({ row }: CellContext<TransaksiKasKecil, unknown>) => {
                const t = row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        {t.url_bukti && (
                            <Tooltip title="Lihat Bukti">
                                <a href={t.url_bukti} target="_blank" rel="noreferrer"
                                    onClick={klik(t.url_bukti, `Bukti ${t.nomor_transaksi}`, `bukti-${t.nomor_transaksi}`)}
                                    className={`${AKSI_CLASS} bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30`}>
                                    <HiOutlinePaperClip className="text-lg" />
                                </a>
                            </Tooltip>
                        )}
                        {t.jenis === 'pengisian' && t.id_pengisian && (
                            <Tooltip title="Lihat Pengisian">
                                <span className={AKSI_BIRU} onClick={() => router.push(ROUTES.KAS_KECIL_PENGISIAN_DETAIL(t.id_pengisian as string))}>
                                    <HiOutlineEye className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {t.bisa_diubah && (
                            <>
                                <Tooltip title="Edit">
                                    <span className={AKSI_BIRU} onClick={() => router.push(ROUTES.KAS_KECIL_PENGELUARAN_EDIT(t.id_transaksi))}>
                                        <HiOutlinePencilAlt className="text-lg" />
                                    </span>
                                </Tooltip>
                                <Tooltip title="Hapus">
                                    <span className={AKSI_MERAH} onClick={() => setHapusTarget(t)}>
                                        <HiOutlineTrash className="text-lg" />
                                    </span>
                                </Tooltip>
                            </>
                        )}
                        {t.jenis === 'saldo_awal' && bolehSaldoAwal && (
                            <Tooltip title="Hapus Saldo Awal">
                                <span className={AKSI_MERAH} onClick={() => setHapusTarget(t)}>
                                    <HiOutlineTrash className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                    </div>
                )
            },
        },
    ]

    const filterAktif = !!(arah || kategori || search)

    const petak = buku ? [
        { label: 'Saldo Awal Periode', value: buku.saldo_awal, kelas: 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700', teks: '' },
        { label: 'Total Masuk', value: buku.total_masuk, kelas: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30', teks: 'text-emerald-600 dark:text-emerald-300' },
        { label: 'Total Keluar', value: buku.total_keluar, kelas: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30', teks: 'text-red-600 dark:text-red-300' },
        { label: 'Saldo Akhir Periode', value: buku.saldo_akhir, kelas: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30', teks: 'text-blue-600 dark:text-blue-300' },
    ] : []

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40" clearable={false}
                            value={dari ? dayjs(dari).toDate() : null}
                            onChange={date => ubahDari(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        <span className="text-gray-400 text-sm">s/d</span>
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40" clearable={false}
                            value={sampai ? dayjs(sampai).toDate() : null}
                            onChange={date => ubahSampai(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </div>
                    <div className="w-full sm:w-40 shrink-0">
                        <Select<OpsiTeks> isSearchable={false} options={ARAH_OPTIONS}
                            value={ARAH_OPTIONS.find(o => o.value === arah) ?? ARAH_OPTIONS[0]}
                            onChange={opt => { setArah((opt as OpsiTeks | null)?.value ?? ''); setCurrentPage(1) }} />
                    </div>
                    <div className="w-full sm:w-60 shrink-0">
                        <Select<OpsiTeks> isSearchable={false} options={kategoriOptions}
                            value={kategoriOptions.find(o => o.value === kategori) ?? kategoriOptions[0]}
                            onChange={opt => { setKategori((opt as OpsiTeks | null)?.value ?? ''); setCurrentPage(1) }} />
                    </div>
                    <Input className="flex-1 min-w-60" maxLength={100} placeholder="Cari nomor, penerima, atau keterangan... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }} />
                    {loading && <Spinner size={20} />}
                    <Tooltip title="Export seluruh Buku Kas periode ini (Excel)">
                        <Button size="sm" variant="default" icon={<HiOutlineDocumentDownload />}
                            disabled={!buku}
                            loading={exporting} onClick={handleExport} />
                    </Tooltip>
                </div>

                {buku && (
                    <div className="grid grid-cols-2 gap-3 px-4 py-3 lg:grid-cols-4">
                        {petak.map(p => (
                            <div key={p.label} className={`rounded-lg p-3 border ${p.kelas}`}>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{p.label}</p>
                                <p className={`font-bold text-base mt-1 tabular-nums ${p.teks}`}>{formatRupiah(p.value)}</p>
                            </div>
                        ))}
                    </div>
                )}

                {buku && filterAktif && (
                    <p className="px-4 pb-3 text-xs text-gray-500 dark:text-gray-400">
                        Tersaring {formatNum(buku.tersaring.jumlah)} transaksi — masuk{' '}
                        <span className="font-semibold">{formatRupiah(buku.tersaring.masuk)}</span>, keluar{' '}
                        <span className="font-semibold">{formatRupiah(buku.tersaring.keluar)}</span>.
                        {' '}Ringkasan di atas dan kolom Saldo tetap dihitung dari seluruh transaksi periode ini.
                    </p>
                )}

                <DataTable columns={columns} data={(buku?.data ?? []) as unknown[]} loading={loading}
                    noData={!loading && (buku?.data.length ?? 0) === 0}
                    pagingData={{ total: buku?.meta.total ?? 0, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }} />
            </Card>

            <ConfirmDialog isOpen={!!hapusTarget} type="danger"
                title={hapusTarget?.jenis === 'saldo_awal' ? 'Hapus Saldo Awal?' : 'Hapus Pengeluaran?'}
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting }}
                onClose={() => setHapusTarget(null)} onCancel={() => setHapusTarget(null)} onConfirm={handleHapus}>
                <p className="text-sm">
                    {hapusTarget?.jenis === 'saldo_awal'
                        ? <>Saldo awal sebesar <span className="font-semibold">{formatRupiah(hapusTarget?.nominal)}</span> akan dihapus dan saldo kas kecil berkurang.</>
                        : <>Pengeluaran <span className="font-semibold">{hapusTarget?.nomor_transaksi}</span> sebesar <span className="font-semibold">{formatRupiah(hapusTarget?.nominal)}</span> akan dihapus dan saldo kas kecil dikembalikan.</>}
                    {' '}Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>
        </div>
    )
}
