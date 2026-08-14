'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import dayjs from 'dayjs'
import { Card, Button, Tag, Checkbox, Dialog, FormItem, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiOutlineDownload, HiPlusCircle } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { klienService, Klien } from '@/services/klien.service'
import { konsolidasiKlienService, KonsolidasiKlienRekap, KonsolidasiKlienTrip } from '@/services/konsolidasiKlien.service'
import { projectService, Project } from '@/services/project.service'
import { penagihanTripService } from '@/services/penagihanTrip.service'

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
    const [submitting, setSubmitting]       = useState(false)

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

    useEffect(() => {
        setProyekFilter('')
        setSelectedIds([])
        if (!selectedKlien) { setProyekOptions([]); return }
        projectService.listByKlien(selectedKlien, 1, 100)
            .then(res => setProyekOptions(res.data.map((p: Project) => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` }))))
            .catch(() => {})
    }, [selectedKlien])

    const reqRef = useRef(0)
    const fetchRekap = useCallback(async () => {
        if (!selectedKlien) { setRekap(null); return }
        const reqId = ++reqRef.current
        setLoading(true)
        try {
            const data = await konsolidasiKlienService.rekap(selectedKlien, dari, sampai, sumber, proyekFilter)
            if (reqRef.current !== reqId) return
            setRekap(data)
            setCurrentPage(1)
            setSelectedIds(prev => prev.filter(id => data.trips.some(t => t.id_trip === id && !t.sudah_difakturkan && t.tarif !== null)))
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
    }, [selectedKlien, dari, sampai, sumber, proyekFilter])

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
        () => (proyekFilter ? trips.filter(t => !t.sudah_difakturkan && t.tarif !== null) : []),
        [trips, proyekFilter],
    )
    const semuaTerpilih = bisaDipilih.length > 0 && selectedIds.length === bisaDipilih.length
    const totalEstimasi = useMemo(
        () => trips.filter(t => selectedIds.includes(t.id_trip)).reduce((acc, t) => acc + (t.tarif?.harga ?? 0) + (t.biaya_tambahan ?? 0), 0),
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
            })
            toast.push(<Notification type="success" title="Draft faktur berhasil dibuat" />)
            router.push(ROUTES.FAKTUR_DETAIL(faktur.id_faktur))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setSubmitting(false)
            setDialogOpen(false)
            fetchRekap()
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
                    disabled={row.original.sudah_difakturkan || row.original.tarif === null}
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
                <span className="whitespace-nowrap">
                    {row.original.tarif
                        ? formatRupiah(row.original.tarif.harga)
                        : <Tag className="text-xs bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300">Tarif belum diatur</Tag>}
                </span>
            ),
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
            header: 'Status Tagihan', accessorKey: 'sudah_difakturkan', size: 150,
            cell: ({ row }) => (
                <Tag className={`text-xs font-semibold ${row.original.sudah_difakturkan
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
                    {row.original.sudah_difakturkan ? 'Sudah difakturkan' : 'Belum'}
                </Tag>
            ),
        },
    ]

    const pagedTrips = trips.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Konsolidasi Klien</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                    Rekap laporan perjalanan per klien — cocokkan dengan klien, lalu pilih trip untuk dibuat draft faktur
                </p>
            </div>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                    <Select
                        className="w-full sm:w-80"
                        placeholder="Pilih klien..."
                        options={klienOptions}
                        value={klienOptions.find(o => o.value === selectedKlien) ?? null}
                        onChange={opt => gantiKlien((opt as { value: string } | null)?.value ?? '')}
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
                            onChange={date => setDari(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        <span className="text-gray-400 text-sm">s/d</span>
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40"
                            value={sampai ? dayjs(sampai).toDate() : null}
                            onChange={date => setSampai(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
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
                    <Button size="sm" variant="default" icon={<HiOutlineDownload />}
                        disabled={!rekap || rekap.trips.length === 0}
                        loading={exporting} onClick={handleExport}>
                        Export Excel
                    </Button>
                </div>

                {!selectedKlien ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Pilih klien untuk melihat rekap perjalanannya</p>
                ) : loading && !rekap ? (
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

                {selectedIds.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-semibold">{selectedIds.length} trip</span> dipilih — estimasi{' '}
                            <span className="font-semibold">{formatRupiah(totalEstimasi)}</span>
                        </p>
                        <Button size="sm" variant="solid" icon={<HiPlusCircle />}
                            onClick={() => { setTanggalFaktur(dayjs().format('YYYY-MM-DD')); setJatuhTempo(''); setDialogOpen(true) }}>
                            Buat Draft Faktur
                        </Button>
                    </div>
                )}
            </Card>

            <Dialog isOpen={dialogOpen} onRequestClose={() => setDialogOpen(false)} onClose={() => setDialogOpen(false)} width={440}>
                <h5 className="text-base font-semibold mb-2">Buat Draft Faktur</h5>
                <p className="text-xs text-gray-500 mb-5">
                    {selectedIds.length} trip akan dimasukkan ke draft faktur — item digrup per rute dan masih bisa diedit sebelum dikirim.
                </p>
                <form onSubmit={e => { e.preventDefault(); handleBuatFaktur() }}>
                    <FormItem label="Tanggal Faktur" asterisk>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={tanggalFaktur ? dayjs(tanggalFaktur).toDate() : null}
                            onChange={date => setTanggalFaktur(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </FormItem>
                    <FormItem label="Jatuh Tempo (opsional)">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={jatuhTempo ? dayjs(jatuhTempo).toDate() : null}
                            onChange={date => setJatuhTempo(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={submitting} disabled={!tanggalFaktur}>Buat Faktur</Button>
                    </div>
                </form>
            </Dialog>
        </div>
    )
}
