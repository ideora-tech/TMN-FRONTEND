'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Button, Dialog, FormItem, Input, Upload, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import dayjs from 'dayjs'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineDocumentText, HiPlusCircle, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { invoiceVendorService, InvoiceVendor, PembayaranVendor } from '@/services/invoice-vendor.service'
import { KontrakVendor } from '@/services/vendor.service'
import { STATUS_TAG, STATUS_LABEL, BAYAR_TAG, BAYAR_LABEL } from '../DaftarInvoiceTab'

const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'Full',
}

const METODE_OPTIONS = [
    { value: 'transfer', label: 'Transfer' },
    { value: 'tunai',    label: 'Tunai' },
    { value: 'giro',     label: 'Giro' },
]

const METODE_LABEL: Record<string, string> = {
    transfer: 'Transfer', tunai: 'Tunai', giro: 'Giro',
}

const BAYAR_FORM_KOSONG = {
    tanggal_bayar: dayjs().format('YYYY-MM-DD'),
    nominal: '', metode: '', bank_pengirim: '', no_referensi: '', catatan: '',
}

export default function InvoiceVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]       = useState<InvoiceVendor | null>(null)
    const [loading, setLoading] = useState(true)

    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState({
        id_kontrak_vendor: '', nomor_invoice: '', tanggal_invoice: '', jatuh_tempo: '',
        no_po: '', no_do: '', dpp: '', ppn: '', pph: '', keterangan: '',
    })
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const [saving, setSaving]         = useState(false)
    const [kontrakList, setKontrakList] = useState<KontrakVendor[]>([])

    const [showVerifikasi, setShowVerifikasi] = useState(false)
    const [verifying, setVerifying]           = useState(false)
    const [showTolak, setShowTolak]           = useState(false)
    const [catatanTolak, setCatatanTolak]     = useState('')
    const [tolakError, setTolakError]         = useState('')
    const [rejecting, setRejecting]           = useState(false)

    const [showBayar, setShowBayar]     = useState(false)
    const [bayarForm, setBayarForm]     = useState({ ...BAYAR_FORM_KOSONG })
    const [bayarErrors, setBayarErrors] = useState<Record<string, string>>({})
    const [buktiFile, setBuktiFile]     = useState<File | null>(null)
    const [savingBayar, setSavingBayar] = useState(false)
    const [deleteBayarTarget, setDeleteBayarTarget] = useState<PembayaranVendor | null>(null)
    const [deletingBayar, setDeletingBayar]         = useState(false)

    const toFormState = (d: InvoiceVendor) => ({
        id_kontrak_vendor: d.id_kontrak_vendor ?? '',
        nomor_invoice:     d.nomor_invoice,
        tanggal_invoice:   d.tanggal_invoice,
        jatuh_tempo:       d.jatuh_tempo ?? '',
        no_po:             d.no_po ?? '',
        no_do:             d.no_do ?? '',
        dpp:               String(d.dpp ?? ''),
        ppn:               d.ppn ? String(d.ppn) : '',
        pph:               d.pph ? String(d.pph) : '',
        keterangan:        d.keterangan ?? '',
    })

    const fetchDetail = useCallback(async () => {
        try {
            const d = await invoiceVendorService.get(id)
            setData(d)
            setForm(toFormState(d))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { fetchDetail() }, [fetchDetail])

    useEffect(() => {
        if (!editing || !data?.id_vendor) return
        axios.get(API_ENDPOINTS.KONTRAK_VENDOR, { params: { id_vendor: data.id_vendor, limit: 999 } })
            .then(r => setKontrakList(r.data.data as KontrakVendor[]))
            .catch(() => setKontrakList([]))
    }, [editing, data?.id_vendor])

    const kontrakOptions = kontrakList.map(k => ({
        value: k.id_kontrak_vendor,
        label: `${k.nomor_kontrak ?? 'Tanpa nomor'} · ${MEKANISME_LABEL[k.mekanisme] ?? k.mekanisme}`,
    }))

    const totalEdit = Math.max((Number(form.dpp) || 0) + (Number(form.ppn) || 0) - (Number(form.pph) || 0), 0)

    const validateEdit = () => {
        const e: Record<string, string> = {}
        if (!form.nomor_invoice.trim()) e.nomor_invoice = 'Nomor invoice wajib diisi'
        if (!form.tanggal_invoice) e.tanggal_invoice = 'Tanggal invoice wajib diisi'
        if (!form.dpp) e.dpp = 'DPP wajib diisi'
        setFormErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validateEdit()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            return
        }
        setSaving(true)
        try {
            const updated = await invoiceVendorService.update(id, {
                id_kontrak_vendor: form.id_kontrak_vendor || null,
                nomor_invoice: form.nomor_invoice.trim(),
                tanggal_invoice: form.tanggal_invoice,
                jatuh_tempo: form.jatuh_tempo || null,
                no_po: form.no_po.trim() || null,
                no_do: form.no_do.trim() || null,
                dpp: Number(form.dpp),
                ppn: form.ppn ? Number(form.ppn) : 0,
                pph: form.pph ? Number(form.pph) : 0,
                keterangan: form.keterangan.trim() || null,
            })
            setData(updated)
            setForm(toFormState(updated))
            setEditing(false)
            setFormErrors({})
            toast.push(<Notification type="success" title="Invoice berhasil diperbarui" />)
            fetchDetail()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleVerifikasi = async () => {
        setVerifying(true)
        try {
            await invoiceVendorService.verifikasi(id, 'verifikasi')
            toast.push(<Notification type="success" title="Invoice berhasil diverifikasi" />)
            setShowVerifikasi(false)
            fetchDetail()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setVerifying(false)
        }
    }

    const handleTolak = async () => {
        if (!catatanTolak.trim()) {
            setTolakError('Catatan penolakan wajib diisi')
            return
        }
        setRejecting(true)
        try {
            await invoiceVendorService.verifikasi(id, 'tolak', catatanTolak.trim())
            toast.push(<Notification type="success" title="Invoice ditolak" />)
            setShowTolak(false)
            setCatatanTolak('')
            setTolakError('')
            fetchDetail()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setRejecting(false)
        }
    }

    const sisa         = data?.sisa ?? 0
    const totalDibayar = data?.total_dibayar ?? 0
    const pembayaran   = data?.pembayaran ?? []

    const validateBayar = () => {
        const e: Record<string, string> = {}
        if (!bayarForm.tanggal_bayar) e.tanggal_bayar = 'Tanggal bayar wajib diisi'
        if (!bayarForm.nominal || Number(bayarForm.nominal) <= 0) e.nominal = 'Nominal wajib diisi'
        else if (Number(bayarForm.nominal) > sisa) e.nominal = 'Nominal melebihi sisa tagihan'
        if (!bayarForm.metode) e.metode = 'Metode wajib dipilih'
        setBayarErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSimpanBayar = async () => {
        if (!validateBayar()) return
        setSavingBayar(true)
        try {
            await invoiceVendorService.createPembayaran(id, {
                tanggal_bayar: bayarForm.tanggal_bayar,
                nominal: Number(bayarForm.nominal),
                metode: bayarForm.metode as 'transfer' | 'tunai' | 'giro',
                bank_pengirim: bayarForm.bank_pengirim.trim() || null,
                no_referensi: bayarForm.no_referensi.trim() || null,
                catatan: bayarForm.catatan.trim() || null,
            }, buktiFile)
            toast.push(<Notification type="success" title="Pembayaran berhasil dicatat" />)
            setShowBayar(false)
            setBayarForm({ ...BAYAR_FORM_KOSONG })
            setBayarErrors({})
            setBuktiFile(null)
            fetchDetail()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingBayar(false)
        }
    }

    const handleDeleteBayar = async () => {
        if (!deleteBayarTarget) return
        setDeletingBayar(true)
        try {
            await invoiceVendorService.deletePembayaran(id, deleteBayarTarget.id_pembayaran_vendor)
            toast.push(<Notification type="success" title="Pembayaran berhasil dihapus" />)
            setDeleteBayarTarget(null)
            fetchDetail()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeletingBayar(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Invoice tidak ditemukan.</div>

    const bisaBayar = data.status === 'diverifikasi' && sisa > 0

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => router.push(ROUTES.INVOICE_VENDOR)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                        <HiArrowLeft className="text-xl" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold font-mono">{data.nomor_invoice}</h3>
                            <Tag className={STATUS_TAG[data.status] ?? 'bg-gray-100 text-gray-600'}>
                                {STATUS_LABEL[data.status] ?? data.status}
                            </Tag>
                            <Tag className={BAYAR_TAG[data.status_pembayaran] ?? 'bg-gray-100 text-gray-600'}>
                                {BAYAR_LABEL[data.status_pembayaran] ?? data.status_pembayaran}
                            </Tag>
                        </div>
                        <p className="text-gray-500 text-sm mt-0.5">{data.vendor?.nama_vendor ?? 'Invoice vendor'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {data.status === 'draft' && !editing && (
                        <>
                            <Button variant="solid" size="sm" icon={<HiOutlineCheckCircle />}
                                onClick={() => setShowVerifikasi(true)}>
                                Verifikasi
                            </Button>
                            <Button variant="default" size="sm" icon={<HiOutlineXCircle />}
                                customColorClass={() => 'text-red-500 hover:border-red-300 hover:ring-red-300 hover:text-red-500'}
                                onClick={() => { setShowTolak(true); setCatatanTolak(''); setTolakError('') }}>
                                Tolak
                            </Button>
                        </>
                    )}
                    {(data.status === 'draft' || data.status === 'ditolak') && !editing && (
                        <Button variant="default" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>
                            Edit
                        </Button>
                    )}
                </div>
            </div>

            {data.status === 'ditolak' && data.catatan_verifikasi && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    <strong>Invoice ditolak:</strong> {data.catatan_verifikasi}
                </div>
            )}

            <Card>
                {!editing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                        {([
                            {
                                label: 'Vendor',
                                value: data.vendor
                                    ? <Link href={ROUTES.VENDOR_DETAIL(data.vendor.id_vendor)} className="text-blue-500 hover:underline">{data.vendor.nama_vendor}</Link>
                                    : <span className="text-gray-400">—</span>,
                            },
                            { label: 'Kontrak',         value: data.kontrak?.nomor_kontrak ?? <span className="text-gray-400">—</span> },
                            { label: 'Tanggal Invoice', value: dayjs(data.tanggal_invoice).format('DD MMM YYYY') },
                            {
                                label: 'Jatuh Tempo',
                                value: data.jatuh_tempo
                                    ? <span className={dayjs(data.jatuh_tempo).isBefore(dayjs(), 'day') && data.status_pembayaran !== 'lunas' ? 'text-red-500' : ''}>{dayjs(data.jatuh_tempo).format('DD MMM YYYY')}</span>
                                    : <span className="text-gray-400">—</span>,
                            },
                            { label: 'No. PO', value: data.no_po ?? <span className="text-gray-400">—</span> },
                            { label: 'No. DO', value: data.no_do ?? <span className="text-gray-400">—</span> },
                            { label: 'DPP',    value: formatRupiah(data.dpp) },
                            { label: 'PPN',    value: formatRupiah(data.ppn) },
                            { label: 'PPh',    value: formatRupiah(data.pph) },
                            { label: 'Total',  value: <span className="font-bold">{formatRupiah(data.total)}</span> },
                            { label: 'Keterangan', value: data.keterangan ?? <span className="text-gray-400">—</span> },
                            ...(data.catatan_verifikasi ? [{
                                label: 'Catatan Verifikasi',
                                value: <span className={data.status === 'ditolak' ? 'text-red-500' : ''}>{data.catatan_verifikasi}</span>,
                            }] : []),
                        ]).map(({ label, value }) => (
                            <div key={label}>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="mb-5">
                            <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Invoice Vendor</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {data.status === 'ditolak'
                                    ? 'Perbarui data — setelah disimpan status kembali menjadi Draft'
                                    : 'Perbarui informasi invoice di bawah ini'}
                            </p>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Kontrak">
                                <Select isSearchable isClearable placeholder="Pilih kontrak (opsional)..."
                                    options={kontrakOptions}
                                    value={kontrakOptions.find(o => o.value === form.id_kontrak_vendor) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, id_kontrak_vendor: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Nomor Invoice" asterisk invalid={!!formErrors.nomor_invoice} errorMessage={formErrors.nomor_invoice}>
                                <Input value={form.nomor_invoice} invalid={!!formErrors.nomor_invoice}
                                    onChange={e => setForm(p => ({ ...p, nomor_invoice: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Tanggal Invoice" asterisk invalid={!!formErrors.tanggal_invoice} errorMessage={formErrors.tanggal_invoice}>
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={form.tanggal_invoice ? dayjs(form.tanggal_invoice).toDate() : null}
                                    onChange={date => setForm(p => ({ ...p, tanggal_invoice: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="Jatuh Tempo">
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={form.jatuh_tempo ? dayjs(form.jatuh_tempo).toDate() : null}
                                    onChange={date => setForm(p => ({ ...p, jatuh_tempo: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="No. PO">
                                <Input value={form.no_po} onChange={e => setForm(p => ({ ...p, no_po: e.target.value }))} />
                            </FormItem>
                            <FormItem label="No. DO">
                                <Input value={form.no_do} onChange={e => setForm(p => ({ ...p, no_do: e.target.value }))} />
                            </FormItem>
                            <FormItem label="DPP" asterisk invalid={!!formErrors.dpp} errorMessage={formErrors.dpp}>
                                <Input prefix="Rp" placeholder="0" invalid={!!formErrors.dpp}
                                    value={form.dpp ? formatNum(Number(form.dpp)) : ''}
                                    onChange={e => setForm(p => ({ ...p, dpp: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="PPN">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.ppn ? formatNum(Number(form.ppn)) : ''}
                                    onChange={e => setForm(p => ({ ...p, ppn: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="PPh">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.pph ? formatNum(Number(form.pph)) : ''}
                                    onChange={e => setForm(p => ({ ...p, pph: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mb-4 self-start">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</span>
                                <span className="font-bold text-lg tabular-nums">{formatRupiah(totalEdit)}</span>
                            </div>
                            <div className="sm:col-span-2">
                                <FormItem label="Keterangan">
                                    <Input textArea rows={3} value={form.keterangan}
                                        onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                                </FormItem>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => {
                                setEditing(false)
                                setForm(toFormState(data))
                                setFormErrors({})
                            }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Pembayaran</p>
                        <p className="text-xs text-gray-400 mt-0.5">Pencatatan pembayaran hanya untuk invoice terverifikasi</p>
                    </div>
                    {bisaBayar ? (
                        <Button size="sm" variant="solid" icon={<HiPlusCircle />}
                            onClick={() => { setShowBayar(true); setBayarForm({ ...BAYAR_FORM_KOSONG }); setBayarErrors({}); setBuktiFile(null) }}>
                            Catat Pembayaran
                        </Button>
                    ) : (
                        <Tooltip title={data.status !== 'diverifikasi' ? 'Invoice belum diverifikasi' : 'Tagihan sudah lunas'}>
                            <span>
                                <Button size="sm" variant="solid" icon={<HiPlusCircle />} disabled>
                                    Catat Pembayaran
                                </Button>
                            </span>
                        </Tooltip>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                        <p className="text-xs text-gray-500 mb-1">Total Tagihan</p>
                        <p className="font-semibold text-sm tabular-nums">{formatRupiah(data.total)}</p>
                    </div>
                    <div className="rounded-lg p-3 bg-emerald-50 dark:bg-emerald-500/10">
                        <p className="text-xs text-gray-500 mb-1">Sudah Dibayar</p>
                        <p className="font-semibold text-sm tabular-nums text-emerald-600 dark:text-emerald-400">{formatRupiah(totalDibayar)}</p>
                    </div>
                    <div className="rounded-lg p-3 bg-amber-50 dark:bg-amber-500/10">
                        <p className="text-xs text-gray-500 mb-1">Sisa</p>
                        <p className="font-semibold text-sm tabular-nums text-amber-600 dark:text-amber-400">{formatRupiah(sisa)}</p>
                    </div>
                </div>

                {pembayaran.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada pembayaran tercatat</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Tanggal</th>
                                    <th className="py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Nominal</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Metode</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Bank</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">No. Referensi</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Bukti</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {pembayaran.map(p => (
                                    <tr key={p.id_pembayaran_vendor}>
                                        <td className="py-3 pr-4 whitespace-nowrap text-gray-800 dark:text-gray-200">
                                            {dayjs(p.tanggal_bayar).format('DD MMM YYYY')}
                                        </td>
                                        <td className="py-3 pr-4 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-200">
                                            {formatRupiah(p.nominal)}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                                                {METODE_LABEL[p.metode] ?? p.metode}
                                            </Tag>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{p.bank_pengirim ?? <span className="text-gray-400">—</span>}</td>
                                        <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{p.no_referensi ?? <span className="text-gray-400">—</span>}</td>
                                        <td className="py-3 pr-4">
                                            {p.url_bukti
                                                ? <a href={p.url_bukti} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Lihat</a>
                                                : <span className="text-gray-400 text-xs">—</span>}
                                        </td>
                                        <td className="py-3 text-right whitespace-nowrap">
                                            <Tooltip title="Hapus">
                                                <span
                                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                    onClick={() => setDeleteBayarTarget(p)}
                                                >
                                                    <HiOutlineTrash className="text-lg" />
                                                </span>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <ConfirmDialog isOpen={showVerifikasi} type="info" title="Verifikasi Invoice"
                confirmText="Ya, Verifikasi" cancelText="Batal"
                onClose={() => setShowVerifikasi(false)} onCancel={() => setShowVerifikasi(false)}
                onConfirm={handleVerifikasi}
                confirmButtonProps={{ loading: verifying }}>
                <p>Verifikasi invoice {data.nomor_invoice}? Setelah diverifikasi, invoice tidak dapat diubah dan pembayaran dapat dicatat.</p>
            </ConfirmDialog>

            <Dialog isOpen={showTolak} onRequestClose={() => setShowTolak(false)} onClose={() => setShowTolak(false)}>
                <h5 className="font-bold mb-1">Tolak Invoice</h5>
                <p className="text-sm text-gray-500 mb-4">{data.nomor_invoice} · {data.vendor?.nama_vendor ?? '—'}</p>
                <form onSubmit={e => { e.preventDefault(); handleTolak() }}>
                    <FormItem label="Catatan Penolakan" asterisk invalid={!!tolakError} errorMessage={tolakError}>
                        <Input textArea rows={3} placeholder="Alasan invoice ditolak..."
                            invalid={!!tolakError}
                            value={catatanTolak}
                            onChange={e => { setCatatanTolak(e.target.value); if (tolakError) setTolakError('') }} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setShowTolak(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={rejecting}
                            customColorClass={() => 'bg-red-500 hover:bg-red-600 text-white'}>
                            Tolak Invoice
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={showBayar} onRequestClose={() => setShowBayar(false)} onClose={() => setShowBayar(false)}>
                <h5 className="font-bold mb-1">Catat Pembayaran</h5>
                <p className="text-sm text-gray-500 mb-4">{data.nomor_invoice} · Sisa tagihan {formatRupiah(sisa)}</p>
                <form onSubmit={e => { e.preventDefault(); handleSimpanBayar() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Tanggal Bayar" asterisk invalid={!!bayarErrors.tanggal_bayar} errorMessage={bayarErrors.tanggal_bayar}>
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={bayarForm.tanggal_bayar ? dayjs(bayarForm.tanggal_bayar).toDate() : null}
                                onChange={date => setBayarForm(p => ({ ...p, tanggal_bayar: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                        </FormItem>
                        <FormItem label="Nominal" asterisk invalid={!!bayarErrors.nominal} errorMessage={bayarErrors.nominal}
                            extra={<span className="text-xs text-gray-400">Sisa tagihan {formatRupiah(sisa)}</span>}>
                            <Input prefix="Rp" placeholder="0" invalid={!!bayarErrors.nominal}
                                value={bayarForm.nominal ? formatNum(Number(bayarForm.nominal)) : ''}
                                onChange={e => setBayarForm(p => ({ ...p, nominal: e.target.value.replace(/\D/g, '') }))} />
                        </FormItem>
                        <FormItem label="Metode" asterisk invalid={!!bayarErrors.metode} errorMessage={bayarErrors.metode}>
                            <Select isSearchable={false} placeholder="Pilih metode..."
                                options={METODE_OPTIONS}
                                value={METODE_OPTIONS.find(o => o.value === bayarForm.metode) ?? null}
                                onChange={opt => setBayarForm(p => ({ ...p, metode: opt?.value ?? '' }))} />
                        </FormItem>
                        <FormItem label="Bank Pengirim">
                            <Input placeholder="Contoh: BCA" value={bayarForm.bank_pengirim}
                                onChange={e => setBayarForm(p => ({ ...p, bank_pengirim: e.target.value }))} />
                        </FormItem>
                        <FormItem label="No. Referensi">
                            <Input placeholder="Nomor referensi transfer" value={bayarForm.no_referensi}
                                onChange={e => setBayarForm(p => ({ ...p, no_referensi: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Bukti Pembayaran">
                            <Upload accept=".pdf,.jpg,.jpeg,.png" showList={false} uploadLimit={1}
                                onChange={files => setBuktiFile(files[0] ?? null)}>
                                <Button type="button" variant="default" size="sm" icon={<HiOutlineDocumentText />}>
                                    {buktiFile ? buktiFile.name : 'Pilih file (PDF/JPG/PNG)'}
                                </Button>
                            </Upload>
                            {buktiFile && (
                                <button type="button" className="text-xs text-red-400 hover:text-red-600 mt-1.5 block"
                                    onClick={() => setBuktiFile(null)}>Hapus pilihan</button>
                            )}
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Catatan">
                                <Input textArea rows={2} placeholder="Catatan pembayaran..."
                                    value={bayarForm.catatan}
                                    onChange={e => setBayarForm(p => ({ ...p, catatan: e.target.value }))} />
                            </FormItem>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setShowBayar(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={savingBayar}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={!!deleteBayarTarget} type="danger" title="Hapus Pembayaran"
                onClose={() => setDeleteBayarTarget(null)} onConfirm={handleDeleteBayar}
                confirmButtonProps={{ loading: deletingBayar }}>
                <p>Hapus pembayaran {deleteBayarTarget ? formatRupiah(deleteBayarTarget.nominal) : ''} tanggal {deleteBayarTarget ? dayjs(deleteBayarTarget.tanggal_bayar).format('DD MMM YYYY') : ''}? Status pembayaran invoice akan dihitung ulang.</p>
            </ConfirmDialog>
        </div>
    )
}
