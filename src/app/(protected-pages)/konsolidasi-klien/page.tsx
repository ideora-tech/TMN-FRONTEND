'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import dayjs from 'dayjs'
import { Card, Button, Tag, Tooltip, Checkbox, Dialog, FormItem, Input, Pagination, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiOutlineDocumentDownload, HiOutlinePencilAlt, HiOutlineSearch, HiOutlineX, HiPlusCircle } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { klienService, Klien } from '@/services/klien.service'
import { konsolidasiKlienService, KonsolidasiKlienRekap, KonsolidasiKlienTrip, SiapTagihItem } from '@/services/konsolidasiKlien.service'
import { projectService, Project } from '@/services/project.service'
import { penagihanTripService } from '@/services/penagihanTrip.service'
import { TIPE_HARGA_LABEL } from '@/constants/tipeHarga.constant'
import { ParameterTagihanDialog, ringkasKomponen } from '@/components/shared/ParameterTagihanTrip'
import InvoiceTerminDialog from '@/components/shared/InvoiceTerminDialog'

const UKURAN_HALAMAN_SIAP_TAGIH = 10

const TH_SIAP_TAGIH = 'py-2.5 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

const SUMBER_OPTIONS = [
    { value: '',         label: 'Semua Sumber' },
    { value: 'internal', label: 'Internal' },
    { value: 'vendor',   label: 'Vendor' },
]

export default function KonsolidasiKlienPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [klienOptions, setKlienOptions] = useState<{ value: string; label: string }[]>([])
    const [selectedKlien, setSelectedKlien] = useState<string>(() => searchParams.get('klien') ?? '')

    useEffect(() => {
        if (searchParams.get('klien')) return
        const tersimpan = localStorage.getItem('konsolidasi-klien.klien')
        if (tersimpan) setSelectedKlien(tersimpan)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const [dari, setDari]     = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
    const [sampai, setSampai] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
    const [sumber, setSumber] = useState('')

    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string }[]>([])
    const [proyekFilter, setProyekFilter]   = useState('')
    const [selectedIds, setSelectedIds]     = useState<string[]>([])
    const [dialogOpen, setDialogOpen]       = useState(false)
    const [tanggalFaktur, setTanggalFaktur] = useState(dayjs().format('YYYY-MM-DD'))
    const [jatuhTempo, setJatuhTempo]       = useState('')
    const [keteranganInvoice, setKeteranganInvoice] = useState('')
    const [submitting, setSubmitting]       = useState(false)
    const [tripParameter, setTripParameter] = useState<KonsolidasiKlienTrip | null>(null)
    const [terminOpen, setTerminOpen]       = useState(false)

    const [rekap, setRekap]     = useState<KonsolidasiKlienRekap | null>(null)
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)

    const gantiKlien = (id: string) => {
        setSelectedKlien(id)
        if (typeof window !== 'undefined') {
            if (id) localStorage.setItem('konsolidasi-klien.klien', id)
            else localStorage.removeItem('konsolidasi-klien.klien')
        }
        router.replace(id ? `${ROUTES.KONSOLIDASI_KLIEN}?klien=${id}` : ROUTES.KONSOLIDASI_KLIEN, { scroll: false })
    }

    useEffect(() => {
        klienService.list(1, 100)
            .then(res => setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: k.nama_klien }))))
            .catch(() => {})
    }, [])

    const proyekTertundaRef = useRef<string | null>(null)
    const [siapTagih, setSiapTagih] = useState<SiapTagihItem[]>([])
    const [loadingSiapTagih, setLoadingSiapTagih] = useState(false)
    const [cariSiapInput, setCariSiapInput] = useState('')
    const [cariSiap, setCariSiap] = useState('')
    const [halamanSiap, setHalamanSiap] = useState(1)
    const [siapTagihDimuat, setSiapTagihDimuat] = useState(false)
    const [periodeSiap, setPeriodeSiap] = useState(false)

    const siapTagihTersaring = useMemo(() => {
        const kata = cariSiap.toLowerCase()
        if (!kata) return siapTagih
        return siapTagih.filter(item => [item.nama_klien, item.kode_proyek, item.nama_proyek]
            .some(v => v?.toLowerCase().includes(kata)))
    }, [siapTagih, cariSiap])
    const halamanSiapAktif = Math.min(halamanSiap, Math.max(1, Math.ceil(siapTagihTersaring.length / UKURAN_HALAMAN_SIAP_TAGIH)))
    const siapTagihHalaman = siapTagihTersaring.slice(
        (halamanSiapAktif - 1) * UKURAN_HALAMAN_SIAP_TAGIH,
        halamanSiapAktif * UKURAN_HALAMAN_SIAP_TAGIH,
    )

    const fetchSiapTagih = useCallback(async () => {
        setLoadingSiapTagih(true)
        try {
            setSiapTagih(await konsolidasiKlienService.siapTagih())
        } catch {
            setSiapTagih([])
        } finally {
            setLoadingSiapTagih(false)
            setSiapTagihDimuat(true)
        }
    }, [])

    useEffect(() => { fetchSiapTagih() }, [fetchSiapTagih])

    const terapkanPeriodeKlien = useCallback((idKlien: string) => {
        const tanggal = siapTagih
            .filter(item => item.id_klien === idKlien && !item.borongan)
            .flatMap(item => [item.tanggal_pertama, item.tanggal_terakhir])
            .filter((t): t is string => !!t)
            .sort()
        if (tanggal.length === 0) {
            setDari(dayjs().startOf('month').format('YYYY-MM-DD'))
            setSampai(dayjs().endOf('month').format('YYYY-MM-DD'))
            return
        }
        const hariIni = dayjs().format('YYYY-MM-DD')
        const terakhir = tanggal[tanggal.length - 1]
        setDari(tanggal[0])
        setSampai(terakhir > hariIni ? terakhir : hariIni)
    }, [siapTagih])

    useEffect(() => {
        if (periodeSiap || !siapTagihDimuat) return
        if (selectedKlien) terapkanPeriodeKlien(selectedKlien)
        setPeriodeSiap(true)
    }, [periodeSiap, siapTagihDimuat, selectedKlien, terapkanPeriodeKlien])

    const pilihKlien = (id: string) => {
        gantiKlien(id)
        if (id) terapkanPeriodeKlien(id)
    }

    const ubahDari = (date: Date | null) => {
        const nilai = date ? dayjs(date).format('YYYY-MM-DD') : ''
        setDari(nilai)
        if (nilai && sampai && nilai > sampai) setSampai(nilai)
    }

    const ubahSampai = (date: Date | null) => {
        const nilai = date ? dayjs(date).format('YYYY-MM-DD') : ''
        setSampai(nilai)
        if (nilai && dari && nilai < dari) setDari(nilai)
    }

    const pilihSiapTagih = (item: SiapTagihItem) => {
        if (item.tanggal_pertama) setDari(item.tanggal_pertama)
        if (item.tanggal_terakhir) setSampai(item.tanggal_terakhir)
        setSumber('')
        setSelectedIds([])
        if (item.id_klien === selectedKlien) {
            setProyekFilter(item.id_proyek)
            return
        }
        proyekTertundaRef.current = item.id_proyek
        gantiKlien(item.id_klien)
    }

    useEffect(() => {
        const tertunda = proyekTertundaRef.current
        proyekTertundaRef.current = null
        setProyekFilter(tertunda ?? '')
        setSelectedIds([])
        if (!selectedKlien) { setProyekOptions([]); return }
        projectService.listByKlien(selectedKlien, 1, 100)
            .then(res => setProyekOptions(res.data.map((p: Project) => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` }))))
            .catch(() => {})
    }, [selectedKlien])

    const reqRef = useRef(0)
    const fetchRekap = useCallback(async (pertahankanHalaman = false) => {
        if (!selectedKlien) { setRekap(null); return }
        if (!periodeSiap) return
        const reqId = ++reqRef.current
        setLoading(true)
        try {
            const data = await konsolidasiKlienService.rekap(selectedKlien, dari, sampai, sumber, proyekFilter)
            if (reqRef.current !== reqId) return
            setRekap(data)
            if (!pertahankanHalaman) setCurrentPage(1)
            setSelectedIds(prev => prev.filter(id => data.trips.some(t => t.id_trip === id && !t.sudah_difakturkan && t.bisa_ditagih)))
        } catch (err) {
            if (reqRef.current !== reqId) return
            setRekap(null)
            setSelectedIds([])
            if (axios.isAxiosError(err) && err.response?.status === 404) {
                localStorage.removeItem('konsolidasi-klien.klien')
            }
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (reqRef.current === reqId) setLoading(false)
        }
    }, [selectedKlien, dari, sampai, sumber, proyekFilter, periodeSiap])

    useEffect(() => { fetchRekap() }, [fetchRekap])

    const handleExport = async () => {
        if (!rekap) return
        setExporting(true)
        try {
            await konsolidasiKlienService.exportExcel(selectedKlien, rekap.klien.nama_klien, dari, sampai, sumber, proyekFilter)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setExporting(false)
        }
    }

    const trips = useMemo(() => rekap?.trips ?? [], [rekap])
    const bisaDipilih = useMemo(
        () => (proyekFilter ? trips.filter(t => !t.sudah_difakturkan && t.bisa_ditagih && !t.borongan) : []),
        [trips, proyekFilter],
    )
    const semuaTerpilih = bisaDipilih.length > 0 && selectedIds.length === bisaDipilih.length
    const totalEstimasi = useMemo(
        () => trips.filter(t => selectedIds.includes(t.id_trip)).reduce((acc, t) => acc + (t.total_tagihan ?? 0), 0),
        [trips, selectedIds],
    )
    const toggleSemua = () => setSelectedIds(semuaTerpilih ? [] : bisaDipilih.map(t => t.id_trip))
    const toggleSatu = (id: string) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

    const handleBuatFaktur = async () => {
        setSubmitting(true)
        try {
            const faktur = await penagihanTripService.buatFaktur({
                id_proyek:      proyekFilter,
                trip_ids:       selectedIds,
                tanggal_faktur: tanggalFaktur,
                jatuh_tempo:    jatuhTempo || null,
                keterangan:     keteranganInvoice.trim() || null,
            })
            toast.push(<Notification type="success" title="Draft invoice berhasil dibuat" />)
            router.push(ROUTES.FAKTUR_DETAIL(faktur.id_faktur))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setSubmitting(false)
            setDialogOpen(false)
            fetchRekap()
            fetchSiapTagih()
        }
    }

    const tripColumns: ColumnDef<KonsolidasiKlienTrip>[] = [
        ...(proyekFilter ? [{
            header: () => (
                <Checkbox checked={semuaTerpilih} onChange={toggleSemua} disabled={bisaDipilih.length === 0} />
            ),
            id: 'pilih', size: 50,
            cell: ({ row }: { row: { original: KonsolidasiKlienTrip } }) => (
                <Checkbox
                    checked={selectedIds.includes(row.original.id_trip)}
                    onChange={() => toggleSatu(row.original.id_trip)}
                    disabled={row.original.sudah_difakturkan || !row.original.bisa_ditagih || row.original.borongan}
                />
            ),
        }] : []),
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Tanggal', accessorKey: 'tanggal', size: 130,
            cell: ({ row }) => <span className="whitespace-nowrap">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>,
        },
        {
            header: 'Proyek', accessorKey: 'nama_proyek', size: 200,
            cell: ({ row }) => {
                const t = row.original
                const label = t.kode_proyek || t.nama_proyek
                    ? `${t.kode_proyek ?? ''}${t.kode_proyek && t.nama_proyek ? ' — ' : ''}${t.nama_proyek ?? ''}`
                    : '—'
                return t.id_proyek
                    ? <a href={ROUTES.PROYEK_DETAIL(t.id_proyek)} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline">{label}</a>
                    : label
            },
        },
        {
            header: 'Rute', accessorKey: 'rute', size: 130,
            cell: ({ row }) => row.original.id_rute
                ? <a href={ROUTES.RUTE_DETAIL(row.original.id_rute)} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline">{row.original.rute ?? '—'}</a>
                : (row.original.rute ?? '—'),
        },
        {
            header: 'Asal', accessorKey: 'asal', size: 110,
            cell: ({ row }) => row.original.asal ?? '—',
        },
        {
            header: 'Tujuan', accessorKey: 'tujuan', size: 110,
            cell: ({ row }) => row.original.titik_drop?.length
                ? row.original.titik_drop.join(' → ')
                : (row.original.tujuan ?? '—'),
        },
        {
            header: 'Nopol', accessorKey: 'nopol', size: 120,
            cell: ({ row }) => <span className="whitespace-nowrap font-mono text-xs">{row.original.nopol ?? '—'}</span>,
        },
        {
            header: 'Supir', accessorKey: 'supir_nama', size: 160,
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-2">
                    {row.original.supir_nama ?? '—'}
                    {row.original.sumber === 'vendor' && (
                        <Tag className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">vendor</Tag>
                    )}
                </span>
            ),
        },
        {
            header: 'No Surat Jalan', accessorKey: 'no_surat_jalan', size: 140,
            cell: ({ row }) => <span className="whitespace-nowrap font-mono text-xs">{row.original.no_surat_jalan || '—'}</span>,
        },
        {
            header: 'Jarak', accessorKey: 'jarak_tempuh_km', size: 100,
            cell: ({ row }) => (
                <span className="whitespace-nowrap">
                    {row.original.jarak_tempuh_km != null ? `${formatNum(row.original.jarak_tempuh_km)} km` : '—'}
                </span>
            ),
        },
        {
            header: 'Tarif', id: 'tarif', size: 130,
            cell: ({ row }) => (
                <span className="whitespace-nowrap inline-flex items-center gap-1.5">
                    {row.original.parameter?.cancellation
                        ? (
                            <>
                                {row.original.tarif && <span className="line-through text-gray-400">{formatRupiah(row.original.tarif.harga)}</span>}
                                <Tag className="text-xs bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300">Dibatalkan</Tag>
                            </>
                        )
                        : row.original.tarif
                        ? (
                            <>
                                {formatRupiah(row.original.tarif.harga)}
                                {row.original.tarif.perkiraan && (
                                    <Tooltip title="Jenis armada yang di-assign tidak cocok tarif spesifik di rute ini — dipakai tarif termurah di rute itu sebagai perkiraan. Cek/ubah lewat Edit Invoice bila perlu.">
                                        <Tag className="text-xs bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">Perkiraan</Tag>
                                    </Tooltip>
                                )}
                            </>
                        )
                        : row.original.borongan
                            ? <Tag className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">{TIPE_HARGA_LABEL[row.original.tipe_harga] ?? 'Nilai tetap'}</Tag>
                            : <Tag className="text-xs bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300">Tarif belum diatur</Tag>}
                </span>
            ),
        },
        {
            header: 'Parameter', id: 'parameter', size: 190,
            cell: ({ row }) => {
                const t = row.original
                const komponen = t.parameter?.komponen ?? []
                const bisaAtur = !t.borongan && !t.sudah_difakturkan
                return (
                    <div className="flex items-start gap-1.5">
                        <div className="flex flex-col gap-0.5 min-w-0">
                            {komponen.length === 0 ? (
                                <span className="text-gray-400">—</span>
                            ) : (
                                <>
                                    {komponen.map(k => (
                                        <span key={k.kode} className="text-xs whitespace-nowrap">{ringkasKomponen(k)}</span>
                                    ))}
                                    <span className="font-semibold whitespace-nowrap">{formatRupiah(t.parameter.total)}</span>
                                </>
                            )}
                        </div>
                        {bisaAtur && (
                            <Tooltip title="Atur parameter tagihan">
                                <Button size="xs" variant="plain" icon={<HiOutlinePencilAlt />} onClick={() => setTripParameter(t)} />
                            </Tooltip>
                        )}
                    </div>
                )
            },
        },
        {
            header: 'Biaya Tambahan', accessorKey: 'biaya_tambahan', size: 130,
            cell: ({ row }) => (
                <span className="whitespace-nowrap">
                    {row.original.biaya_tambahan ? formatRupiah(row.original.biaya_tambahan) : '—'}
                </span>
            ),
        },
        {
            header: 'Total', accessorKey: 'total_tagihan', size: 140,
            cell: ({ row }) => (
                <span className="whitespace-nowrap font-semibold">
                    {row.original.total_tagihan != null ? formatRupiah(row.original.total_tagihan) : '—'}
                </span>
            ),
        },
        {
            header: 'Status Tagihan', accessorKey: 'sudah_difakturkan', size: 150,
            cell: ({ row }) => (
                <Tag className={`text-xs font-semibold ${row.original.sudah_difakturkan
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
                    {row.original.sudah_difakturkan ? 'Sudah masuk invoice' : 'Belum'}
                </Tag>
            ),
        },
    ]

    const pagedTrips = trips.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const proyekNilaiTetap = proyekFilter
        ? siapTagih.find(item => item.id_proyek === proyekFilter && item.id_klien === selectedKlien && item.borongan) ?? null
        : null

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Konsolidasi Klien</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                    Rekap laporan perjalanan per klien — cocokkan dengan klien, lalu pilih trip untuk dibuat draft invoice
                </p>
            </div>

            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">Siap Ditagih</p>
                        <p className="text-xs text-gray-500 mt-0.5">Klien dan proyek yang punya trip selesai ber-laporan atau trip cancellation yang belum masuk invoice. Untuk proyek nilai tetap yang ditampilkan sisa nilai kontraknya, dan barisnya hilang saat kontrak habis ditagih. Klik untuk langsung memuat rekapnya.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {siapTagih.length > 0 && (
                            <Tag className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-0 whitespace-nowrap">{formatNum(siapTagih.length)} proyek</Tag>
                        )}
                        {siapTagih.length > UKURAN_HALAMAN_SIAP_TAGIH && (
                            <Input
                                size="sm"
                                className="w-64"
                                placeholder="Cari klien atau proyek... (tekan Enter)"
                                suffix={cariSiapInput
                                    ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setCariSiapInput(''); setCariSiap(''); setHalamanSiap(1) }} />
                                    : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setCariSiap(cariSiapInput.trim()); setHalamanSiap(1) }} />}
                                value={cariSiapInput}
                                onChange={e => setCariSiapInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setCariSiap(cariSiapInput.trim()); setHalamanSiap(1) } }}
                            />
                        )}
                    </div>
                </div>
                {loadingSiapTagih ? (
                    <div className="flex items-center justify-center py-6"><Spinner /></div>
                ) : siapTagih.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Semua trip selesai sudah ditagihkan</p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className={`${TH_SIAP_TAGIH} text-left pl-4 w-14`}>No</th>
                                        <th className={`${TH_SIAP_TAGIH} text-left`}>Klien</th>
                                        <th className={`${TH_SIAP_TAGIH} text-left`}>Proyek</th>
                                        <th className={`${TH_SIAP_TAGIH} text-left`}>Periode Trip</th>
                                        <th className={`${TH_SIAP_TAGIH} text-right`}>Belum Ditagih</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {siapTagihHalaman.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-6 text-center text-gray-400">Tidak ada klien atau proyek yang cocok dengan pencarian</td>
                                        </tr>
                                    ) : siapTagihHalaman.map((item, i) => {
                                        const aktif = item.id_klien === selectedKlien && item.id_proyek === proyekFilter
                                        const satuHari = item.tanggal_pertama === item.tanggal_terakhir
                                        return (
                                            <tr key={item.id_proyek}
                                                role="button" tabIndex={0}
                                                className={`cursor-pointer transition-colors ${aktif ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}
                                                onClick={() => pilihSiapTagih(item)}
                                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pilihSiapTagih(item) } }}>
                                                <td className="py-2.5 pl-4 pr-4 text-gray-500 tabular-nums">{(halamanSiapAktif - 1) * UKURAN_HALAMAN_SIAP_TAGIH + i + 1}</td>
                                                <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300">{item.nama_klien}</td>
                                                <td className="py-2.5 pr-4">
                                                    <span className={`font-semibold ${aktif ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}>
                                                        {item.kode_proyek ? `${item.kode_proyek} — ` : ''}{item.nama_proyek ?? '—'}
                                                    </span>
                                                    {item.borongan && (
                                                        <Tooltip title="Proyek nilai tetap ditagih per termin terhadap nilai kontrak, bukan per trip">
                                                            <Tag className="ml-2 text-xs border-0 bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">Borongan</Tag>
                                                        </Tooltip>
                                                    )}
                                                </td>
                                                <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-300 whitespace-nowrap tabular-nums">
                                                    {item.tanggal_pertama ? dayjs(item.tanggal_pertama).format('DD MMM YYYY') : '…'}
                                                    {!satuHari && <> – {item.tanggal_terakhir ? dayjs(item.tanggal_terakhir).format('DD MMM YYYY') : '…'}</>}
                                                </td>
                                                <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                                                    {!item.borongan ? (
                                                        <Tag className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                            {formatNum(item.jumlah_trip)} trip
                                                        </Tag>
                                                    ) : item.sisa_kontrak !== null ? (
                                                        <Tag className="border-0 bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                                                            Sisa {formatRupiah(Math.floor(item.sisa_kontrak))}
                                                        </Tag>
                                                    ) : (
                                                        <Tag className="border-0 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                                            Nilai kontrak belum diisi
                                                        </Tag>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {siapTagihTersaring.length > UKURAN_HALAMAN_SIAP_TAGIH && (
                            <div className="flex justify-end px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                                <Pagination currentPage={halamanSiapAktif} pageSize={UKURAN_HALAMAN_SIAP_TAGIH}
                                    total={siapTagihTersaring.length} onChange={setHalamanSiap} />
                            </div>
                        )}
                    </>
                )}
            </Card>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                    <Select
                        className="w-full sm:w-80"
                        placeholder="Pilih klien..."
                        options={klienOptions}
                        value={klienOptions.find(o => o.value === selectedKlien) ?? null}
                        onChange={opt => pilihKlien((opt as { value: string } | null)?.value ?? '')}
                    />
                    <Select
                        className="w-full sm:w-64"
                        isClearable
                        placeholder="Semua Proyek"
                        options={proyekOptions}
                        isDisabled={!selectedKlien}
                        value={proyekOptions.find(o => o.value === proyekFilter) ?? null}
                        onChange={opt => { setProyekFilter((opt as { value: string } | null)?.value ?? ''); setSelectedIds([]) }}
                    />
                    <div className="flex items-center gap-2">
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40"
                            value={dari ? dayjs(dari).toDate() : null}
                            onChange={ubahDari} />
                        <span className="text-gray-400 text-sm">s/d</span>
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40"
                            value={sampai ? dayjs(sampai).toDate() : null}
                            onChange={ubahSampai} />
                    </div>
                    <Select
                        className="w-48"
                        isSearchable={false}
                        options={SUMBER_OPTIONS}
                        value={SUMBER_OPTIONS.find(o => o.value === sumber) ?? SUMBER_OPTIONS[0]}
                        onChange={opt => setSumber((opt as { value: string } | null)?.value ?? '')}
                    />
                    {loading && <Spinner size={20} />}
                    <div className="flex-1" />
                    <Tooltip title="Export Excel">
                        <Button size="sm" variant="default" icon={<HiOutlineDocumentDownload />}
                            disabled={!rekap || rekap.trips.length === 0}
                            loading={exporting} onClick={handleExport} />
                    </Tooltip>
                </div>

                {!selectedKlien ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Pilih klien untuk melihat rekap perjalanannya</p>
                ) : (loading || !periodeSiap) && !rekap ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Memuat...</p>
                ) : !rekap || rekap.trips.length === 0 ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Tidak ada trip selesai ber-laporan pada periode ini</p>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-3 px-4 py-3">
                            <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800 min-w-[140px]">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Rit</p>
                                <p className="font-bold text-base text-gray-800 dark:text-gray-100 mt-1">{formatNum(rekap.ringkasan.total_rit)}</p>
                            </div>
                            <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800 min-w-[140px]">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Jarak</p>
                                <p className="font-bold text-base text-gray-800 dark:text-gray-100 mt-1">{formatNum(rekap.ringkasan.total_jarak_km)} km</p>
                            </div>
                            <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 min-w-[180px]">
                                <p className="text-xs font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wide">Estimasi Nilai</p>
                                <p className="font-bold text-base text-blue-600 dark:text-blue-300 mt-1">{formatRupiah(rekap.ringkasan.estimasi_nilai)}</p>
                                {rekap.ringkasan.tanpa_tarif > 0 && (
                                    <p className="text-xs mt-0.5 text-amber-600 dark:text-amber-400">{rekap.ringkasan.tanpa_tarif} trip tanpa tarif</p>
                                )}
                            </div>
                        </div>

                        <DataTable
                            columns={tripColumns}
                            data={pagedTrips as unknown[]}
                            loading={loading}
                            pagingData={{ total: trips.length, pageIndex: currentPage, pageSize }}
                            onPaginationChange={setCurrentPage}
                            onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                        />

                        {!proyekFilter && trips.some(t => !t.sudah_difakturkan) && (
                            <p className="text-xs text-gray-400 px-4 pb-3">Pilih proyek pada filter untuk mencentang &amp; menagih trip</p>
                        )}
                    </>
                )}

                {proyekNilaiTetap && (
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                        {proyekNilaiTetap.sisa_kontrak !== null ? (
                            <>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Proyek nilai tetap, ditagih per termin — sisa nilai kontrak{' '}
                                    <span className="font-semibold">{formatRupiah(Math.floor(proyekNilaiTetap.sisa_kontrak))}</span>
                                </p>
                                <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={() => setTerminOpen(true)}>
                                    Buat Invoice Termin
                                </Button>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                    Nilai kontrak proyek ini belum diisi, jadi invoice termin belum bisa dibuat.
                                </p>
                                <a href={ROUTES.PROYEK_DETAIL(proyekNilaiTetap.id_proyek)} target="_blank" rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Buka proyek</a>
                            </>
                        )}
                    </div>
                )}

                {selectedIds.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-semibold">{selectedIds.length} trip</span> dipilih — estimasi{' '}
                            <span className="font-semibold">{formatRupiah(totalEstimasi)}</span>
                        </p>
                        <Button size="sm" variant="solid" icon={<HiPlusCircle />}
                            onClick={() => { setTanggalFaktur(dayjs().format('YYYY-MM-DD')); setJatuhTempo(''); setKeteranganInvoice(''); setDialogOpen(true) }}>
                            Buat Draft Invoice
                        </Button>
                    </div>
                )}
            </Card>

            <Dialog isOpen={dialogOpen} onRequestClose={() => setDialogOpen(false)} onClose={() => setDialogOpen(false)} width={800}>
                <h5 className="text-base font-semibold mb-2">Buat Draft Invoice</h5>
                <p className="text-xs text-gray-500 mb-5">
                    {selectedIds.length} trip senilai {formatRupiah(totalEstimasi)} akan dijadikan draft invoice, dirinci per baris: jasa angkutan, parameter tagihan (Overnight, Add Drop, Cross Cluster, Cancellation), dan biaya tambahan.
                </p>
                <form onSubmit={e => { e.preventDefault(); handleBuatFaktur() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Tanggal Invoice" asterisk>
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={tanggalFaktur ? dayjs(tanggalFaktur).toDate() : null}
                                onChange={date => setTanggalFaktur(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        </FormItem>
                        <FormItem label="Jatuh Tempo (opsional)">
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={jatuhTempo ? dayjs(jatuhTempo).toDate() : null}
                                onChange={date => setJatuhTempo(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Uraian Invoice (opsional)">
                                <Input textArea rows={3} maxLength={300}
                                    placeholder="Contoh: Jasa Angkutan Unit Dedicated Project Astro Cibitung Periode Juli 2026"
                                    value={keteranganInvoice}
                                    onChange={e => setKeteranganInvoice(e.target.value)} />
                                <p className="text-xs text-gray-400 mt-1">
                                    Tampil sebagai deskripsi baris jasa angkutan di invoice — kosongkan untuk memakai teks otomatis.
                                </p>
                            </FormItem>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setDialogOpen(false)}>Kembali</Button>
                        <Button type="submit" variant="solid" loading={submitting} disabled={!tanggalFaktur}>Buat Invoice</Button>
                    </div>
                </form>
            </Dialog>

            <InvoiceTerminDialog
                isOpen={terminOpen}
                idProyek={proyekNilaiTetap?.id_proyek ?? null}
                namaProyek={proyekNilaiTetap ? `${proyekNilaiTetap.kode_proyek ? `${proyekNilaiTetap.kode_proyek} — ` : ''}${proyekNilaiTetap.nama_proyek ?? ''}` : null}
                nilaiKontrak={proyekNilaiTetap?.nilai_kontrak ?? null}
                sisaKontrak={proyekNilaiTetap?.sisa_kontrak ?? null}
                onClose={() => setTerminOpen(false)}
            />

            <ParameterTagihanDialog
                idTrip={tripParameter?.id_trip ?? null}
                isOpen={tripParameter !== null}
                info={tripParameter
                    ? [dayjs(tripParameter.tanggal).format('DD MMM YYYY'), tripParameter.nopol, tripParameter.rute].filter(Boolean).join(' · ')
                    : undefined}
                onClose={() => setTripParameter(null)}
                onSaved={() => { setTripParameter(null); fetchRekap(true); fetchSiapTagih() }}
            />
        </div>
    )
}
