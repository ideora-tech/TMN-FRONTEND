'use client'
import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Dialog, FormItem, Input, Upload, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import axios from 'axios'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineTrash, HiPlusCircle, HiOutlineDownload, HiOutlineUpload } from 'react-icons/hi'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogApprovalDialog from '@/components/shared/LogApprovalDialog'
import AjukanApprovalDialog from '@/components/shared/AjukanApprovalDialog'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { kontrakVendorService, KontrakVendor, HasilTimpaPasangan } from '@/services/kontrak-vendor.service'
import { armadaVendorService, ArmadaVendor } from '@/services/armadaVendor.service'
import { supirVendorService, SupirVendor } from '@/services/supirVendor.service'

const MEKANISME_OPTIONS = [
    { value: 'unit_only',   label: 'Unit Only' },
    { value: 'unit_driver', label: 'Unit + Driver' },
    { value: 'full',        label: 'All In' },
]
const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'All In',
}

const SATUAN_OPTIONS = [
    { value: 'per trip',  label: 'Per Trip' },
    { value: 'per ton',   label: 'Per Ton' },
    { value: 'per hari',  label: 'Per Hari' },
    { value: 'per bulan', label: 'Per Bulan' },
    { value: 'lumpsum',   label: 'Lumpsum' },
]

const KONTRAK_STATUS_CLASS: Record<string, string> = {
    draft:             'bg-gray-100 text-gray-600',
    menunggu_approval: 'bg-violet-100 text-violet-600',
    aktif:             'bg-emerald-100 text-emerald-600',
    selesai:           'bg-blue-100 text-blue-600',
    batal:             'bg-red-100 text-red-500',
}

const KONTRAK_STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', menunggu_approval: 'Menunggu Approval', aktif: 'aktif', selesai: 'selesai', batal: 'batal',
}

type TambahUnitForm = {
    nopol: string; merk: string; jenis: string; id_jenis_kendaraan: string
    tahun: string; kapasitas: string; masa_berlaku_stnk: string; masa_berlaku_kir: string
    id_supir_vendor_default: string
    driver_nama: string; driver_telepon: string; driver_no_sim: string
}
type TambahSupirForm = { nama: string; telepon: string; no_sim: string }
type ItemGagal = { label: string; alasan: string }

const emptyTambahUnit = (): TambahUnitForm => ({
    nopol: '', merk: '', jenis: '', id_jenis_kendaraan: '',
    tahun: '', kapasitas: '', masa_berlaku_stnk: '', masa_berlaku_kir: '',
    id_supir_vendor_default: '',
    driver_nama: '', driver_telepon: '', driver_no_sim: '',
})
const emptyTambahSupir = (): TambahSupirForm => ({ nama: '', telepon: '', no_sim: '' })

export default function KontrakVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]     = useState<KontrakVendor | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<KontrakVendor> & { nilai_kontrak_str?: string; rate_str?: string; pajak_str?: string; termin_str?: string }>({})
    const [saving, setSaving]   = useState(false)
    const [unitTerikat, setUnitTerikat]   = useState<ArmadaVendor[]>([])
    const [supirTerikat, setSupirTerikat] = useState<SupirVendor[]>([])
    const [dialogTambah, setDialogTambah] = useState<'' | 'unit' | 'supir'>('')
    const [unitForm, setUnitForm]   = useState<TambahUnitForm>(emptyTambahUnit())
    const [supirForm, setSupirForm] = useState<TambahSupirForm>(emptyTambahSupir())
    const [tambahErrors, setTambahErrors] = useState<Record<string, string>>({})
    const [menyimpanTambah, setMenyimpanTambah] = useState(false)
    const [downloadingTemplate, setDownloadingTemplate] = useState<'' | 'unit' | 'supir'>('')
    const [uploading, setUploading] = useState<'' | 'unit' | 'supir'>('')
    const [daftarGagal, setDaftarGagal] = useState<{ judul: string; daftar: ItemGagal[] } | null>(null)
    const [timpaKonfirmasi, setTimpaKonfirmasi] = useState<{ jenis: 'unit' | 'supir'; file: File } | null>(null)
    const [unitEdit, setUnitEdit] = useState<ArmadaVendor | null>(null)
    const [hapusUnit, setHapusUnit] = useState<ArmadaVendor | null>(null)
    const [draftUnits, setDraftUnits] = useState<TambahUnitForm[]>([])
    const [menyimpanDraft, setMenyimpanDraft] = useState<number | null>(null)
    const [draftErrors, setDraftErrors] = useState<Record<number, string>>({})
    const [menghapusUnit, setMenghapusUnit] = useState(false)
    const [logOpen, setLogOpen] = useState(false)
    const [downloadingExport, setDownloadingExport] = useState(false)

    const toFormState = (d: KontrakVendor) => ({
        ...d,
        nilai_kontrak_str: d.nilai_kontrak ? String(d.nilai_kontrak) : '',
        rate_str:          d.rate != null ? String(d.rate) : '',
        pajak_str:         d.pajak_persen != null ? String(d.pajak_persen) : '',
        termin_str:        d.termin_pembayaran_hari != null ? String(d.termin_pembayaran_hari) : '',
    })

    useEffect(() => {
        kontrakVendorService.get(id)
            .then(d => {
                setData(d)
                setForm(toFormState(d))
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const muatKontrak = useCallback(() => {
        kontrakVendorService.get(id)
            .then(d => {
                setData(d)
                setForm(toFormState(d))
            })
            .catch(() => {})
    }, [id])

    const muatTerikat = useCallback(() => {
        if (!data?.id_vendor) return
        armadaVendorService.list(1, 500, data.id_vendor)
            .then(res => setUnitTerikat(res.data.filter(u => u.id_kontrak_vendor === id)))
            .catch(() => {})
        supirVendorService.list(1, 500, data.id_vendor)
            .then(res => setSupirTerikat(res.data.filter(s => s.id_kontrak_vendor === id)))
            .catch(() => {})
    }, [data?.id_vendor, id])

    useEffect(() => { muatTerikat() }, [muatTerikat])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await kontrakVendorService.update(id, {
                mekanisme:       form.mekanisme,
                nomor_kontrak:   form.nomor_kontrak?.trim() || null,
                jenis_layanan:   form.jenis_layanan?.trim() || null,
                rate:            form.rate_str ? Number(form.rate_str) : null,
                satuan:          form.satuan || null,
                pajak_persen:    form.pajak_str ? Number(form.pajak_str) : null,
                termin_pembayaran_hari: form.termin_str ? Number(form.termin_str) : null,
                nilai_kontrak:   Number(form.nilai_kontrak_str || '0'),
                tanggal_mulai:   form.tanggal_mulai ?? null,
                tanggal_selesai: form.tanggal_selesai ?? null,
                status:          form.status ?? null,
            })
            setData(updated)
            setForm(toFormState(updated))
            setEditing(false)
            toast.push(<Notification type="success" title="Kontrak berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const [ajukanOpen, setAjukanOpen] = useState(false)

    const handleExport = async () => {
        setDownloadingExport(true)
        try {
            const res = await axios.get(API_ENDPOINTS.KONTRAK_VENDOR_EXPORT_PDF(id), { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = `kontrak-${data?.nomor_kontrak ?? id}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingExport(false)
        }
    }

    const tutupDialogTambah = () => {
        setDialogTambah('')
        setUnitEdit(null)
        setUnitForm(emptyTambahUnit())
        setSupirForm(emptyTambahSupir())
        setTambahErrors({})
    }

    const bukaEditUnit = (u: ArmadaVendor) => {
        setUnitEdit(u)
        setUnitForm({
            nopol: u.nopol ?? '',
            merk: u.merk ?? '',
            jenis: u.jenis ?? '',
            id_jenis_kendaraan: u.id_jenis_kendaraan ?? '',
            tahun: u.tahun != null ? String(u.tahun) : '',
            kapasitas: u.kapasitas ?? '',
            masa_berlaku_stnk: u.masa_berlaku_stnk ?? '',
            masa_berlaku_kir: u.masa_berlaku_kir ?? '',
            id_supir_vendor_default: u.id_supir_vendor_default ?? '',
            driver_nama: driverDariUnit(u)?.nama ?? '',
            driver_telepon: driverDariUnit(u)?.telepon ?? '',
            driver_no_sim: driverDariUnit(u)?.no_sim ?? '',
        })
    }

    const jalankanHapusUnit = async () => {
        if (!hapusUnit) return
        setMenghapusUnit(true)
        try {
            await armadaVendorService.delete(hapusUnit.id_armada_vendor)
            toast.push(<Notification type="success" title="Unit dihapus dari kontrak" />)
            setHapusUnit(null)
            muatTerikat()
            muatKontrak()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setHapusUnit(null)
        } finally {
            setMenghapusUnit(false)
        }
    }

    const ubahDraftUnit = (i: number, patch: Partial<TambahUnitForm>) =>
        setDraftUnits(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

    const hapusDraftUnit = (i: number) => {
        setDraftUnits(prev => prev.filter((_, idx) => idx !== i))
        setDraftErrors(prev => { const e = { ...prev }; delete e[i]; return e })
    }

    const simpanDraftUnit = async (i: number) => {
        if (!data) return
        const row = draftUnits[i]
        if (!row.nopol.trim() || !row.masa_berlaku_stnk || !row.masa_berlaku_kir) {
            setDraftErrors(prev => ({ ...prev, [i]: !row.nopol.trim() ? 'Nopol wajib diisi' : 'Habis masa berlaku STNK & KIR wajib diisi' }))
            return
        }
        setMenyimpanDraft(i)
        try {
            let idDriverDefault: string | null = null
            if (kontrakPaket && row.driver_nama.trim()) {
                const driverBaru = await supirVendorService.create({
                    id_vendor: data.id_vendor,
                    id_kontrak_vendor: id,
                    nama: row.driver_nama.trim(),
                    telepon: row.driver_telepon.trim() || null,
                    no_sim: row.driver_no_sim.trim() || null,
                })
                idDriverDefault = driverBaru.id_supir_vendor
            }
            await armadaVendorService.create({
                id_vendor: data.id_vendor,
                nopol: row.nopol.trim(),
                merk: row.merk.trim() || null,
                jenis: row.jenis.trim() || null,
                id_jenis_kendaraan: row.id_jenis_kendaraan || null,
                tahun: row.tahun ? Number(row.tahun) : null,
                kapasitas: row.kapasitas.trim() || null,
                masa_berlaku_stnk: row.masa_berlaku_stnk || null,
                masa_berlaku_kir: row.masa_berlaku_kir || null,
                id_supir_vendor_default: idDriverDefault,
                id_kontrak_vendor: id,
            })
            toast.push(<Notification type="success" title={`Unit ${row.nopol.trim()} ditambahkan ke kontrak`} />)
            hapusDraftUnit(i)
            muatTerikat()
            muatKontrak()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenyimpanDraft(null)
        }
    }

    const simpanTambahUnit = async () => {
        if (!data) return
        const eV: Record<string, string> = {}
        if (!unitForm.nopol.trim()) eV.nopol = 'Nopol wajib diisi'
        if (!unitForm.masa_berlaku_stnk) eV.stnk = 'Habis masa berlaku STNK wajib diisi'
        if (!unitForm.masa_berlaku_kir) eV.kir = 'Habis masa berlaku KIR wajib diisi'
        if (Object.keys(eV).length > 0) {
            setTambahErrors(eV)
            return
        }
        setMenyimpanTambah(true)
        try {
            let idDriverDefault: string | null = unitForm.id_supir_vendor_default || null
            if (kontrakPaket) {
                const namaDriver = unitForm.driver_nama.trim()
                if (namaDriver && idDriverDefault) {
                    await supirVendorService.update(idDriverDefault, {
                        nama: namaDriver,
                        telepon: unitForm.driver_telepon.trim() || null,
                        no_sim: unitForm.driver_no_sim.trim() || null,
                    })
                } else if (namaDriver && !idDriverDefault) {
                    const driverBaru = await supirVendorService.create({
                        id_vendor: data.id_vendor,
                        id_kontrak_vendor: id,
                        nama: namaDriver,
                        telepon: unitForm.driver_telepon.trim() || null,
                        no_sim: unitForm.driver_no_sim.trim() || null,
                    })
                    idDriverDefault = driverBaru.id_supir_vendor
                } else if (!namaDriver) {
                    idDriverDefault = null
                }
            }
            const payload = {
                nopol: unitForm.nopol.trim(),
                merk: unitForm.merk.trim() || null,
                jenis: unitForm.jenis.trim() || null,
                id_jenis_kendaraan: unitForm.id_jenis_kendaraan || null,
                tahun: unitForm.tahun ? Number(unitForm.tahun) : null,
                kapasitas: unitForm.kapasitas.trim() || null,
                masa_berlaku_stnk: unitForm.masa_berlaku_stnk || null,
                masa_berlaku_kir: unitForm.masa_berlaku_kir || null,
                id_supir_vendor_default: kontrakPaket ? idDriverDefault : null,
            }
            if (unitEdit) {
                await armadaVendorService.update(unitEdit.id_armada_vendor, payload)
            } else {
                await armadaVendorService.create({ ...payload, id_vendor: data.id_vendor, id_kontrak_vendor: id })
            }
            toast.push(<Notification type="success" title={unitEdit ? 'Unit berhasil diperbarui' : 'Unit berhasil ditambahkan ke kontrak'} />)
            tutupDialogTambah()
            muatTerikat()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenyimpanTambah(false)
        }
    }

    const simpanTambahSupir = async () => {
        if (!data) return
        if (!supirForm.nama.trim()) {
            setTambahErrors({ nama: 'Nama wajib diisi' })
            return
        }
        setMenyimpanTambah(true)
        try {
            await supirVendorService.create({
                id_vendor: data.id_vendor,
                nama: supirForm.nama.trim(),
                telepon: supirForm.telepon.trim() || null,
                no_sim: supirForm.no_sim.trim() || null,
                id_kontrak_vendor: id,
            })
            toast.push(<Notification type="success" title="Supir berhasil ditambahkan ke kontrak" />)
            tutupDialogTambah()
            muatTerikat()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenyimpanTambah(false)
        }
    }

    const unduhTemplate = async (jenis: 'unit' | 'supir') => {
        setDownloadingTemplate(jenis)
        try {
            const res = await axios.get(
                jenis === 'unit'
                    ? (data?.mekanisme !== 'unit_only' ? API_ENDPOINTS.KONTRAK_VENDOR_TEMPLATE_PASANGAN : API_ENDPOINTS.ARMADA_VENDOR_IMPORT_TEMPLATE)
                    : API_ENDPOINTS.SUPIR_VENDOR_IMPORT_TEMPLATE,
                { responseType: 'blob' },
            )
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = jenis === 'unit'
                ? (data?.mekanisme !== 'unit_only' ? 'template-import-pasangan-unit-driver.xlsx' : 'template-import-armada-vendor.xlsx')
                : 'template-import-supir-vendor.xlsx'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingTemplate('')
        }
    }

    const pilihFileTimpa = (jenis: 'unit' | 'supir', files: File[]) => {
        const file = files[0]
        if (!file) return
        setTimpaKonfirmasi({ jenis, file })
    }

    const jalankanTimpa = async () => {
        if (!timpaKonfirmasi || !data) return
        const { jenis, file } = timpaKonfirmasi
        setUploading(jenis)
        try {
            const pakaiPasangan = jenis === 'unit' && data.mekanisme !== 'unit_only'
            const hasil = pakaiPasangan
                ? await kontrakVendorService.timpaPasangan(id, file)
                : jenis === 'unit'
                    ? await kontrakVendorService.timpaUnit(id, file)
                    : await kontrakVendorService.timpaSupir(id, file)
            const ringkasDriver = pakaiPasangan
                ? (() => { const h = hasil as HasilTimpaPasangan; return ` · driver: ${h.driver_ditambah} baru, ${h.driver_diperbarui} diperbarui, ${h.driver_dilepas} dilepas` })()
                : ''
            toast.push(
                <Notification type={hasil.gagal.length > 0 ? 'warning' : 'success'}
                    title={`Unit: ${hasil.ditambah} ditambah, ${hasil.diperbarui} diperbarui, ${hasil.dihapus} dihapus${ringkasDriver}${hasil.gagal.length > 0 ? ` · ${hasil.gagal.length} gagal` : ''}`} />,
            )
            if (hasil.gagal.length > 0) {
                setDaftarGagal({ judul: jenis === 'unit' ? 'Unit Disewa' : 'Supir dari Vendor', daftar: hasil.gagal })
            }
            muatTerikat()
            muatKontrak()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUploading('')
            setTimpaKonfirmasi(null)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Kontrak tidak ditemukan.</div>

    const vendorName = data.vendor?.nama_vendor ?? 'Kontrak Vendor'
    const kontrakPaket = data.mekanisme !== 'unit_only'
    const driverDariUnit = (u: ArmadaVendor) => supirTerikat.find(s => s.id_supir_vendor === u.id_supir_vendor_default) ?? null
    const idDriverTerpakai = new Set(unitTerikat.map(u => u.id_supir_vendor_default).filter(Boolean))
    const driverCadangan = supirTerikat.filter(s => !idDriverTerpakai.has(s.id_supir_vendor))
    const initial = vendorName.charAt(0).toUpperCase()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.KONTRAK_VENDOR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{vendorName}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{MEKANISME_LABEL[data.mekanisme] ?? data.mekanisme}</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{vendorName}</p>
                                    <p className="text-sm text-gray-500 mt-1">{MEKANISME_LABEL[data.mekanisme] ?? data.mekanisme}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {data.status && (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${KONTRAK_STATUS_CLASS[data.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                        {KONTRAK_STATUS_LABEL[data.status] ?? data.status}
                                    </span>
                                )}
                                {data.status === 'draft' && (
                                    <Button variant="solid" size="sm" onClick={() => setAjukanOpen(true)}>
                                        Ajukan Approval
                                    </Button>
                                )}
                                <Button variant="default" size="sm" icon={<HiOutlineDownload />} loading={downloadingExport}
                                    onClick={handleExport}>Export PDF</Button>
                                <Button variant="default" size="sm" onClick={() => setLogOpen(true)}>Log Approval</Button>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        {data.status === 'draft' && data.alasan_ditolak_internal && (
                            <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-sm text-red-600 dark:text-red-300">
                                Ditolak approver: {data.alasan_ditolak_internal} — perbaiki lalu ajukan ulang.
                            </div>
                        )}
                        {data.status === 'menunggu_approval' && (
                            <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-sm text-violet-600 dark:text-violet-300">
                                Kontrak sedang menunggu keputusan approver — mengubah data akan menarik pengajuan ini dan mengembalikan kontrak ke Draft, ajukan ulang setelah selesai edit.
                            </div>
                        )}
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Vendor',            value: vendorName },
                                { label: 'Mekanisme',         value: MEKANISME_LABEL[data.mekanisme] ?? data.mekanisme },
                                { label: 'No. Kontrak',       value: data.nomor_kontrak ?? <span className="text-gray-400">—</span> },
                                { label: 'Nilai Kontrak',     value: data.nilai_kontrak ? formatRupiah(data.nilai_kontrak) : <span className="text-gray-400">—</span> },
                                { label: 'Rate',              value: data.rate ? formatRupiah(data.rate) : <span className="text-gray-400">—</span> },
                                { label: 'Satuan Kontrak',    value: data.satuan ?? <span className="text-gray-400">—</span> },
                                { label: 'Pajak',             value: data.pajak_persen != null ? `${data.pajak_persen} %` : <span className="text-gray-400">—</span> },
                                { label: 'Termin Pembayaran', value: data.termin_pembayaran_hari != null ? `${data.termin_pembayaran_hari} hari` : <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Mulai',     value: data.tanggal_mulai ?? <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Selesai',   value: data.tanggal_selesai ?? <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold text-xl flex-shrink-0 select-none">
                                {initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Kontrak Vendor</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi kontrak di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Mekanisme">
                                <Select isSearchable={false} options={MEKANISME_OPTIONS}
                                    value={MEKANISME_OPTIONS.find(o => o.value === form.mekanisme) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, mekanisme: opt?.value as KontrakVendor['mekanisme'] }))} />
                            </FormItem>
                            <FormItem label="No. Kontrak">
                                <Input placeholder="Nomor kontrak" value={form.nomor_kontrak ?? ''}
                                    onChange={e => setForm(p => ({ ...p, nomor_kontrak: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nilai Kontrak">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.nilai_kontrak_str ? formatNum(Number(form.nilai_kontrak_str)) : ''}
                                    onChange={e => setForm(p => ({ ...p, nilai_kontrak_str: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Rate">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.rate_str ? formatNum(Number(form.rate_str)) : ''}
                                    onChange={e => setForm(p => ({ ...p, rate_str: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Satuan Kontrak">
                                <Select isSearchable={false} isClearable placeholder="Pilih satuan..."
                                    options={SATUAN_OPTIONS}
                                    value={SATUAN_OPTIONS.find(o => o.value === form.satuan) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, satuan: opt?.value ?? null }))} />
                            </FormItem>
                            <FormItem label="Pajak">
                                <Input suffix="%" placeholder="0"
                                    value={form.pajak_str ?? ''}
                                    onChange={e => {
                                        const v = e.target.value.replace(/\D/g, '')
                                        setForm(p => ({ ...p, pajak_str: v && Number(v) > 100 ? '100' : v }))
                                    }} />
                            </FormItem>
                            <FormItem label="Termin Pembayaran">
                                <Input suffix="hari" placeholder="0"
                                    value={form.termin_str ?? ''}
                                    onChange={e => setForm(p => ({ ...p, termin_str: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Tanggal Mulai">
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={form.tanggal_mulai ? dayjs(form.tanggal_mulai).toDate() : null}
                                    onChange={date => setForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : null }))} />
                            </FormItem>
                            <FormItem label="Tanggal Selesai">
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={form.tanggal_selesai ? dayjs(form.tanggal_selesai).toDate() : null}
                                    onChange={date => setForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : null }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => {
                                setEditing(false)
                                setForm(toFormState(data))
                            }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
                {!editing && (
                    <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Batal</Button>
                    </div>
                )}
            </Card>

            <Card>
                <p className="font-semibold mb-4">Unit & Supir Kontrak Ini</p>
                <div className={`grid grid-cols-1 gap-x-8 gap-y-6 ${kontrakPaket && driverCadangan.length > 0 ? 'sm:grid-cols-2' : ''}`}>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{kontrakPaket ? `Pasangan Unit + Driver (${unitTerikat.length})` : `Unit Disewa (${unitTerikat.length})`}</p>
                            <span className="cursor-pointer text-xs text-blue-600 hover:underline"
                                onClick={() => router.push(`${ROUTES.ARMADA_VENDOR}?id_vendor=${data.id_vendor}`)}>
                                Lihat armada vendor
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Button type="button" size="sm" variant="default" icon={<HiOutlineDownload />}
                                loading={downloadingTemplate === 'unit'}
                                onClick={() => unduhTemplate('unit')}>
                                Unduh Template
                            </Button>
                            <Upload accept=".xlsx" showList={false} uploadLimit={1} onChange={files => pilihFileTimpa('unit', files)}>
                                <Button type="button" size="sm" variant="default" icon={<HiOutlineUpload />}
                                    loading={uploading === 'unit'}>
                                    Upload Excel (Timpa)
                                </Button>
                            </Upload>
                            <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                onClick={() => setDraftUnits(prev => [...prev, emptyTambahUnit()])}>
                                {kontrakPaket ? 'Tambah Pasangan' : 'Tambah Unit'}
                            </Button>
                        </div>
                        {unitTerikat.length === 0 && draftUnits.length === 0 ? (
                            <p className="text-sm text-gray-400">Belum ada unit tertaut ke kontrak ini.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-400 border-b border-gray-200 dark:border-gray-600">
                                            <th className="py-2 pr-3 font-medium">Nopol</th>
                                            <th className="py-2 pr-3 font-medium">Merk</th>
                                            <th className="py-2 pr-3 font-medium">Jenis</th>
                                            <th className="py-2 pr-3 font-medium">Kapasitas</th>
                                            {kontrakPaket && <th className="py-2 pr-3 font-medium">Driver</th>}
                                            {kontrakPaket && <th className="py-2 pr-3 font-medium">Telepon</th>}
                                            {kontrakPaket && <th className="py-2 pr-3 font-medium">No. SIM</th>}
                                            <th className="py-2 pr-3 font-medium">Habis STNK</th>
                                            <th className="py-2 pr-3 font-medium">Habis KIR</th>
                                            <th className="py-2 font-medium text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unitTerikat.map(u => unitEdit?.id_armada_vendor === u.id_armada_vendor ? (
                                            <tr key={u.id_armada_vendor} className="border-b border-gray-100 dark:border-gray-700 bg-amber-50/40 dark:bg-amber-500/5 align-top">
                                                <td className="py-2 pr-3 min-w-32">
                                                    <Input size="sm" value={unitForm.nopol} invalid={!!tambahErrors.nopol}
                                                        onChange={e => setUnitForm(p => ({ ...p, nopol: e.target.value }))} />
                                                    {tambahErrors.nopol && <p className="text-xs text-red-500 mt-0.5">{tambahErrors.nopol}</p>}
                                                </td>
                                                <td className="py-2 pr-3 min-w-28">
                                                    <Input size="sm" value={unitForm.merk}
                                                        onChange={e => setUnitForm(p => ({ ...p, merk: e.target.value }))} />
                                                </td>
                                                <td className="py-2 pr-3 min-w-28">
                                                    <Input size="sm" value={unitForm.jenis}
                                                        onChange={e => setUnitForm(p => ({ ...p, jenis: e.target.value }))} />
                                                </td>
                                                <td className="py-2 pr-3 min-w-28">
                                                    <Input size="sm" value={unitForm.kapasitas}
                                                        onChange={e => setUnitForm(p => ({ ...p, kapasitas: e.target.value }))} />
                                                </td>
                                                {kontrakPaket && (
                                                    <td className="py-2 pr-3 min-w-32">
                                                        <Input size="sm" placeholder="Kosong = lepas driver" value={unitForm.driver_nama}
                                                            onChange={e => setUnitForm(p => ({ ...p, driver_nama: e.target.value }))} />
                                                    </td>
                                                )}
                                                {kontrakPaket && (
                                                    <td className="py-2 pr-3 min-w-28">
                                                        <Input size="sm" value={unitForm.driver_telepon}
                                                            onChange={e => setUnitForm(p => ({ ...p, driver_telepon: e.target.value }))} />
                                                    </td>
                                                )}
                                                {kontrakPaket && (
                                                    <td className="py-2 pr-3 min-w-28">
                                                        <Input size="sm" value={unitForm.driver_no_sim}
                                                            onChange={e => setUnitForm(p => ({ ...p, driver_no_sim: e.target.value }))} />
                                                    </td>
                                                )}
                                                <td className="py-2 pr-3 min-w-36">
                                                    <DatePicker size="sm" inputFormat="DD/MM/YYYY"
                                                        value={unitForm.masa_berlaku_stnk ? dayjs(unitForm.masa_berlaku_stnk).toDate() : null}
                                                        onChange={date => setUnitForm(p => ({ ...p, masa_berlaku_stnk: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                                                    {tambahErrors.stnk && <p className="text-xs text-red-500 mt-0.5">{tambahErrors.stnk}</p>}
                                                </td>
                                                <td className="py-2 pr-3 min-w-36">
                                                    <DatePicker size="sm" inputFormat="DD/MM/YYYY"
                                                        value={unitForm.masa_berlaku_kir ? dayjs(unitForm.masa_berlaku_kir).toDate() : null}
                                                        onChange={date => setUnitForm(p => ({ ...p, masa_berlaku_kir: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                                                    {tambahErrors.kir && <p className="text-xs text-red-500 mt-0.5">{tambahErrors.kir}</p>}
                                                </td>
                                                <td className="py-2 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <Button type="button" size="xs" variant="solid" loading={menyimpanTambah}
                                                            onClick={simpanTambahUnit}>
                                                            Simpan
                                                        </Button>
                                                        <Button type="button" size="xs" variant="plain" onClick={tutupDialogTambah}>Batal</Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={u.id_armada_vendor} className="border-b border-gray-100 dark:border-gray-700">
                                                <td className="py-2.5 pr-3 font-mono font-semibold whitespace-nowrap">{u.nopol}</td>
                                                <td className="py-2.5 pr-3">{u.merk ?? '—'}</td>
                                                <td className="py-2.5 pr-3">{u.jenis ?? u.nama_jenis_kendaraan ?? '—'}</td>
                                                <td className="py-2.5 pr-3">{u.kapasitas ?? '—'}</td>
                                                {kontrakPaket && (
                                                    <td className="py-2.5 pr-3">
                                                        {driverDariUnit(u)
                                                            ? <span className="text-emerald-600 dark:text-emerald-400">{driverDariUnit(u)!.nama}</span>
                                                            : <span className="text-amber-500">Belum ada driver</span>}
                                                    </td>
                                                )}
                                                {kontrakPaket && <td className="py-2.5 pr-3">{driverDariUnit(u)?.telepon ?? '—'}</td>}
                                                {kontrakPaket && <td className="py-2.5 pr-3">{driverDariUnit(u)?.no_sim ?? '—'}</td>}
                                                <td className="py-2.5 pr-3 whitespace-nowrap">{u.masa_berlaku_stnk ? dayjs(u.masa_berlaku_stnk).format('DD/MM/YYYY') : '—'}</td>
                                                <td className="py-2.5 pr-3 whitespace-nowrap">{u.masa_berlaku_kir ? dayjs(u.masa_berlaku_kir).format('DD/MM/YYYY') : '—'}</td>
                                                <td className="py-2.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <span className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 transition-colors"
                                                            title="Edit unit"
                                                            onClick={() => bukaEditUnit(u)}>
                                                            <HiOutlinePencilAlt className="text-base" />
                                                        </span>
                                                        <span className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                            title="Hapus dari kontrak"
                                                            onClick={() => setHapusUnit(u)}>
                                                            <HiOutlineTrash className="text-base" />
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {draftUnits.map((row, i) => (
                                            <tr key={`draft-${i}`} className="border-b border-dashed border-blue-300 dark:border-blue-500/40 bg-blue-50/40 dark:bg-blue-500/5 align-top">
                                                <td className="py-2 pr-3 min-w-32">
                                                    <Input size="sm" placeholder="Nopol *" value={row.nopol} invalid={!!draftErrors[i]}
                                                        onChange={e => ubahDraftUnit(i, { nopol: e.target.value })} />
                                                    {draftErrors[i] && <p className="text-xs text-red-500 mt-0.5">{draftErrors[i]}</p>}
                                                </td>
                                                <td className="py-2 pr-3 min-w-28">
                                                    <Input size="sm" placeholder="Merk" value={row.merk}
                                                        onChange={e => ubahDraftUnit(i, { merk: e.target.value })} />
                                                </td>
                                                <td className="py-2 pr-3 min-w-28">
                                                    <Input size="sm" placeholder="Jenis" value={row.jenis}
                                                        onChange={e => ubahDraftUnit(i, { jenis: e.target.value })} />
                                                </td>
                                                <td className="py-2 pr-3 min-w-28">
                                                    <Input size="sm" placeholder="Kapasitas" value={row.kapasitas}
                                                        onChange={e => ubahDraftUnit(i, { kapasitas: e.target.value })} />
                                                </td>
                                                {kontrakPaket && (
                                                    <td className="py-2 pr-3 min-w-32">
                                                        <Input size="sm" placeholder="Nama driver" value={row.driver_nama}
                                                            onChange={e => ubahDraftUnit(i, { driver_nama: e.target.value })} />
                                                    </td>
                                                )}
                                                {kontrakPaket && (
                                                    <td className="py-2 pr-3 min-w-28">
                                                        <Input size="sm" placeholder="Telepon" value={row.driver_telepon}
                                                            onChange={e => ubahDraftUnit(i, { driver_telepon: e.target.value })} />
                                                    </td>
                                                )}
                                                {kontrakPaket && (
                                                    <td className="py-2 pr-3 min-w-28">
                                                        <Input size="sm" placeholder="No. SIM" value={row.driver_no_sim}
                                                            onChange={e => ubahDraftUnit(i, { driver_no_sim: e.target.value })} />
                                                    </td>
                                                )}
                                                <td className="py-2 pr-3 min-w-36">
                                                    <DatePicker size="sm" inputFormat="DD/MM/YYYY" placeholder="Habis STNK *"
                                                        value={row.masa_berlaku_stnk ? dayjs(row.masa_berlaku_stnk).toDate() : null}
                                                        onChange={date => ubahDraftUnit(i, { masa_berlaku_stnk: date ? dayjs(date).format('YYYY-MM-DD') : '' })} />
                                                </td>
                                                <td className="py-2 pr-3 min-w-36">
                                                    <DatePicker size="sm" inputFormat="DD/MM/YYYY" placeholder="Habis KIR *"
                                                        value={row.masa_berlaku_kir ? dayjs(row.masa_berlaku_kir).toDate() : null}
                                                        onChange={date => ubahDraftUnit(i, { masa_berlaku_kir: date ? dayjs(date).format('YYYY-MM-DD') : '' })} />
                                                </td>
                                                <td className="py-2 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <Button type="button" size="xs" variant="solid" loading={menyimpanDraft === i}
                                                            onClick={() => simpanDraftUnit(i)}>
                                                            Simpan
                                                        </Button>
                                                        <Button type="button" size="xs" variant="plain" onClick={() => hapusDraftUnit(i)}>Batal</Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {kontrakPaket && driverCadangan.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Driver Cadangan ({driverCadangan.length})</p>
                            <span className="cursor-pointer text-xs text-blue-600 hover:underline"
                                onClick={() => router.push(`${ROUTES.SUPIR_VENDOR}?id_vendor=${data.id_vendor}`)}>
                                Lihat supir vendor
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">Driver kontrak ini yang tidak terpasang ke unit manapun — bisa dipilih sebagai pengganti saat penugasan</p>
                        <div className="flex flex-col gap-2">
                            {driverCadangan.map(s => (
                                <div key={s.id_supir_vendor}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-600 px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate">{s.nama}</p>
                                        <p className="text-xs text-gray-400 truncate">{s.telepon ?? '—'}{s.no_sim ? ` · SIM ${s.no_sim}` : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}
                </div>
            </Card>

            <Dialog isOpen={dialogTambah === 'supir'} width={480}
                onRequestClose={tutupDialogTambah} onClose={tutupDialogTambah}>
                <h5 className="text-base font-semibold mb-1">Tambah Supir ke Kontrak</h5>
                <p className="text-sm text-gray-500 mb-4">Supir baru dari {vendorName} yang langsung tertaut ke kontrak ini</p>
                <form onSubmit={e => { e.preventDefault(); simpanTambahSupir() }}>
                    <div className="grid grid-cols-1 gap-y-1">
                        <FormItem label="Nama" asterisk invalid={!!tambahErrors.nama} errorMessage={tambahErrors.nama}>
                            <Input placeholder="Nama lengkap supir" value={supirForm.nama} invalid={!!tambahErrors.nama}
                                onChange={e => setSupirForm(p => ({ ...p, nama: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Telepon">
                            <Input placeholder="08xxxxxxxxxx" value={supirForm.telepon}
                                onChange={e => setSupirForm(p => ({ ...p, telepon: e.target.value }))} />
                        </FormItem>
                        <FormItem label="No SIM">
                            <Input placeholder="Nomor SIM" value={supirForm.no_sim}
                                onChange={e => setSupirForm(p => ({ ...p, no_sim: e.target.value }))} />
                        </FormItem>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="plain" onClick={tutupDialogTambah}>Batal</Button>
                        <Button type="submit" variant="solid" loading={menyimpanTambah}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog
                isOpen={!!hapusUnit}
                type="danger"
                title="Hapus unit dari kontrak?"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{
                    loading: menghapusUnit,
                    customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500',
                }}
                onClose={() => setHapusUnit(null)}
                onCancel={() => setHapusUnit(null)}
                onConfirm={jalankanHapusUnit}
            >
                <p className="text-sm">
                    Unit <span className="font-semibold font-mono">{hapusUnit?.nopol}</span> akan dihapus dari kontrak ini.
                    Riwayat penugasannya tetap tersimpan; unit yang masih dipakai penugasan aktif akan ditolak sistem.
                    {data.status === 'aktif' && (
                        <span className="block mt-2 text-amber-600 dark:text-amber-400">
                            Kontrak ini berstatus Aktif — komposisi unit berubah, kontrak akan turun ke Draft dan wajib approval ulang.
                        </span>
                    )}
                    {data.status === 'menunggu_approval' && (
                        <span className="block mt-2 text-amber-600 dark:text-amber-400">
                            Kontrak ini sedang Menunggu Approval — pengajuan akan ditarik dan kontrak kembali ke Draft.
                        </span>
                    )}
                </p>
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={!!timpaKonfirmasi}
                type="warning"
                title={`Timpa daftar ${timpaKonfirmasi?.jenis === 'unit' ? 'unit' : 'supir'} kontrak ini?`}
                confirmText="Ya, Timpa"
                cancelText="Batal"
                confirmButtonProps={{ loading: uploading !== '' }}
                onClose={() => setTimpaKonfirmasi(null)}
                onCancel={() => setTimpaKonfirmasi(null)}
                onConfirm={jalankanTimpa}
            >
                <p className="text-sm">
                    Daftar {timpaKonfirmasi?.jenis === 'unit' ? 'unit' : 'supir'} kontrak ini akan disamakan dengan isi excel:
                    data yang cocok diperbarui, baris baru ditambahkan, dan yang tidak ada di excel akan dihapus dari kontrak.
                    {data.status === 'aktif' && timpaKonfirmasi?.jenis === 'unit' && (
                        <span className="block mt-2 text-amber-600 dark:text-amber-400">
                            Kontrak ini berstatus Aktif — bila ada unit yang bertambah atau terhapus, kontrak akan turun ke Draft dan wajib approval ulang.
                        </span>
                    )}
                    {data.status === 'menunggu_approval' && timpaKonfirmasi?.jenis === 'unit' && (
                        <span className="block mt-2 text-amber-600 dark:text-amber-400">
                            Kontrak ini sedang Menunggu Approval — bila ada unit yang bertambah atau terhapus, pengajuan akan ditarik dan kontrak kembali ke Draft.
                        </span>
                    )}
                </p>
            </ConfirmDialog>

            <Dialog isOpen={!!daftarGagal} width={520}
                onRequestClose={() => setDaftarGagal(null)} onClose={() => setDaftarGagal(null)}>
                <h5 className="text-base font-semibold mb-4">Baris Gagal — {daftarGagal?.judul}</h5>
                <div className="max-h-80 overflow-y-auto flex flex-col gap-2">
                    {daftarGagal?.daftar.map((g, idx) => (
                        <p key={idx} className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-semibold">{g.label}:</span>{' '}
                            <span className="text-red-500">{g.alasan}</span>
                        </p>
                    ))}
                </div>
                <div className="flex justify-end mt-6">
                    <Button variant="solid" onClick={() => setDaftarGagal(null)}>Tutup</Button>
                </div>
            </Dialog>

            <LogApprovalDialog
                isOpen={logOpen}
                onClose={() => setLogOpen(false)}
                kode="kontrak_vendor"
                idReferensi={id}
                emptyMessage="Belum ada pengajuan approval untuk kontrak ini — ajukan dari tombol Ajukan Approval."
            />

            <AjukanApprovalDialog
                isOpen={ajukanOpen}
                onClose={() => setAjukanOpen(false)}
                kode="kontrak_vendor"
                idReferensi={id}
                nomor={data.nomor_kontrak}
                onAjukan={async () => {
                    const updated = await kontrakVendorService.ajukanApproval(id)
                    setData(updated)
                    setForm(toFormState(updated))
                }}
                onSukses={() => { }}
            />
        </div>
    )
}