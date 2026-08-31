'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Dialog, FormItem, Input, DatePicker, Tag, Tooltip, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiArrowLeft, HiPlusCircle, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineX, HiOutlineExclamationCircle } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { vendorService, Vendor, KontrakVendor, RekeningVendor } from '@/services/vendor.service'
import { dokumenVendorService, DokumenVendor } from '@/services/dokumenVendor.service'
import { armadaVendorService, ArmadaVendor } from '@/services/armadaVendor.service'
import { supirVendorService, SupirVendor } from '@/services/supirVendor.service'

type Mekanisme = 'unit_only' | 'unit_driver' | 'full'

const MEKANISME_OPTIONS = [
    { value: 'unit_only',   label: 'Unit Only' },
    { value: 'unit_driver', label: 'Unit + Driver' },
    { value: 'full',        label: 'Full' },
]

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

const JENIS_VENDOR_OPTIONS = [
    { value: 'Transporter',       label: 'Transporter' },
    { value: 'Supplier',          label: 'Supplier' },
    { value: 'Freight Forwarder', label: 'Freight Forwarder' },
    { value: 'Ekspedisi',         label: 'Ekspedisi' },
    { value: 'Lainnya',           label: 'Lainnya' },
]

const JENIS_DOKUMEN_OPTIONS = [
    { value: 'STNK',                label: 'STNK' },
    { value: 'KIR',                 label: 'KIR' },
    { value: 'SIM Supir',           label: 'SIM Supir' },
    { value: 'Profil Perusahaan',   label: 'Profil Perusahaan' },
    { value: 'Kontrak',             label: 'Kontrak' },
    { value: 'NPWP',                label: 'NPWP' },
    { value: 'NIB',                 label: 'NIB' },
    { value: 'SIUP',                label: 'SIUP' },
    { value: 'TDP',                 label: 'TDP' },
    { value: 'Akta Perusahaan',     label: 'Akta Perusahaan' },
    { value: 'PKP',                 label: 'PKP' },
    { value: 'Asuransi',            label: 'Asuransi' },
    { value: 'Sertifikat ISO',      label: 'Sertifikat ISO' },
    { value: 'Lainnya',             label: 'Lainnya' },
]

const MATA_UANG_OPTIONS = [
    { value: 'IDR', label: 'IDR' },
    { value: 'USD', label: 'USD' },
    { value: 'SGD', label: 'SGD' },
]

const SATUAN_OPTIONS = [
    { value: 'per trip',  label: 'Per Trip' },
    { value: 'per ton',   label: 'Per Ton' },
    { value: 'per hari',  label: 'Per Hari' },
    { value: 'per bulan', label: 'Per Bulan' },
    { value: 'lumpsum',   label: 'Lumpsum' },
]

const REKENING_FORM_KOSONG = { nama_bank: '', nomor_rekening: '', atas_nama: '', cabang: '', mata_uang: 'IDR' }

type RekeningFormErrors = Partial<Record<'nama_bank' | 'nomor_rekening' | 'atas_nama', string>>

function validateRekening(f: typeof REKENING_FORM_KOSONG): RekeningFormErrors {
    const e: RekeningFormErrors = {}
    if (!f.nama_bank.trim()) e.nama_bank = 'Nama bank wajib diisi'
    if (!f.nomor_rekening.trim()) e.nomor_rekening = 'Nomor rekening wajib diisi'
    if (!f.atas_nama.trim()) e.atas_nama = 'Atas nama wajib diisi'
    return e
}

// --- helpers ---

function getExpiryInfo(berlakuSampai: string | null): {
    label: string
    className: string
    daysLeft: number | null
    urgent: boolean
} {
    if (!berlakuSampai) return { label: '—', className: 'bg-gray-100 text-gray-400', daysLeft: null, urgent: false }
    const days = Math.ceil((new Date(berlakuSampai).getTime() - Date.now()) / 86400000)
    if (days < 0)   return { label: 'Habis Masa Berlaku', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',       daysLeft: days, urgent: true }
    if (days <= 14) return { label: `${days} hari lagi`, className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',   daysLeft: days, urgent: true }
    if (days <= 30) return { label: `${days} hari lagi`, className: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400', daysLeft: days, urgent: true }
    if (days <= 60) return { label: `${days} hari lagi`, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400', daysLeft: days, urgent: false }
    return { label: `${days} hari lagi`, className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', daysLeft: days, urgent: false }
}

function sortDokumen(list: DokumenVendor[]): DokumenVendor[] {
    return [...list].sort((a, b) => {
        if (!a.berlaku_sampai && !b.berlaku_sampai) return 0
        if (!a.berlaku_sampai) return 1
        if (!b.berlaku_sampai) return -1
        return new Date(a.berlaku_sampai).getTime() - new Date(b.berlaku_sampai).getTime()
    })
}

// --- component ---

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [vendor, setVendor]   = useState<Vendor | null>(null)
    const [kontraks, setKontraks] = useState<KontrakVendor[]>([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Vendor>>({})
    const [saving, setSaving]   = useState(false)
    const [errors, setErrors]   = useState<Partial<Record<keyof Vendor, string>>>({})
    const [showKontrakForm, setShowKontrakForm] = useState(false)
    const [kontrakForm, setKontrakForm] = useState({ mekanisme: 'unit_only' as Mekanisme, nomor_kontrak: '', jenis_layanan: '', rate: '', satuan: '', pajak_persen: '', termin_pembayaran_hari: '', nilai_kontrak: '', tanggal_mulai: '', tanggal_selesai: '' })
    const [addingKontrak, setAddingKontrak] = useState(false)

    // dokumen
    const [dokumen, setDokumen]         = useState<DokumenVendor[]>([])
    const [docLoading, setDocLoading]   = useState(false)
    const [showDocForm, setShowDocForm] = useState(false)
    const [docForm, setDocForm]         = useState({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' })
    const [docFile, setDocFile]         = useState<File | null>(null)
    const [addingDoc, setAddingDoc]     = useState(false)
    const [editDocTarget, setEditDocTarget] = useState<DokumenVendor | null>(null)
    const [editDocForm, setEditDocForm]     = useState({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' })
    const [editDocFile, setEditDocFile]     = useState<File | null>(null)
    const [updatingDoc, setUpdatingDoc]     = useState(false)
    const [deleteDocTarget, setDeleteDocTarget] = useState<DokumenVendor | null>(null)
    const [deletingDoc, setDeletingDoc]         = useState(false)

    // rekening bank
    const [rekening, setRekening]           = useState<RekeningVendor[]>([])
    const [rekLoading, setRekLoading]       = useState(false)
    const [showRekForm, setShowRekForm]     = useState(false)
    const [rekForm, setRekForm]             = useState({ ...REKENING_FORM_KOSONG })
    const [rekErrors, setRekErrors]         = useState<RekeningFormErrors>({})
    const [addingRek, setAddingRek]         = useState(false)
    const [editRekTarget, setEditRekTarget] = useState<RekeningVendor | null>(null)
    const [editRekForm, setEditRekForm]     = useState({ ...REKENING_FORM_KOSONG })
    const [editRekErrors, setEditRekErrors] = useState<RekeningFormErrors>({})
    const [updatingRek, setUpdatingRek]     = useState(false)
    const [deleteRekTarget, setDeleteRekTarget] = useState<RekeningVendor | null>(null)
    const [deletingRek, setDeletingRek]         = useState(false)

    // ringkasan armada & supir vendor
    const [armadaVendorList, setArmadaVendorList] = useState<ArmadaVendor[]>([])
    const [armadaVendorLoading, setArmadaVendorLoading] = useState(false)
    const [supirVendorList, setSupirVendorList]   = useState<SupirVendor[]>([])
    const [supirVendorLoading, setSupirVendorLoading]   = useState(false)

    const loadData = useCallback(async () => {
        try {
            const [v, k] = await Promise.all([vendorService.get(id), vendorService.listKontrak(id)])
            setVendor(v)
            setForm(v)
            setKontraks(k)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { loadData() }, [loadData])

    const fetchDokumen = useCallback(async () => {
        setDocLoading(true)
        try { setDokumen(await dokumenVendorService.list(id)) }
        catch (err) { toast.push(<Notification type="danger" title={parseApiError(err)} />) }
        finally { setDocLoading(false) }
    }, [id])

    useEffect(() => { fetchDokumen() }, [fetchDokumen])

    const fetchRekening = useCallback(async () => {
        setRekLoading(true)
        try { setRekening(await vendorService.listRekening(id)) }
        catch (err) { toast.push(<Notification type="danger" title={parseApiError(err)} />) }
        finally { setRekLoading(false) }
    }, [id])

    useEffect(() => { fetchRekening() }, [fetchRekening])

    const fetchArmadaVendor = useCallback(async () => {
        setArmadaVendorLoading(true)
        try {
            const res = await armadaVendorService.list(1, 5, id)
            setArmadaVendorList(res.data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setArmadaVendorLoading(false)
        }
    }, [id])

    useEffect(() => { fetchArmadaVendor() }, [fetchArmadaVendor])

    const fetchSupirVendor = useCallback(async () => {
        setSupirVendorLoading(true)
        try {
            const res = await supirVendorService.list(1, 5, id)
            setSupirVendorList(res.data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSupirVendorLoading(false)
        }
    }, [id])

    useEffect(() => { fetchSupirVendor() }, [fetchSupirVendor])

    const validate = () => {
        const e: Partial<Record<keyof Vendor, string>> = {}
        if (!form.kode_vendor?.trim()) e.kode_vendor = 'Kode vendor wajib diisi'
        if (!form.nama_vendor?.trim()) e.nama_vendor = 'Nama vendor wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setSaving(true)
        try {
            const updated = await vendorService.update(id, form)
            setVendor(updated)
            setEditing(false)
            setErrors({})
            toast.push(<Notification type="success" title="Data vendor berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleKontrakSubmit = async () => {
        setAddingKontrak(true)
        try {
            await vendorService.createKontrak({
                id_vendor: id,
                mekanisme: kontrakForm.mekanisme,
                nomor_kontrak: kontrakForm.nomor_kontrak || undefined,
                jenis_layanan: kontrakForm.jenis_layanan || undefined,
                rate: kontrakForm.rate ? Number(kontrakForm.rate) : undefined,
                satuan: kontrakForm.satuan || undefined,
                pajak_persen: kontrakForm.pajak_persen !== '' ? Number(kontrakForm.pajak_persen) : undefined,
                termin_pembayaran_hari: kontrakForm.termin_pembayaran_hari !== '' ? Number(kontrakForm.termin_pembayaran_hari) : undefined,
                nilai_kontrak: kontrakForm.nilai_kontrak ? Number(kontrakForm.nilai_kontrak) : undefined,
                tanggal_mulai: kontrakForm.tanggal_mulai || undefined,
                tanggal_selesai: kontrakForm.tanggal_selesai || undefined,
            })
            toast.push(<Notification type="success" title="Kontrak berhasil ditambahkan" />)
            setShowKontrakForm(false)
            setKontrakForm({ mekanisme: 'unit_only', nomor_kontrak: '', jenis_layanan: '', rate: '', satuan: '', pajak_persen: '', termin_pembayaran_hari: '', nilai_kontrak: '', tanggal_mulai: '', tanggal_selesai: '' })
            setKontraks(await vendorService.listKontrak(id))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAddingKontrak(false)
        }
    }

    // --- handlers dokumen ---
    const handleAddDokumen = async () => {
        if (!docForm.jenis_dokumen || !docFile) return
        setAddingDoc(true)
        try {
            await dokumenVendorService.create(id, {
                jenis_dokumen:  docForm.jenis_dokumen,
                nomor:          docForm.nomor || null,
                berlaku_sampai: docForm.berlaku_sampai || null,
            }, docFile)
            toast.push(<Notification type="success" title="Dokumen berhasil ditambahkan" />)
            setDocForm({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' })
            setDocFile(null); setShowDocForm(false)
            fetchDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setAddingDoc(false) }
    }

    const handleEditDokumen = async () => {
        if (!editDocTarget) return
        setUpdatingDoc(true)
        try {
            await dokumenVendorService.update(id, editDocTarget.id_dokumen_vendor, {
                jenis_dokumen:  editDocForm.jenis_dokumen,
                nomor:          editDocForm.nomor || null,
                berlaku_sampai: editDocForm.berlaku_sampai || null,
            }, editDocFile ?? undefined)
            toast.push(<Notification type="success" title="Dokumen berhasil diperbarui" />)
            setEditDocTarget(null); setEditDocFile(null)
            fetchDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setUpdatingDoc(false) }
    }

    const handleDeleteDokumen = async () => {
        if (!deleteDocTarget) return
        setDeletingDoc(true)
        try {
            await dokumenVendorService.delete(id, deleteDocTarget.id_dokumen_vendor)
            toast.push(<Notification type="success" title="Dokumen berhasil dihapus" />)
            setDeleteDocTarget(null); fetchDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setDeletingDoc(false) }
    }

    // --- handlers rekening bank ---
    const handleAddRekening = async () => {
        const e = validateRekening(rekForm)
        setRekErrors(e)
        if (Object.keys(e).length > 0) return
        setAddingRek(true)
        try {
            await vendorService.createRekening(id, {
                nama_bank:      rekForm.nama_bank,
                nomor_rekening: rekForm.nomor_rekening,
                atas_nama:      rekForm.atas_nama,
                cabang:         rekForm.cabang || null,
                mata_uang:      rekForm.mata_uang,
            })
            toast.push(<Notification type="success" title="Rekening berhasil ditambahkan" />)
            setRekForm({ ...REKENING_FORM_KOSONG }); setRekErrors({}); setShowRekForm(false)
            fetchRekening()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setAddingRek(false) }
    }

    const handleEditRekening = async () => {
        if (!editRekTarget) return
        const e = validateRekening(editRekForm)
        setEditRekErrors(e)
        if (Object.keys(e).length > 0) return
        setUpdatingRek(true)
        try {
            await vendorService.updateRekening(id, editRekTarget.id_rekening_vendor, {
                nama_bank:      editRekForm.nama_bank,
                nomor_rekening: editRekForm.nomor_rekening,
                atas_nama:      editRekForm.atas_nama,
                cabang:         editRekForm.cabang || null,
                mata_uang:      editRekForm.mata_uang,
            })
            toast.push(<Notification type="success" title="Rekening berhasil diperbarui" />)
            setEditRekTarget(null); setEditRekErrors({})
            fetchRekening()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setUpdatingRek(false) }
    }

    const handleDeleteRekening = async () => {
        if (!deleteRekTarget) return
        setDeletingRek(true)
        try {
            await vendorService.deleteRekening(id, deleteRekTarget.id_rekening_vendor)
            toast.push(<Notification type="success" title="Rekening berhasil dihapus" />)
            setDeleteRekTarget(null); fetchRekening()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setDeletingRek(false) }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!vendor) return <div className="p-6 text-red-500">Vendor tidak ditemukan.</div>

    const initial       = vendor.nama_vendor?.charAt(0).toUpperCase() ?? 'V'
    const sortedDokumen = sortDokumen(dokumen)
    const urgentCount   = sortedDokumen.filter(d => getExpiryInfo(d.berlaku_sampai).urgent).length

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.VENDOR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{vendor.nama_vendor}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi vendor dan kontrak</p>
                </div>
            </div>

            {/* Alert dokumen urgent */}
            {urgentCount > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    <HiOutlineExclamationCircle className="text-lg flex-shrink-0" />
                    <span><strong>{urgentCount} dokumen</strong> habis masa berlaku atau hampir habis masa berlaku — segera perbarui.</span>
                </div>
            )}

            {/* Vendor info card */}
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{vendor.nama_vendor}</p>
                                    <p className="text-sm text-gray-500 mt-1">{vendor.email ?? 'Tidak ada email'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${vendor.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {vendor.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Kode Vendor',       value: vendor.kode_vendor },
                                { label: 'Nama Vendor',       value: vendor.nama_vendor },
                                { label: 'Jenis Vendor',      value: vendor.jenis_vendor ?? <span className="text-gray-400">—</span> },
                                { label: 'PIC',               value: vendor.pic_nama ?? <span className="text-gray-400">—</span> },
                                { label: 'Telepon',           value: vendor.telepon ?? <span className="text-gray-400">—</span> },
                                { label: 'Email',             value: vendor.email ?? <span className="text-gray-400">—</span> },
                                { label: 'NPWP',              value: vendor.npwp ?? <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Bergabung', value: vendor.tanggal_bergabung ? dayjs(vendor.tanggal_bergabung).format('DD MMM YYYY') : <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                        {vendor.alamat && (
                            <div className="mt-5">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Alamat</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line">{vendor.alamat}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama_vendor?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Vendor</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi vendor di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Kode Vendor" asterisk invalid={!!errors.kode_vendor} errorMessage={errors.kode_vendor}>
                                <Input value={form.kode_vendor ?? ''} invalid={!!errors.kode_vendor} onChange={(e) => setForm(p => ({ ...p, kode_vendor: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nama Vendor" asterisk invalid={!!errors.nama_vendor} errorMessage={errors.nama_vendor}>
                                <Input value={form.nama_vendor ?? ''} invalid={!!errors.nama_vendor} onChange={(e) => setForm(p => ({ ...p, nama_vendor: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Jenis Vendor">
                                <Select
                                    isSearchable={false}
                                    isClearable
                                    placeholder="Pilih jenis vendor..."
                                    options={JENIS_VENDOR_OPTIONS}
                                    value={JENIS_VENDOR_OPTIONS.find(o => o.value === form.jenis_vendor) ?? null}
                                    onChange={(opt) => setForm(p => ({ ...p, jenis_vendor: opt?.value ?? null }))}
                                />
                            </FormItem>
                            <FormItem label="Nama PIC">
                                <Input value={form.pic_nama ?? ''} onChange={(e) => setForm(p => ({ ...p, pic_nama: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Telepon">
                                <Input value={form.telepon ?? ''} onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Email">
                                <Input type="email" value={form.email ?? ''} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                            </FormItem>
                            <FormItem label="NPWP">
                                <Input value={form.npwp ?? ''} onChange={(e) => setForm(p => ({ ...p, npwp: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Tanggal Bergabung">
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={form.tanggal_bergabung ? new Date(form.tanggal_bergabung) : null}
                                    onChange={(date) => setForm(p => ({ ...p, tanggal_bergabung: date ? dayjs(date).format('YYYY-MM-DD') : null }))}
                                />
                            </FormItem>
                            <FormItem label="Status">
                                <Select
                                    isSearchable={false}
                                    options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                                    onChange={(opt) => opt && setForm(p => ({ ...p, aktif: opt.value === '1' }))}
                                />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Alamat">
                                    <textarea
                                        rows={3}
                                        value={form.alamat ?? ''}
                                        onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                                    />
                                </FormItem>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(vendor); setErrors({}) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>

            {/* Dokumen Vendor */}
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Dokumen Vendor</p>
                        <p className="text-xs text-gray-400 mt-0.5">Diurutkan berdasarkan tanggal habis masa berlaku terdekat</p>
                    </div>
                    <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={() => setShowDocForm(v => !v)}>
                        Tambah Dokumen
                    </Button>
                </div>

                {/* Form tambah dokumen */}
                {showDocForm && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Jenis Dokumen" asterisk>
                                <Select isSearchable={false} placeholder="Pilih jenis..."
                                    options={JENIS_DOKUMEN_OPTIONS}
                                    value={JENIS_DOKUMEN_OPTIONS.find(o => o.value === docForm.jenis_dokumen) ?? null}
                                    onChange={opt => setDocForm(p => ({ ...p, jenis_dokumen: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Nomor Dokumen">
                                <Input placeholder="Contoh: 12/PKS/2026" value={docForm.nomor}
                                    onChange={e => setDocForm(p => ({ ...p, nomor: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Berlaku Sampai">
                                <DatePicker
                                    value={docForm.berlaku_sampai ? new Date(docForm.berlaku_sampai) : null}
                                    onChange={date => setDocForm(p => ({ ...p, berlaku_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="File Dokumen" asterisk>
                                <UploadBerkas
                                    file={docFile}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    label="Pilih file"
                                    hint="PDF/JPG/PNG"
                                    onChange={setDocFile}
                                />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button size="sm" variant="plain" icon={<HiOutlineX />}
                                onClick={() => { setShowDocForm(false); setDocFile(null); setDocForm({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' }) }}>
                                Batal
                            </Button>
                            <Button size="sm" variant="solid" loading={addingDoc}
                                disabled={!docForm.jenis_dokumen || !docFile}
                                onClick={handleAddDokumen}>
                                Simpan
                            </Button>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </div>
                )}

                {docLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : sortedDokumen.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada dokumen tercatat</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Jenis</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Nomor</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Berlaku s/d</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">File</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {sortedDokumen.map(d => {
                                    const expiry = getExpiryInfo(d.berlaku_sampai)
                                    return (
                                        <tr key={d.id_dokumen_vendor}>
                                            <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{d.jenis_dokumen}</td>
                                            <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{d.nomor ?? '—'}</td>
                                            <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                {d.berlaku_sampai ? dayjs(d.berlaku_sampai).format('DD MMM YYYY') : '—'}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <Tag className={`text-xs font-semibold ${expiry.className}`}>
                                                    {expiry.label}
                                                </Tag>
                                            </td>
                                            <td className="py-3 pr-4">
                                                {d.url_file
                                                    ? <a href={d.url_file} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Lihat</a>
                                                    : <span className="text-gray-400 text-xs">—</span>}
                                            </td>
                                            <td className="py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Tooltip title="Edit">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                            onClick={() => {
                                                                setEditDocTarget(d)
                                                                setEditDocForm({
                                                                    jenis_dokumen:  d.jenis_dokumen,
                                                                    nomor:          d.nomor ?? '',
                                                                    berlaku_sampai: d.berlaku_sampai ?? '',
                                                                })
                                                                setEditDocFile(null)
                                                            }}
                                                        >
                                                            <HiOutlinePencilAlt className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title="Hapus">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                            onClick={() => setDeleteDocTarget(d)}
                                                        >
                                                            <HiOutlineTrash className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Rekening Bank */}
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Rekening Bank</p>
                        <p className="text-xs text-gray-400 mt-0.5">Rekening tujuan pembayaran vendor</p>
                    </div>
                    <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={() => setShowRekForm(v => !v)}>
                        Tambah Rekening
                    </Button>
                </div>

                {/* Form tambah rekening */}
                {showRekForm && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <form onSubmit={e => { e.preventDefault(); handleAddRekening() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nama Bank" asterisk invalid={!!rekErrors.nama_bank} errorMessage={rekErrors.nama_bank}>
                                <Input placeholder="Contoh: BCA" value={rekForm.nama_bank} invalid={!!rekErrors.nama_bank}
                                    onChange={e => setRekForm(p => ({ ...p, nama_bank: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nomor Rekening" asterisk invalid={!!rekErrors.nomor_rekening} errorMessage={rekErrors.nomor_rekening}>
                                <Input placeholder="Nomor rekening" value={rekForm.nomor_rekening} invalid={!!rekErrors.nomor_rekening}
                                    onChange={e => setRekForm(p => ({ ...p, nomor_rekening: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Atas Nama" asterisk invalid={!!rekErrors.atas_nama} errorMessage={rekErrors.atas_nama}>
                                <Input placeholder="Nama pemilik rekening" value={rekForm.atas_nama} invalid={!!rekErrors.atas_nama}
                                    onChange={e => setRekForm(p => ({ ...p, atas_nama: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Cabang">
                                <Input placeholder="Cabang bank" value={rekForm.cabang}
                                    onChange={e => setRekForm(p => ({ ...p, cabang: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Mata Uang">
                                <Select isSearchable={false}
                                    options={MATA_UANG_OPTIONS}
                                    value={MATA_UANG_OPTIONS.find(o => o.value === rekForm.mata_uang) ?? null}
                                    onChange={opt => opt && setRekForm(p => ({ ...p, mata_uang: opt.value }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" size="sm" variant="plain" icon={<HiOutlineX />}
                                onClick={() => { setShowRekForm(false); setRekForm({ ...REKENING_FORM_KOSONG }); setRekErrors({}) }}>
                                Batal
                            </Button>
                            <Button type="submit" size="sm" variant="solid" loading={addingRek}>
                                Simpan
                            </Button>
                        </div>
                        </form>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </div>
                )}

                {rekLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : rekening.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada rekening tercatat</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Bank</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">No. Rekening</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Atas Nama</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Cabang</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Mata Uang</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rekening.map(r => (
                                    <tr key={r.id_rekening_vendor}>
                                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{r.nama_bank}</td>
                                        <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{r.nomor_rekening}</td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{r.atas_nama}</td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{r.cabang ?? <span className="text-gray-400">—</span>}</td>
                                        <td className="py-3 pr-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                {r.mata_uang}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <Tooltip title="Edit">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                        onClick={() => {
                                                            setEditRekTarget(r)
                                                            setEditRekForm({
                                                                nama_bank:      r.nama_bank,
                                                                nomor_rekening: r.nomor_rekening,
                                                                atas_nama:      r.atas_nama,
                                                                cabang:         r.cabang ?? '',
                                                                mata_uang:      r.mata_uang || 'IDR',
                                                            })
                                                            setEditRekErrors({})
                                                        }}
                                                    >
                                                        <HiOutlinePencilAlt className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Hapus">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                        onClick={() => setDeleteRekTarget(r)}
                                                    >
                                                        <HiOutlineTrash className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Ringkasan Armada Vendor & Supir Vendor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card
                    header={{
                        content: <h5>Armada Vendor</h5>,
                        extra: (
                            <Button variant="default" size="sm"
                                onClick={() => router.push(`${ROUTES.ARMADA_VENDOR}?id_vendor=${id}`)}>
                                Kelola
                            </Button>
                        ),
                        bordered: false,
                    }}
                >
                    {armadaVendorLoading ? (
                        <div className="flex justify-center py-6"><Spinner /></div>
                    ) : armadaVendorList.length === 0 ? (
                        <p className="text-gray-400 text-sm py-6 text-center">Belum ada data</p>
                    ) : (
                        <div className="overflow-x-auto -mx-5">
                            <table className="min-w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="py-2 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Nopol</th>
                                        <th className="py-2 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Merk</th>
                                        <th className="py-2 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {armadaVendorList.map(a => (
                                        <tr key={a.id_armada_vendor} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="py-2.5 px-5 font-mono font-semibold text-gray-800 dark:text-gray-100">{a.nopol}</td>
                                            <td className="py-2.5 px-5 text-gray-600 dark:text-gray-400">{a.merk ?? <span className="text-gray-400">—</span>}</td>
                                            <td className="py-2.5 px-5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${a.aktif ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {a.aktif ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <Card
                    header={{
                        content: <h5>Supir Vendor</h5>,
                        extra: (
                            <Button variant="default" size="sm"
                                onClick={() => router.push(`${ROUTES.SUPIR_VENDOR}?id_vendor=${id}`)}>
                                Kelola
                            </Button>
                        ),
                        bordered: false,
                    }}
                >
                    {supirVendorLoading ? (
                        <div className="flex justify-center py-6"><Spinner /></div>
                    ) : supirVendorList.length === 0 ? (
                        <p className="text-gray-400 text-sm py-6 text-center">Belum ada data</p>
                    ) : (
                        <div className="overflow-x-auto -mx-5">
                            <table className="min-w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="py-2 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Nama</th>
                                        <th className="py-2 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Telepon</th>
                                        <th className="py-2 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {supirVendorList.map(s => (
                                        <tr key={s.id_supir_vendor} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="py-2.5 px-5 font-semibold text-gray-800 dark:text-gray-100">{s.nama}</td>
                                            <td className="py-2.5 px-5 text-gray-600 dark:text-gray-400">{s.telepon ?? <span className="text-gray-400">—</span>}</td>
                                            <td className="py-2.5 px-5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.aktif ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {s.aktif ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            {/* Kontrak card */}
            <Card
                header={{
                    content: <h5>Kontrak</h5>,
                    extra: (
                        <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                            onClick={() => setShowKontrakForm(!showKontrakForm)}
                        >
                            Tambah Kontrak
                        </Button>
                    ),
                    bordered: false,
                }}
            >
                {showKontrakForm && (
                    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
                        <form onSubmit={e => { e.preventDefault(); handleKontrakSubmit() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nomor Kontrak">
                                <Input
                                    placeholder="Contoh: 12/PKS/2026"
                                    value={kontrakForm.nomor_kontrak}
                                    onChange={(e) => setKontrakForm(p => ({ ...p, nomor_kontrak: e.target.value }))}
                                />
                            </FormItem>
                            <FormItem label="Mekanisme" asterisk>
                                <Select
                                    isSearchable={false}
                                    value={MEKANISME_OPTIONS.find(o => o.value === kontrakForm.mekanisme) ?? null}
                                    options={MEKANISME_OPTIONS}
                                    onChange={(option) => option && setKontrakForm(p => ({ ...p, mekanisme: option.value as Mekanisme }))}
                                />
                            </FormItem>
                            <FormItem label="Jenis Layanan">
                                <Input
                                    placeholder="Contoh: Angkutan kontainer"
                                    value={kontrakForm.jenis_layanan}
                                    onChange={(e) => setKontrakForm(p => ({ ...p, jenis_layanan: e.target.value }))}
                                />
                            </FormItem>
                            <FormItem label="Nilai Kontrak">
                                <Input
                                    prefix="Rp"
                                    placeholder="0"
                                    value={kontrakForm.nilai_kontrak ? formatNum(Number(kontrakForm.nilai_kontrak)) : ''}
                                    onChange={(e) => setKontrakForm(p => ({ ...p, nilai_kontrak: e.target.value.replace(/\D/g, '') }))}
                                />
                            </FormItem>
                            <FormItem label="Rate">
                                <Input
                                    prefix="Rp"
                                    placeholder="0"
                                    value={kontrakForm.rate ? formatNum(Number(kontrakForm.rate)) : ''}
                                    onChange={(e) => setKontrakForm(p => ({ ...p, rate: e.target.value.replace(/\D/g, '') }))}
                                />
                            </FormItem>
                            <FormItem label="Satuan">
                                <Select
                                    isSearchable={false}
                                    isClearable
                                    placeholder="Pilih satuan..."
                                    options={SATUAN_OPTIONS}
                                    value={SATUAN_OPTIONS.find(o => o.value === kontrakForm.satuan) ?? null}
                                    onChange={(opt) => setKontrakForm(p => ({ ...p, satuan: opt?.value ?? '' }))}
                                />
                            </FormItem>
                            <FormItem label="Pajak (%)">
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    placeholder="0"
                                    value={kontrakForm.pajak_persen}
                                    onChange={(e) => setKontrakForm(p => ({ ...p, pajak_persen: e.target.value }))}
                                />
                            </FormItem>
                            <FormItem label="Termin Pembayaran (hari)">
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="0"
                                    value={kontrakForm.termin_pembayaran_hari}
                                    onChange={(e) => setKontrakForm(p => ({ ...p, termin_pembayaran_hari: e.target.value }))}
                                />
                            </FormItem>
                            <FormItem label="Tanggal Mulai">
                                <DatePicker
                                    value={kontrakForm.tanggal_mulai ? new Date(kontrakForm.tanggal_mulai) : null}
                                    onChange={(date) => setKontrakForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                                />
                            </FormItem>
                            <FormItem label="Tanggal Selesai">
                                <DatePicker
                                    value={kontrakForm.tanggal_selesai ? new Date(kontrakForm.tanggal_selesai) : null}
                                    onChange={(date) => setKontrakForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                                />
                            </FormItem>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button type="submit" variant="solid" loading={addingKontrak}>
                                Simpan Kontrak
                            </Button>
                            <Button type="button" variant="plain" onClick={() => setShowKontrakForm(false)}>Batal</Button>
                        </div>
                        </form>
                    </div>
                )}

                {kontraks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <span className="text-4xl mb-2">📄</span>
                        <p className="text-sm font-medium">Belum ada kontrak</p>
                        <p className="text-xs mt-1">Klik &quot;Tambah Kontrak&quot; untuk menambahkan</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-5">
                        <table className="min-w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Nomor Kontrak</th>
                                    <th className="py-2.5 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Mekanisme</th>
                                    <th className="py-2.5 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Nilai Kontrak</th>
                                    <th className="py-2.5 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Mulai</th>
                                    <th className="py-2.5 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Selesai</th>
                                    <th className="py-2.5 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {kontraks.map(k => {
                                    const label = MEKANISME_OPTIONS.find(o => o.value === k.mekanisme)?.label ?? k.mekanisme
                                    const isExpired = k.tanggal_selesai ? dayjs(k.tanggal_selesai).isBefore(dayjs(), 'day') : false
                                    return (
                                        <tr key={k.id_kontrak_vendor} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="py-3.5 px-5 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                {k.nomor_kontrak ?? <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="py-3.5 px-5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
                                                {k.nilai_kontrak ? formatRupiah(k.nilai_kontrak) : <span className="text-gray-400 font-normal">—</span>}
                                            </td>
                                            <td className="py-3.5 px-5 text-gray-600 dark:text-gray-400">
                                                {k.tanggal_mulai ? dayjs(k.tanggal_mulai).format('DD MMM YYYY') : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="py-3.5 px-5 text-gray-600 dark:text-gray-400">
                                                {k.tanggal_selesai ? dayjs(k.tanggal_selesai).format('DD MMM YYYY') : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="py-3.5 px-5">
                                                {!k.tanggal_selesai ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Tidak ada masa berlaku</span>
                                                ) : isExpired ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">Habis Masa Berlaku</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Aktif</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!editing && (
                    <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Batal</Button>
                    </div>
                )}
            </Card>

            {/* Dialog Edit Dokumen */}
            <Dialog isOpen={!!editDocTarget} onRequestClose={() => setEditDocTarget(null)} onClose={() => setEditDocTarget(null)} width={520}>
                <h5 className="text-base font-semibold mb-5">Edit Dokumen</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Jenis Dokumen" asterisk>
                        <Select isSearchable={false} placeholder="Pilih jenis..."
                            options={JENIS_DOKUMEN_OPTIONS}
                            value={JENIS_DOKUMEN_OPTIONS.find(o => o.value === editDocForm.jenis_dokumen) ?? null}
                            onChange={opt => setEditDocForm(p => ({ ...p, jenis_dokumen: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Nomor Dokumen">
                        <Input placeholder="Contoh: 12/PKS/2026" value={editDocForm.nomor}
                            onChange={e => setEditDocForm(p => ({ ...p, nomor: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Berlaku Sampai">
                        <DatePicker
                            value={editDocForm.berlaku_sampai ? new Date(editDocForm.berlaku_sampai) : null}
                            onChange={date => setEditDocForm(p => ({ ...p, berlaku_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Ganti File (opsional)">
                        <UploadBerkas
                            file={editDocFile}
                            accept=".pdf,.jpg,.jpeg,.png"
                            label="Pilih file baru..."
                            hint="PDF/JPG/PNG"
                            existingUrl={editDocTarget?.url_file ?? null}
                            existingLabel="File saat ini"
                            emptyText="Belum ada file tersimpan"
                            onChange={setEditDocFile}
                        />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button variant="plain" onClick={() => { setEditDocTarget(null); setEditDocFile(null) }}>Batal</Button>
                    <Button variant="solid" loading={updatingDoc} onClick={handleEditDokumen}>Simpan</Button>
                </div>
            </Dialog>

            {/* Confirm Hapus Dokumen */}
            <ConfirmDialog isOpen={!!deleteDocTarget} type="danger" title="Hapus Dokumen"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteDocTarget(null)}
                onCancel={() => setDeleteDocTarget(null)}
                onConfirm={handleDeleteDokumen}
                confirmButtonProps={{ loading: deletingDoc }}>
                <p>Hapus dokumen <strong>{deleteDocTarget?.jenis_dokumen}</strong>?</p>
            </ConfirmDialog>

            {/* Dialog Edit Rekening */}
            <Dialog isOpen={!!editRekTarget} onRequestClose={() => setEditRekTarget(null)} onClose={() => setEditRekTarget(null)} width={520}>
                <h5 className="text-base font-semibold mb-5">Edit Rekening</h5>
                <form onSubmit={e => { e.preventDefault(); handleEditRekening() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Nama Bank" asterisk invalid={!!editRekErrors.nama_bank} errorMessage={editRekErrors.nama_bank}>
                        <Input placeholder="Contoh: BCA" value={editRekForm.nama_bank} invalid={!!editRekErrors.nama_bank}
                            onChange={e => setEditRekForm(p => ({ ...p, nama_bank: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nomor Rekening" asterisk invalid={!!editRekErrors.nomor_rekening} errorMessage={editRekErrors.nomor_rekening}>
                        <Input placeholder="Nomor rekening" value={editRekForm.nomor_rekening} invalid={!!editRekErrors.nomor_rekening}
                            onChange={e => setEditRekForm(p => ({ ...p, nomor_rekening: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Atas Nama" asterisk invalid={!!editRekErrors.atas_nama} errorMessage={editRekErrors.atas_nama}>
                        <Input placeholder="Nama pemilik rekening" value={editRekForm.atas_nama} invalid={!!editRekErrors.atas_nama}
                            onChange={e => setEditRekForm(p => ({ ...p, atas_nama: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Cabang">
                        <Input placeholder="Cabang bank" value={editRekForm.cabang}
                            onChange={e => setEditRekForm(p => ({ ...p, cabang: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Mata Uang">
                        <Select isSearchable={false}
                            options={MATA_UANG_OPTIONS}
                            value={MATA_UANG_OPTIONS.find(o => o.value === editRekForm.mata_uang) ?? null}
                            onChange={opt => opt && setEditRekForm(p => ({ ...p, mata_uang: opt.value }))} />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => { setEditRekTarget(null); setEditRekErrors({}) }}>Batal</Button>
                    <Button type="submit" variant="solid" loading={updatingRek}>Simpan</Button>
                </div>
                </form>
            </Dialog>

            {/* Confirm Hapus Rekening */}
            <ConfirmDialog isOpen={!!deleteRekTarget} type="danger" title="Hapus Rekening"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteRekTarget(null)}
                onCancel={() => setDeleteRekTarget(null)}
                onConfirm={handleDeleteRekening}
                confirmButtonProps={{ loading: deletingRek }}>
                <p>Hapus rekening <strong>{deleteRekTarget?.nama_bank} — {deleteRekTarget?.nomor_rekening}</strong>?</p>
            </ConfirmDialog>
        </div>
    )
}