'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dayjs from 'dayjs'
import { Card, Button, Tag, Checkbox, Dialog, FormItem, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { HiPlusCircle } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { projectService, Project } from '@/services/project.service'
import { penagihanTripService, TripSiapTagih } from '@/services/penagihanTrip.service'

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

export default function PenagihanTripPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string }[]>([])
    const [selectedProyek, setSelectedProyek] = useState<string>(() =>
        searchParams.get('proyek')
        ?? (typeof window !== 'undefined' ? localStorage.getItem('penagihan-trip.proyek') ?? '' : ''))
    const [dari, setDari]     = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
    const [sampai, setSampai] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))

    const [rows, setRows]         = useState<TripSiapTagih[]>([])
    const [loading, setLoading]   = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const [dialogOpen, setDialogOpen]   = useState(false)
    const [tanggalFaktur, setTanggalFaktur] = useState(dayjs().format('YYYY-MM-DD'))
    const [jatuhTempo, setJatuhTempo]   = useState('')
    const [submitting, setSubmitting]   = useState(false)

    const gantiProyek = (id: string) => {
        setSelectedProyek(id)
        setSelectedIds([])
        if (typeof window !== 'undefined') {
            if (id) localStorage.setItem('penagihan-trip.proyek', id)
            else localStorage.removeItem('penagihan-trip.proyek')
        }
        router.replace(id ? `${ROUTES.PENAGIHAN_TRIP}?proyek=${id}` : ROUTES.PENAGIHAN_TRIP, { scroll: false })
    }

    useEffect(() => {
        projectService.list(1, 100).then(res =>
            setProyekOptions(res.data.map((p: Project) => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` })))
        ).catch(() => {})
    }, [])

    const fetchRows = useCallback(async () => {
        if (!selectedProyek) { setRows([]); return }
        setLoading(true)
        try {
            const data = await penagihanTripService.list(selectedProyek, dari, sampai)
            setRows(data)
            setSelectedIds(prev => prev.filter(id => data.some(r => r.id_trip === id && r.bisa_ditagih)))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [selectedProyek, dari, sampai])

    useEffect(() => { fetchRows() }, [fetchRows])

    const bisaDipilih = useMemo(() => rows.filter(r => r.bisa_ditagih), [rows])
    const semuaTerpilih = bisaDipilih.length > 0 && selectedIds.length === bisaDipilih.length
    const totalEstimasi = useMemo(
        () => rows.filter(r => selectedIds.includes(r.id_trip)).reduce((acc, r) => acc + (r.tarif?.harga ?? 0), 0),
        [rows, selectedIds],
    )

    const toggleSemua = () => {
        setSelectedIds(semuaTerpilih ? [] : bisaDipilih.map(r => r.id_trip))
    }
    const toggleSatu = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleBuatFaktur = async () => {
        setSubmitting(true)
        try {
            const faktur = await penagihanTripService.buatFaktur({
                id_proyek:      selectedProyek,
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
            fetchRows()
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Penagihan Trip</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                    Trip selesai ber-laporan yang siap ditagihkan ke klien — pilih lalu buat draft faktur
                </p>
            </div>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                    <Select
                        className="w-full sm:w-80"
                        placeholder="Pilih proyek..."
                        options={proyekOptions}
                        value={proyekOptions.find(o => o.value === selectedProyek) ?? null}
                        onChange={opt => gantiProyek((opt as { value: string } | null)?.value ?? '')}
                    />
                    <div className="flex items-center gap-2">
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-36"
                            value={dari ? dayjs(dari).toDate() : null}
                            onChange={date => setDari(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        <span className="text-gray-400 text-sm">s/d</span>
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-36"
                            value={sampai ? dayjs(sampai).toDate() : null}
                            onChange={date => setSampai(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </div>
                    {loading && <Spinner size={20} />}
                </div>

                {!selectedProyek ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Pilih proyek untuk melihat trip yang siap ditagihkan</p>
                ) : rows.length === 0 && !loading ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Tidak ada trip siap tagih pada periode ini</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className={`${TH_CLASS} w-10`}>
                                        <Checkbox checked={semuaTerpilih} onChange={toggleSemua} disabled={bisaDipilih.length === 0} />
                                    </th>
                                    <th className={TH_CLASS}>Tanggal</th>
                                    <th className={TH_CLASS}>Rute</th>
                                    <th className={TH_CLASS}>Nopol</th>
                                    <th className={TH_CLASS}>Supir</th>
                                    <th className={`${TH_CLASS} text-right`}>Jarak</th>
                                    <th className={`${TH_CLASS} text-right`}>Tarif</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map(r => (
                                    <tr key={r.id_trip} className={r.bisa_ditagih ? '' : 'opacity-70'}>
                                        <td className="py-2.5 px-3">
                                            <Checkbox
                                                checked={selectedIds.includes(r.id_trip)}
                                                onChange={() => toggleSatu(r.id_trip)}
                                                disabled={!r.bisa_ditagih}
                                            />
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">{dayjs(r.tanggal).format('DD MMM YYYY')}</td>
                                        <td className="py-2.5 px-3">{r.rute ?? <span className="text-gray-400">—</span>}</td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">{r.nopol ?? <span className="text-gray-400">—</span>}</td>
                                        <td className="py-2.5 px-3">
                                            <span className="inline-flex items-center gap-2">
                                                {r.supir_nama ?? <span className="text-gray-400">—</span>}
                                                {r.sumber === 'vendor' && (
                                                    <Tag className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">vendor</Tag>
                                                )}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                            {r.jarak_tempuh_km != null ? `${formatNum(r.jarak_tempuh_km)} km` : '—'}
                                        </td>
                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                            {r.tarif
                                                ? formatRupiah(r.tarif.harga)
                                                : <Tag className="text-xs bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300">Tarif belum diatur</Tag>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
