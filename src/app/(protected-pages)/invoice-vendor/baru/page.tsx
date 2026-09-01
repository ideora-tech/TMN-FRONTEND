'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Checkbox, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { HiArrowLeft } from 'react-icons/hi'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { invoiceVendorService, TripSiapTagihVendor } from '@/services/invoice-vendor.service'
import { Vendor, KontrakVendor } from '@/services/vendor.service'
import { armadaVendorService, ArmadaVendor } from '@/services/armadaVendor.service'
import { tipePembayaranService, TipePembayaran } from '@/services/tipe-pembayaran.service'
import { projectService, Project } from '@/services/project.service'

const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'All In',
}

export default function InvoiceVendorBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        id_vendor: '', id_kontrak_vendor: '',
        nomor_invoice: '', tanggal_invoice: dayjs().format('YYYY-MM-DD'),
        jatuh_tempo: '', no_po: '', no_kontrak: '',
        nopol: '', tipe_kendaraan: '', tipe_pembayaran: '', top_hari: '',
        periode_dari: '', periode_sampai: '',
        dpp: '', ppn: '', pph: '', keterangan: '',
    })
    const [jatuhTempoManual, setJatuhTempoManual] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors]   = useState<Record<string, string>>({})
    const [vendorOptions, setVendorOptions]   = useState<{ value: string; label: string }[]>([])
    const [kontrakList, setKontrakList]       = useState<KontrakVendor[]>([])
    const [armadaList, setArmadaList]         = useState<ArmadaVendor[]>([])
    const [tipePembayaranOptions, setTipePembayaranOptions] = useState<{ value: string; label: string }[]>([])

    const [mode, setMode] = useState<'trip' | 'manual'>('trip')
    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string }[]>([])
    const [filterProyek, setFilterProyek] = useState('')
    const [tripList, setTripList]       = useState<TripSiapTagihVendor[]>([])
    const [tripChecked, setTripChecked] = useState<Record<string, boolean>>({})
    const [loadingTrip, setLoadingTrip] = useState(false)
    const dppManual = useRef(false)
    const [ppnPersen, setPpnPersen] = useState('')
    const [pphPersen, setPphPersen] = useState('')
    const ppnManual = useRef(false)
    const pphManual = useRef(false)

    useEffect(() => {
        axios.get(API_ENDPOINTS.VENDOR, { params: { limit: 999 } })
            .then(r => setVendorOptions((r.data.data as Vendor[]).map(v => ({ value: v.id_vendor, label: v.nama_vendor }))))
            .catch(() => {})
        tipePembayaranService.opsiAktif()
            .then(res => setTipePembayaranOptions(res.map((t: TipePembayaran) => ({ value: t.kode_tipe, label: t.nama_tipe }))))
            .catch(() => {})
        projectService.list(1, 999)
            .then(res => setProyekOptions((res.data as Project[]).map(p => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!form.id_vendor) { setKontrakList([]); return }
        axios.get(API_ENDPOINTS.KONTRAK_VENDOR, { params: { id_vendor: form.id_vendor, limit: 999 } })
            .then(r => setKontrakList(r.data.data as KontrakVendor[]))
            .catch(() => setKontrakList([]))
    }, [form.id_vendor])

    useEffect(() => {
        if (!form.id_vendor) { setArmadaList([]); return }
        armadaVendorService.list(1, 999, form.id_vendor)
            .then(r => setArmadaList(r.data))
            .catch(() => setArmadaList([]))
    }, [form.id_vendor])

    const kontrakOptions = kontrakList.map(k => ({
        value: k.id_kontrak_vendor,
        label: `${k.nomor_kontrak ?? 'Tanpa nomor'} · ${MEKANISME_LABEL[k.mekanisme] ?? k.mekanisme}`,
    }))
    const selectedKontrak = kontrakList.find(k => k.id_kontrak_vendor === form.id_kontrak_vendor) ?? null

    useEffect(() => {
        if (mode !== 'trip' || !form.id_kontrak_vendor) {
            setTripList([])
            setTripChecked({})
            return
        }
        setLoadingTrip(true)
        invoiceVendorService.tripSiapTagih(form.id_kontrak_vendor, form.periode_dari || undefined, form.periode_sampai || undefined, filterProyek || undefined)
            .then(rows => {
                setTripList(rows)
                setTripChecked(Object.fromEntries(rows.map(r => [r.id_trip, true])))
            })
            .catch(() => { setTripList([]); setTripChecked({}) })
            .finally(() => setLoadingTrip(false))
    }, [mode, form.id_kontrak_vendor, form.periode_dari, form.periode_sampai, filterProyek])

    const tripIdsChecked = useMemo(() => tripList.filter(t => tripChecked[t.id_trip]).map(t => t.id_trip), [tripList, tripChecked])
    const semuaTripTercentang = tripList.length > 0 && tripIdsChecked.length === tripList.length

    useEffect(() => {
        if (mode !== 'trip' || dppManual.current) return
        if (selectedKontrak?.satuan !== 'per trip' || !selectedKontrak?.rate) return
        setForm(p => ({ ...p, dpp: tripIdsChecked.length > 0 ? String(Math.round(tripIdsChecked.length * (selectedKontrak.rate as number))) : '' }))
    }, [mode, tripIdsChecked, selectedKontrak?.satuan, selectedKontrak?.rate])

    useEffect(() => {
        if (!ppnPersen || ppnManual.current) return
        const persen = Number(ppnPersen)
        if (Number.isNaN(persen)) return
        setForm(p => ({ ...p, ppn: p.dpp ? String(Math.round((Number(p.dpp) || 0) * persen / 100)) : '' }))
    }, [form.dpp, ppnPersen])

    useEffect(() => {
        if (!pphPersen || pphManual.current) return
        const persen = Number(pphPersen)
        if (Number.isNaN(persen)) return
        setForm(p => ({ ...p, pph: p.dpp ? String(Math.round((Number(p.dpp) || 0) * persen / 100)) : '' }))
    }, [form.dpp, pphPersen])

    const nopolOptions = armadaList.map(a => ({
        value: a.nopol,
        label: a.nopol,
        tipe: a.nama_jenis_kendaraan ?? a.jenis ?? '',
    }))

    const applyTerminJatuhTempo = (kontrak: KontrakVendor | null, tanggalInvoice: string, manual: boolean) => {
        if (manual || !kontrak?.termin_pembayaran_hari || !tanggalInvoice) return null
        return dayjs(tanggalInvoice).add(kontrak.termin_pembayaran_hari, 'day').format('YYYY-MM-DD')
    }

    const handleKontrakChange = (idKontrak: string) => {
        const kontrak = kontrakList.find(k => k.id_kontrak_vendor === idKontrak) ?? null
        setForm(p => {
            const auto = applyTerminJatuhTempo(kontrak, p.tanggal_invoice, jatuhTempoManual)
            return {
                ...p,
                id_kontrak_vendor: idKontrak,
                no_kontrak: kontrak?.nomor_kontrak ?? p.no_kontrak,
                jatuh_tempo: auto ?? (jatuhTempoManual ? p.jatuh_tempo : ''),
            }
        })
    }

    const handleTanggalInvoiceChange = (tanggal: string) => {
        setForm(p => {
            if (p.tipe_pembayaran === 'top' && p.top_hari && tanggal && !jatuhTempoManual) {
                return { ...p, tanggal_invoice: tanggal, jatuh_tempo: dayjs(tanggal).add(Number(p.top_hari), 'day').format('YYYY-MM-DD') }
            }
            const kontrak = kontrakList.find(k => k.id_kontrak_vendor === p.id_kontrak_vendor) ?? null
            const auto = applyTerminJatuhTempo(kontrak, tanggal, jatuhTempoManual)
            return { ...p, tanggal_invoice: tanggal, jatuh_tempo: auto ?? p.jatuh_tempo }
        })
    }

    const total = Math.max((Number(form.dpp) || 0) + (Number(form.ppn) || 0) - (Number(form.pph) || 0), 0)

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.id_vendor) e.id_vendor = 'Vendor wajib dipilih'
        if (mode === 'trip' && !form.id_kontrak_vendor) e.id_kontrak_vendor = 'Kontrak wajib dipilih untuk mode Berdasarkan Trip'
        if (!form.nomor_invoice.trim()) e.nomor_invoice = 'Nomor invoice wajib diisi'
        if (!form.tanggal_invoice) e.tanggal_invoice = 'Tanggal invoice wajib diisi'
        if (!form.dpp) e.dpp = 'DPP wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setLoading(true)
        try {
            const created = await invoiceVendorService.create({
                id_vendor: form.id_vendor,
                id_kontrak_vendor: form.id_kontrak_vendor || null,
                nomor_invoice: form.nomor_invoice.trim(),
                tanggal_invoice: form.tanggal_invoice,
                jatuh_tempo: form.jatuh_tempo || null,
                no_po: form.no_po.trim() || null,
                no_kontrak: form.no_kontrak.trim() || null,
                nopol: form.nopol.trim() || null,
                tipe_kendaraan: form.tipe_kendaraan.trim() || null,
                tipe_pembayaran: form.tipe_pembayaran || null,
                top_hari: form.tipe_pembayaran === 'top' && form.top_hari ? Number(form.top_hari) : null,
                periode_dari: form.periode_dari || null,
                periode_sampai: form.periode_sampai || null,
                dpp: Number(form.dpp),
                ppn: form.ppn ? Number(form.ppn) : 0,
                pph: form.pph ? Number(form.pph) : 0,
                keterangan: form.keterangan.trim() || null,
                ...(mode === 'trip' && tripIdsChecked.length > 0 ? { trip_ids: tripIdsChecked } : {}),
            })
            toast.push(<Notification type="success" title="Invoice berhasil ditambahkan" />)
            router.push(ROUTES.INVOICE_VENDOR_DETAIL(created.id_invoice_vendor))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Tambah Invoice Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Catat tagihan baru dari vendor</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="flex items-center gap-2 mb-4">
                    <Button type="button" size="sm" variant={mode === 'trip' ? 'solid' : 'default'} onClick={() => setMode('trip')}>
                        Berdasarkan Trip
                    </Button>
                    <Button type="button" size="sm" variant={mode === 'manual' ? 'solid' : 'default'} onClick={() => setMode('manual')}>
                        Manual
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Vendor" asterisk invalid={!!errors.id_vendor} errorMessage={errors.id_vendor}>
                        <Select isSearchable placeholder="Pilih vendor..."
                            options={vendorOptions}
                            value={vendorOptions.find(o => o.value === form.id_vendor) ?? null}
                            onChange={opt => setForm(p => ({
                                ...p,
                                id_vendor: opt?.value ?? '',
                                id_kontrak_vendor: '',
                                jatuh_tempo: jatuhTempoManual ? p.jatuh_tempo : '',
                            }))} />
                    </FormItem>
                    <FormItem label="Kontrak" asterisk={mode === 'trip'} invalid={!!errors.id_kontrak_vendor} errorMessage={errors.id_kontrak_vendor}
                        extra={selectedKontrak?.termin_pembayaran_hari
                            ? <span className="text-xs text-gray-400">Termin {selectedKontrak.termin_pembayaran_hari} hari — jatuh tempo terisi otomatis</span>
                            : undefined}>
                        <Select isSearchable isClearable placeholder={mode === 'trip' ? 'Pilih kontrak...' : 'Pilih kontrak (opsional)...'}
                            options={kontrakOptions}
                            value={kontrakOptions.find(o => o.value === form.id_kontrak_vendor) ?? null}
                            onChange={opt => handleKontrakChange(opt?.value ?? '')} />
                    </FormItem>

                    {mode === 'trip' && (
                        <div className="sm:col-span-2 mb-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                                <div>
                                    <p className="text-sm font-semibold">Trip Siap Ditagih</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Trip selesai & belum masuk invoice lain</p>
                                </div>
                                <div className="w-56">
                                    <Select isSearchable isClearable placeholder="Filter proyek (opsional)..."
                                        options={proyekOptions}
                                        value={proyekOptions.find(o => o.value === filterProyek) ?? null}
                                        onChange={opt => setFilterProyek(opt?.value ?? '')} />
                                </div>
                            </div>
                            {!form.id_kontrak_vendor ? (
                                <p className="text-sm text-gray-400 py-4 text-center">Pilih kontrak terlebih dahulu.</p>
                            ) : loadingTrip ? (
                                <div className="flex justify-center py-6"><Spinner size={28} /></div>
                            ) : tripList.length === 0 ? (
                                <p className="text-sm text-gray-400 py-4 text-center">Tidak ada trip selesai yang siap ditagih untuk kontrak ini.</p>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                                <tr>
                                                    <th className="py-2 px-3 w-10">
                                                        <Checkbox checked={semuaTripTercentang}
                                                            onChange={checked => setTripChecked(Object.fromEntries(tripList.map(t => [t.id_trip, checked])))} />
                                                    </th>
                                                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tanggal</th>
                                                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Nopol</th>
                                                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Driver</th>
                                                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Proyek</th>
                                                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Rute</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {tripList.map(t => (
                                                    <tr key={t.id_trip}>
                                                        <td className="py-2 px-3">
                                                            <Checkbox checked={!!tripChecked[t.id_trip]}
                                                                onChange={checked => setTripChecked(p => ({ ...p, [t.id_trip]: checked }))} />
                                                        </td>
                                                        <td className="py-2 px-3 whitespace-nowrap">{dayjs(t.tanggal).format('DD/MM/YYYY')}</td>
                                                        <td className="py-2 px-3 font-mono">{t.nopol ?? '—'}</td>
                                                        <td className="py-2 px-3">{t.driver_nama ?? '—'}</td>
                                                        <td className="py-2 px-3">{t.nama_proyek}</td>
                                                        <td className="py-2 px-3">{t.rute ?? '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <span className="text-xs text-gray-400">{tripIdsChecked.length} dari {tripList.length} trip dipilih</span>
                                        {selectedKontrak?.satuan === 'per trip' && !!selectedKontrak?.rate && (
                                            <span className="text-xs text-gray-500">
                                                {tripIdsChecked.length} trip × {formatRupiah(selectedKontrak.rate)} = <span className="font-semibold text-gray-700 dark:text-gray-300">{formatRupiah(tripIdsChecked.length * selectedKontrak.rate)}</span>
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <FormItem label="Nomor Invoice" asterisk invalid={!!errors.nomor_invoice} errorMessage={errors.nomor_invoice}>
                        <Input placeholder="Contoh: INV/2026/001" value={form.nomor_invoice} invalid={!!errors.nomor_invoice}
                            onChange={e => setForm(p => ({ ...p, nomor_invoice: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Tanggal Invoice" asterisk invalid={!!errors.tanggal_invoice} errorMessage={errors.tanggal_invoice}>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_invoice ? dayjs(form.tanggal_invoice).toDate() : null}
                            onChange={date => handleTanggalInvoiceChange(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </FormItem>
                    <FormItem label="Tipe Pembayaran">
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <Select isSearchable={false} isClearable placeholder="Pilih tipe pembayaran..."
                                    options={tipePembayaranOptions}
                                    value={tipePembayaranOptions.find(o => o.value === form.tipe_pembayaran) ?? null}
                                    onChange={opt => setForm(p => {
                                        const tipe = opt?.value ?? ''
                                        const next = { ...p, tipe_pembayaran: tipe }
                                        if (tipe !== 'top') next.top_hari = ''
                                        else if (p.top_hari && p.tanggal_invoice && !jatuhTempoManual)
                                            next.jatuh_tempo = dayjs(p.tanggal_invoice).add(Number(p.top_hari), 'day').format('YYYY-MM-DD')
                                        return next
                                    })} />
                            </div>
                            {form.tipe_pembayaran === 'top' && (
                                <Input className="w-28" suffix="hari" placeholder="0"
                                    value={form.top_hari}
                                    onChange={e => {
                                        const v = e.target.value.replace(/\D/g, '')
                                        setForm(p => ({
                                            ...p,
                                            top_hari: v,
                                            jatuh_tempo: v && p.tanggal_invoice && !jatuhTempoManual
                                                ? dayjs(p.tanggal_invoice).add(Number(v), 'day').format('YYYY-MM-DD')
                                                : p.jatuh_tempo,
                                        }))
                                    }} />
                            )}
                        </div>
                    </FormItem>
                    <FormItem label="Jatuh Tempo"
                        extra={form.tipe_pembayaran === 'top' && form.top_hari
                            ? <span className="text-xs text-gray-400">Terisi otomatis dari TOP {form.top_hari} hari</span>
                            : undefined}>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.jatuh_tempo ? dayjs(form.jatuh_tempo).toDate() : null}
                            onChange={date => {
                                setJatuhTempoManual(!!date)
                                setForm(p => ({ ...p, jatuh_tempo: date ? dayjs(date).format('YYYY-MM-DD') : '' }))
                            }} />
                    </FormItem>
                    <FormItem label="No. PO">
                        <Input placeholder="Nomor purchase order" value={form.no_po}
                            onChange={e => setForm(p => ({ ...p, no_po: e.target.value }))} />
                    </FormItem>
                    <FormItem label="No. Kontrak"
                        extra={selectedKontrak ? <span className="text-xs text-gray-400">Terisi otomatis dari kontrak terpilih</span> : undefined}>
                        <Input placeholder="Nomor kontrak vendor" value={form.no_kontrak} disabled
                            onChange={e => setForm(p => ({ ...p, no_kontrak: e.target.value }))} />
                    </FormItem>
                    {selectedKontrak && (
                        <>
                            <FormItem label="Mekanisme Kontrak">
                                <Input disabled value={MEKANISME_LABEL[selectedKontrak.mekanisme] ?? selectedKontrak.mekanisme} />
                            </FormItem>
                            <FormItem label="Nilai Kontrak">
                                <Input disabled prefix="Rp" value={selectedKontrak.nilai_kontrak ? formatNum(selectedKontrak.nilai_kontrak) : '0'} />
                            </FormItem>
                        </>
                    )}
                    {mode === 'manual' && (
                    <FormItem label="Nopol">
                        <Select isSearchable isClearable placeholder="Pilih unit vendor..."
                            options={nopolOptions}
                            value={nopolOptions.find(o => o.value === form.nopol) ?? null}
                            onChange={opt => setForm(p => ({
                                ...p,
                                nopol: opt?.value ?? '',
                                tipe_kendaraan: opt?.tipe ? opt.tipe : p.tipe_kendaraan,
                            }))} />
                    </FormItem>
                    )}
                    {mode === 'manual' && (
                    <FormItem label="Tipe Kendaraan">
                        <Input placeholder="mis. Tronton, CDD" value={form.tipe_kendaraan}
                            onChange={e => setForm(p => ({ ...p, tipe_kendaraan: e.target.value }))} />
                    </FormItem>
                    )}
                    {/* Periode Dari/Sampai dinonaktifkan sementara — buka lagi kalau dibutuhkan:
                    <FormItem label="Periode Dari" extra="Periode kerja yang ditagihkan — dipakai pencocokan rekon invoice">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.periode_dari ? dayjs(form.periode_dari).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, periode_dari: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Periode Sampai">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.periode_sampai ? dayjs(form.periode_sampai).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, periode_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    */}
                    <FormItem label="DPP" asterisk invalid={!!errors.dpp} errorMessage={errors.dpp}
                        extra={mode === 'trip' && selectedKontrak?.satuan === 'per trip' && tripIdsChecked.length > 0
                            ? <span className="text-xs text-gray-400">Otomatis: {tripIdsChecked.length} trip × rate kontrak — bisa diubah manual</span>
                            : undefined}>
                        <Input prefix="Rp" placeholder="0" invalid={!!errors.dpp}
                            value={form.dpp ? formatNum(Number(form.dpp)) : ''}
                            onChange={e => {
                                dppManual.current = true
                                setForm(p => ({ ...p, dpp: e.target.value.replace(/\D/g, '') }))
                            }} />
                    </FormItem>
                    <FormItem label="PPN">
                        <div className="flex items-center gap-2">
                            <Input className="flex-1" prefix="Rp" placeholder="0"
                                value={form.ppn ? formatNum(Number(form.ppn)) : ''}
                                onChange={e => {
                                    ppnManual.current = true
                                    setForm(p => ({ ...p, ppn: e.target.value.replace(/\D/g, '') }))
                                }} />
                            <Input className="w-24" suffix="%" placeholder="0"
                                value={ppnPersen}
                                onChange={e => {
                                    ppnManual.current = false
                                    setPpnPersen(e.target.value.replace(/[^0-9.]/g, ''))
                                }} />
                        </div>
                    </FormItem>
                    <FormItem label="PPh">
                        <div className="flex items-center gap-2">
                            <Input className="flex-1" prefix="Rp" placeholder="0"
                                value={form.pph ? formatNum(Number(form.pph)) : ''}
                                onChange={e => {
                                    pphManual.current = true
                                    setForm(p => ({ ...p, pph: e.target.value.replace(/\D/g, '') }))
                                }} />
                            <Input className="w-24" suffix="%" placeholder="0"
                                value={pphPersen}
                                onChange={e => {
                                    pphManual.current = false
                                    setPphPersen(e.target.value.replace(/[^0-9.]/g, ''))
                                }} />
                        </div>
                    </FormItem>
                    <div className="sm:col-span-2 flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mb-4">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total (DPP + PPN - PPh)</span>
                        <span className="font-bold text-lg tabular-nums">{formatRupiah(total)}</span>
                    </div>
                    <div className="sm:col-span-2">
                        <FormItem label="Keterangan">
                            <Input textArea rows={3} placeholder="Keterangan tambahan..."
                                value={form.keterangan}
                                onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                        </FormItem>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button type="submit" variant="solid" loading={loading}>Simpan</Button>
                </div>
                </form>
            </Card>
        </div>
    )
}
