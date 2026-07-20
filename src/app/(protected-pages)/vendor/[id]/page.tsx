'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Dialog, FormItem, Input, DatePicker, Upload, Tag, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiPlusCircle, HiOutlinePencilAlt, HiOutlinePlus, HiOutlineTrash, HiOutlineX, HiOutlineDocumentText, HiOutlineExclamationCircle } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { vendorService, Vendor, KontrakVendor } from '@/services/vendor.service'
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

const JENIS_DOKUMEN_OPTIONS = [
    { value: 'STNK',                label: 'STNK' },
    { value: 'KIR',                 label: 'KIR' },
    { value: 'SIM Supir',           label: 'SIM Supir' },
    { value: 'Profil Perusahaan',   label: 'Profil Perusahaan' },
    { value: 'Kontrak',             label: 'Kontrak' },
    { value: 'Lainnya',             label: 'Lainnya' },
]

// --- helpers ---

function getExpiryInfo(berlakuSampai: string | null): {
    label: string
    className: string
    daysLeft: number | null
    urgent: boolean
} {
    if (!berlakuSampai) return { label: '—', className: 'bg-gray-100 text-gray-400', daysLeft: null, urgent: false }
    const days = Math.ceil((new Date(berlakuSampai).getTime() - Date.now()) / 86400000)
    if (days < 0)   return { label: 'Kadaluarsa', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',       daysLeft: days, urgent: true }
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
    const [kontrakForm, setKontrakForm] = useState({ mekanisme: 'unit_only' as Mekanisme, nilai_kontrak: '', tanggal_mulai: '', tanggal_selesai: '' })
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
                nilai_kontrak: kontrakForm.nilai_kontrak ? Number(kontrakForm.nilai_kontrak) : undefined,
                tanggal_mulai: kontrakForm.tanggal_mulai || undefined,
                tanggal_selesai: kontrakForm.tanggal_selesai || undefined,
            })
            toast.push(<Notification type="success" title="Kontrak berhasil ditambahkan" />)
            setShowKontrakForm(false)
            setKontrakForm({ mekanisme: 'unit_only', nilai_kontrak: '', tanggal_mulai: '', tanggal_selesai: '' })
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
                    <span><strong>{urgentCount} dokumen</strong> kadaluarsa atau hampir kadaluarsa — segera perbarui.</span>
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
                                { label: 'Kode Vendor', value: vendor.kode_vendor },
                                { label: 'Nama Vendor', value: vendor.nama_vendor },
                                { label: 'Telepon',     value: vendor.telepon ?? <span className="text-gray-400">—</span> },
                                { label: 'Email',       value: vendor.email ?? <span className="text-gray-400">—</span> },
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
                            <FormItem label="Telepon">
                                <Input value={form.telepon ?? ''} onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Email">
                                <Input type="email" value={form.email ?? ''} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
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
                        <p className="text-xs text-gray-400 mt-0.5">Diurutkan berdasarkan tanggal kadaluarsa terdekat</p>
                    </div>
                    <Button size="sm" variant="solid" icon={<HiOutlinePlus />} onClick={() => setShowDocForm(v => !v)}>
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
                                <Upload accept=".pdf,.jpg,.jpeg,.png" showList={false} uploadLimit={1}
                                    onChange={files => setDocFile(files[0] ?? null)}>
                                    <Button type="button" variant="default" size="sm" icon={<HiOutlineDocumentText />}>
                                        {docFile ? docFile.name : 'Pilih file (PDF/JPG/PNG)'}
                                    </Button>
                                </Upload>
                                {docFile && (
                                    <button type="button" className="text-xs text-red-400 hover:text-red-600 mt-1.5 block"
                                        onClick={() => setDocFile(null)}>Hapus pilihan</button>
                                )}
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
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Jenis</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Nomor</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Berlaku s/d</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">File</th>
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
                                                <Button size="xs" variant="plain" icon={<HiOutlinePencilAlt />} className="mr-1"
                                                    onClick={() => {
                                                        setEditDocTarget(d)
                                                        setEditDocForm({
                                                            jenis_dokumen:  d.jenis_dokumen,
                                                            nomor:          d.nomor ?? '',
                                                            berlaku_sampai: d.berlaku_sampai ?? '',
                                                        })
                                                        setEditDocFile(null)
                                                    }} />
                                                <Button size="xs" variant="plain" icon={<HiOutlineTrash />}
                                                    onClick={() => setDeleteDocTarget(d)} />
                                            </td>
                                        </tr>
                                    )
                                })}
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
                            <FormItem label="Mekanisme" asterisk>
                                <Select
                                    isSearchable={false}
                                    value={MEKANISME_OPTIONS.find(o => o.value === kontrakForm.mekanisme) ?? null}
                                    options={MEKANISME_OPTIONS}
                                    onChange={(option) => option && setKontrakForm(p => ({ ...p, mekanisme: option.value as Mekanisme }))}
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
                                        <tr key={k.id_kontrak} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
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
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">Kadaluarsa</span>
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
            </Card>

            {/* Dialog Edit Dokumen */}
            <Dialog isOpen={!!editDocTarget} onRequestClose={() => setEditDocTarget(null)} width={520}>
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
                        <Upload accept=".pdf,.jpg,.jpeg,.png" showList={false} uploadLimit={1}
                            onChange={files => setEditDocFile(files[0] ?? null)}>
                            <Button type="button" variant="default" size="sm" icon={<HiOutlineDocumentText />}>
                                {editDocFile ? editDocFile.name : 'Pilih file baru...'}
                            </Button>
                        </Upload>
                        {editDocTarget?.url_file && !editDocFile && (
                            <a href={editDocTarget.url_file} target="_blank" rel="noreferrer"
                                className="text-xs text-blue-500 hover:underline mt-1 block">File saat ini</a>
                        )}
                        {editDocFile && (
                            <button type="button" className="text-xs text-red-400 hover:text-red-600 mt-1.5 block"
                                onClick={() => setEditDocFile(null)}>Hapus pilihan</button>
                        )}
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
        </div>
    )
}