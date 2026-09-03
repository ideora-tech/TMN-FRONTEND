'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Select, Dialog, Switcher, Tooltip, toast, Notification, Tag } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineExclamationCircle, HiOutlineTrash, HiPlusCircle } from 'react-icons/hi'
import dayjs from 'dayjs'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { karyawanService, Karyawan, RiwayatJabatan } from '@/services/karyawan.service'
import { karyawanExitService, JenisExit } from '@/services/karyawanExit.service'
import { kontrakKaryawanService, KontrakKaryawan, JenisKontrak } from '@/services/kontrakKaryawan.service'
import { dokumenKaryawanService, DokumenKaryawan } from '@/services/dokumenKaryawan.service'
import { Jabatan } from '@/services/jabatan.service'
import { LokasiKantor } from '@/services/lokasi-kantor.service'

const JENIS_EXIT_OPTIONS: { value: JenisExit; label: string }[] = [
    { value: 'resign',        label: 'Resign' },
    { value: 'pensiun',       label: 'Pensiun' },
    { value: 'phk',           label: 'PHK' },
    { value: 'meninggal',     label: 'Meninggal Dunia' },
    { value: 'kontrak_habis', label: 'Kontrak Habis' },
]

const STATUS_KEPEGAWAIAN_CLASS: Record<string, string> = {
    tetap:   'bg-emerald-100 text-emerald-600',
    kontrak: 'bg-blue-100 text-blue-600',
    magang:  'bg-yellow-100 text-yellow-700',
}

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]
const JK_OPTIONS = [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]
const STATUS_KEPEGAWAIAN_OPTIONS = [
    { value: 'tetap',   label: 'Tetap' },
    { value: 'kontrak', label: 'Kontrak' },
    { value: 'magang',  label: 'Magang' },
]
const PERNIKAHAN_OPTIONS = [
    { value: 'belum_menikah', label: 'Belum Menikah' },
    { value: 'menikah',       label: 'Menikah' },
    { value: 'cerai',         label: 'Cerai' },
]
const PERNIKAHAN_LABEL: Record<string, string> = {
    belum_menikah: 'Belum Menikah', menikah: 'Menikah', cerai: 'Cerai',
}
const PTKP_OPTIONS = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'].map(v => ({ value: v, label: v }))
const PENDIDIKAN_OPTIONS = ['SD', 'SMP', 'SMA/SMK', 'D1', 'D2', 'D3', 'S1', 'S2', 'S3'].map(v => ({ value: v, label: v }))

const JENIS_KONTRAK_OPTIONS: { value: JenisKontrak; label: string }[] = [
    { value: 'pkwt',      label: 'PKWT (Kontrak)' },
    { value: 'pkwtt',     label: 'PKWTT (Tetap)' },
    { value: 'harian',    label: 'Harian Lepas' },
    { value: 'magang',    label: 'Magang' },
    { value: 'probation', label: 'Probation' },
]
const JENIS_KONTRAK_LABEL: Record<string, string> = {
    pkwt: 'PKWT', pkwtt: 'PKWTT', harian: 'Harian Lepas', magang: 'Magang', probation: 'Probation',
}

const JENIS_DOKUMEN_OPTIONS = ['KTP', 'SIM', 'NPWP', 'Ijazah', 'Kontrak Kerja', 'Sertifikat', 'Lainnya'].map(v => ({ value: v, label: v }))

const MAX_FILE_SIZE = 5 * 1024 * 1024

function getExpiryInfo(berlakuSampai: string | null): { label: string; className: string } {
    if (!berlakuSampai) return { label: '—', className: 'bg-gray-100 text-gray-400' }
    const days = Math.ceil((new Date(berlakuSampai).getTime() - Date.now()) / 86400000)
    if (days < 0)   return { label: 'Habis Masa Berlaku', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    if (days <= 14) return { label: `${days} hari lagi`, className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    if (days <= 30) return { label: `${days} hari lagi`, className: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' }
    if (days <= 60) return { label: `${days} hari lagi`, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' }
    return { label: `${days} hari lagi`, className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' }
}

type FormState = Partial<Karyawan> & { id_jabatan?: string; id_lokasi?: string }

type KontrakForm = {
    id_kontrak?: string
    jenis_kontrak: JenisKontrak | ''
    nomor_kontrak: string
    tanggal_mulai: string
    tanggal_selesai: string
    keterangan: string
    url_file?: string | null
}

const KONTRAK_FORM_KOSONG: KontrakForm = {
    jenis_kontrak: '', nomor_kontrak: '', tanggal_mulai: '', tanggal_selesai: '', keterangan: '',
}

const InfoField = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
    </div>
)

const InfoSection = ({ title }: { title: string }) => (
    <div className="sm:col-span-2 mt-2 first:mt-0">
        <p className="font-semibold text-sm text-gray-700 dark:text-gray-200">{title}</p>
        <div className="border-t border-gray-100 dark:border-gray-700 mt-2" />
    </div>
)

const kosong = <span className="text-gray-400">—</span>

const totalHariPkwt = (list: KontrakKaryawan[]): number => {
    const hariIni = dayjs()
    return list
        .filter(k => k.jenis_kontrak === 'pkwt')
        .reduce((sum, k) => {
            const mulai = dayjs(k.tanggal_mulai)
            const akhir = k.tanggal_selesai ? dayjs(k.tanggal_selesai) : hariIni
            return sum + Math.max(0, akhir.diff(mulai, 'day') + 1)
        }, 0)
}

export default function KaryawanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [karyawan, setKaryawan] = useState<Karyawan | null>(null)
    const [loading, setLoading]   = useState(true)
    const [editing, setEditing]   = useState(false)
    const [form, setForm]         = useState<FormState>({})
    const [errors, setErrors]     = useState<Partial<Record<keyof FormState, string>>>({})
    const [saving, setSaving]     = useState(false)
    const [jabatanOptions, setJabatanOptions] = useState<{ value: string; label: string }[]>([])
    const [lokasiOptions, setLokasiOptions]   = useState<{ value: string; label: string }[]>([])

    const [kontrakList, setKontrakList]     = useState<KontrakKaryawan[]>([])
    const [kontrakOpen, setKontrakOpen]     = useState(false)
    const [kontrakForm, setKontrakForm]     = useState<KontrakForm>(KONTRAK_FORM_KOSONG)
    const [kontrakFile, setKontrakFile]     = useState<File | null>(null)
    const [kontrakErrors, setKontrakErrors] = useState<Record<string, string>>({})
    const [kontrakSaving, setKontrakSaving] = useState(false)
    const [kontrakHapus, setKontrakHapus]   = useState<KontrakKaryawan | null>(null)
    const [kontrakDeleting, setKontrakDeleting] = useState(false)

    const [dokumenList, setDokumenList]   = useState<DokumenKaryawan[]>([])
    const [dokumenOpen, setDokumenOpen]   = useState(false)
    const [dokumenEdit, setDokumenEdit]   = useState<DokumenKaryawan | null>(null)
    const [dokumenForm, setDokumenForm]   = useState({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' })
    const [dokumenFile, setDokumenFile]   = useState<File | null>(null)
    const [dokumenSaving, setDokumenSaving] = useState(false)
    const [dokumenHapus, setDokumenHapus]   = useState<DokumenKaryawan | null>(null)
    const [dokumenDeleting, setDokumenDeleting] = useState(false)

    const [exitOpen, setExitOpen] = useState(false)
    const [exitForm, setExitForm] = useState<{
        jenis_exit: JenisExit | ''
        tanggal_efektif: string
        alasan: string
        dapat_direkrut_kembali: boolean
    }>({ jenis_exit: '', tanggal_efektif: '', alasan: '', dapat_direkrut_kembali: true })
    const [exitSaving, setExitSaving] = useState(false)

    const isiForm = (k: Karyawan): FormState => ({
        ...k,
        id_jabatan: k.jabatan?.id_jabatan ?? '',
        id_lokasi:  k.lokasi?.id_lokasi ?? '',
    })

    const muatKontrak = useCallback(() => {
        kontrakKaryawanService.list(id)
            .then(setKontrakList)
            .catch(() => setKontrakList([]))
    }, [id])

    const muatDokumen = useCallback(() => {
        dokumenKaryawanService.list(id)
            .then(setDokumenList)
            .catch(() => setDokumenList([]))
    }, [id])

    const [riwayatJabatan, setRiwayatJabatan] = useState<RiwayatJabatan[]>([])

    useEffect(() => {
        karyawanService.riwayatJabatan(id)
            .then(setRiwayatJabatan)
            .catch(() => setRiwayatJabatan([]))
    }, [id, karyawan?.jabatan?.id_jabatan])

    useEffect(() => {
        karyawanService.get(id)
            .then(k => { setKaryawan(k); setForm(isiForm(k)) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
        muatKontrak()
        muatDokumen()
        axios.get(API_ENDPOINTS.JABATAN, { params: { limit: 999 } })
            .then(jRes => setJabatanOptions((jRes.data.data as Jabatan[]).map(j => ({ value: j.id_jabatan, label: j.nama_jabatan }))))
            .catch(() => {})
        axios.get(API_ENDPOINTS.LOKASI_KANTOR, { params: { limit: 999 } })
            .then(lRes => setLokasiOptions((lRes.data.data as LokasiKantor[]).map(l => ({ value: l.id_lokasi, label: l.nama_lokasi }))))
            .catch(() => {})
    }, [id, muatKontrak, muatDokumen])

    const validate = () => {
        const e: Partial<Record<keyof FormState, string>> = {}
        if (!form.nik?.trim()) e.nik = 'NIK wajib diisi'
        if (!form.nama_karyawan?.trim()) e.nama_karyawan = 'Nama wajib diisi'
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
            const updated = await karyawanService.update(id, {
                nik:                  form.nik,
                nik_ktp:              form.nik_ktp || null,
                nama_karyawan:        form.nama_karyawan,
                email:                form.email || null,
                telepon:              form.telepon || null,
                jenis_kelamin:        form.jenis_kelamin ?? null,
                tempat_lahir:         form.tempat_lahir || null,
                tanggal_lahir:        form.tanggal_lahir || null,
                alamat_ktp:           form.alamat_ktp || null,
                alamat_domisili:      form.alamat_domisili || null,
                status_pernikahan:    form.status_pernikahan ?? null,
                jumlah_tanggungan:    form.jumlah_tanggungan ?? 0,
                status_ptkp:          form.status_ptkp || null,
                pendidikan_terakhir:  form.pendidikan_terakhir || null,
                npwp:                 form.npwp || null,
                nama_bank:            form.nama_bank || null,
                nomor_rekening:       form.nomor_rekening || null,
                atas_nama_rekening:   form.atas_nama_rekening || null,
                ikut_bpjs_kesehatan:  form.ikut_bpjs_kesehatan ?? false,
                no_bpjs_kesehatan:    form.no_bpjs_kesehatan || null,
                ikut_bpjs_ketenagakerjaan: form.ikut_bpjs_ketenagakerjaan ?? false,
                no_bpjs_ketenagakerjaan:   form.no_bpjs_ketenagakerjaan || null,
                override_persen_bpjs_kesehatan: form.override_persen_bpjs_kesehatan ?? null,
                override_persen_bpjs_jht:       form.override_persen_bpjs_jht ?? null,
                override_persen_bpjs_jp:        form.override_persen_bpjs_jp ?? null,
                override_plafon_bpjs_kesehatan: form.override_plafon_bpjs_kesehatan ?? null,
                override_tunjangan_jabatan:     form.override_tunjangan_jabatan ?? null,
                kontak_darurat_nama:     form.kontak_darurat_nama || null,
                kontak_darurat_telepon:  form.kontak_darurat_telepon || null,
                kontak_darurat_hubungan: form.kontak_darurat_hubungan || null,
                tanggal_masuk:        form.tanggal_masuk || null,
                status_kepegawaian:   form.status_kepegawaian ?? null,
                gaji_pokok:           form.gaji_pokok,
                id_jabatan:           form.id_jabatan || null,
                id_lokasi:            form.id_lokasi || null,
                aktif:                form.aktif,
            })
            setKaryawan(updated)
            setForm(isiForm(updated))
            setEditing(false)
            setErrors({})
            toast.push(<Notification type="success" title="Data karyawan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const bukaTambahKontrak = () => {
        setKontrakForm(KONTRAK_FORM_KOSONG)
        setKontrakFile(null)
        setKontrakErrors({})
        setKontrakOpen(true)
    }

    const bukaEditKontrak = (k: KontrakKaryawan) => {
        setKontrakForm({
            id_kontrak: k.id_kontrak,
            jenis_kontrak: k.jenis_kontrak,
            nomor_kontrak: k.nomor_kontrak ?? '',
            tanggal_mulai: k.tanggal_mulai,
            tanggal_selesai: k.tanggal_selesai ?? '',
            keterangan: k.keterangan ?? '',
            url_file: k.url_file,
        })
        setKontrakFile(null)
        setKontrakErrors({})
        setKontrakOpen(true)
    }

    const handleSimpanKontrak = async () => {
        const e: Record<string, string> = {}
        if (!kontrakForm.jenis_kontrak) e.jenis_kontrak = 'Jenis kontrak wajib dipilih'
        if (!kontrakForm.tanggal_mulai) e.tanggal_mulai = 'Tanggal mulai wajib diisi'
        if (kontrakForm.tanggal_selesai && kontrakForm.tanggal_mulai && kontrakForm.tanggal_selesai < kontrakForm.tanggal_mulai) {
            e.tanggal_selesai = 'Tanggal selesai tidak boleh sebelum tanggal mulai'
        }
        setKontrakErrors(e)
        if (Object.keys(e).length > 0) return

        setKontrakSaving(true)
        try {
            const payload = {
                jenis_kontrak: kontrakForm.jenis_kontrak as JenisKontrak,
                nomor_kontrak: kontrakForm.nomor_kontrak || null,
                tanggal_mulai: kontrakForm.tanggal_mulai,
                tanggal_selesai: kontrakForm.tanggal_selesai || null,
                keterangan: kontrakForm.keterangan || null,
            }
            if (kontrakForm.id_kontrak) {
                await kontrakKaryawanService.update(id, kontrakForm.id_kontrak, payload, kontrakFile ?? undefined)
                toast.push(<Notification type="success" title="Kontrak berhasil diperbarui" />)
            } else {
                await kontrakKaryawanService.create(id, payload, kontrakFile)
                toast.push(<Notification type="success" title="Kontrak berhasil ditambahkan" />)
            }
            setKontrakOpen(false)
            muatKontrak()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setKontrakSaving(false)
        }
    }

    const handleHapusKontrak = async () => {
        if (!kontrakHapus) return
        setKontrakDeleting(true)
        try {
            await kontrakKaryawanService.delete(id, kontrakHapus.id_kontrak)
            toast.push(<Notification type="success" title="Kontrak berhasil dihapus" />)
            setKontrakHapus(null)
            muatKontrak()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setKontrakHapus(null)
        } finally {
            setKontrakDeleting(false)
        }
    }

    const bukaTambahDokumen = () => {
        setDokumenEdit(null)
        setDokumenForm({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' })
        setDokumenFile(null)
        setDokumenOpen(true)
    }

    const bukaEditDokumen = (d: DokumenKaryawan) => {
        setDokumenEdit(d)
        setDokumenForm({
            jenis_dokumen: d.jenis_dokumen,
            nomor: d.nomor ?? '',
            berlaku_sampai: d.berlaku_sampai ?? '',
        })
        setDokumenFile(null)
        setDokumenOpen(true)
    }

    const handleSimpanDokumen = async () => {
        if (!dokumenForm.jenis_dokumen || (!dokumenEdit && !dokumenFile)) return
        setDokumenSaving(true)
        try {
            const payload = {
                jenis_dokumen: dokumenForm.jenis_dokumen,
                nomor: dokumenForm.nomor || null,
                berlaku_sampai: dokumenForm.berlaku_sampai || null,
            }
            if (dokumenEdit) {
                await dokumenKaryawanService.update(id, dokumenEdit.id_dokumen_karyawan, payload, dokumenFile ?? undefined)
                toast.push(<Notification type="success" title="Dokumen berhasil diperbarui" />)
            } else {
                await dokumenKaryawanService.create(id, payload, dokumenFile)
                toast.push(<Notification type="success" title="Dokumen berhasil ditambahkan" />)
            }
            setDokumenOpen(false)
            muatDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDokumenSaving(false)
        }
    }

    const handleHapusDokumen = async () => {
        if (!dokumenHapus) return
        setDokumenDeleting(true)
        try {
            await dokumenKaryawanService.delete(id, dokumenHapus.id_dokumen_karyawan)
            toast.push(<Notification type="success" title="Dokumen berhasil dihapus" />)
            setDokumenHapus(null)
            muatDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDokumenHapus(null)
        } finally {
            setDokumenDeleting(false)
        }
    }

    const validasiFile = (f: File | null, set: (f: File | null) => void) => {
        if (f && f.size > MAX_FILE_SIZE) {
            toast.push(<Notification type="danger" title={`Ukuran file maksimal 5 MB (file dipilih: ${(f.size / 1024 / 1024).toFixed(1)} MB)`} />)
            return
        }
        set(f)
    }

    const handleExit = async () => {
        if (!exitForm.jenis_exit || !exitForm.tanggal_efektif) return
        setExitSaving(true)
        try {
            await karyawanExitService.create({
                id_karyawan:            id,
                jenis_exit:             exitForm.jenis_exit,
                tanggal_efektif:        exitForm.tanggal_efektif,
                alasan:                 exitForm.alasan || null,
                dapat_direkrut_kembali: exitForm.dapat_direkrut_kembali,
            })
            toast.push(<Notification type="success" title="Proses exit karyawan berhasil dicatat" />)
            setExitOpen(false)
            const updated = await karyawanService.get(id)
            setKaryawan(updated)
            setForm(isiForm(updated))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setExitSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!karyawan) return <div className="p-6 text-red-500">Karyawan tidak ditemukan.</div>

    const initial = karyawan.nama_karyawan?.charAt(0).toUpperCase() ?? 'K'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.KARYAWAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{karyawan.nama_karyawan}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">NIK: {karyawan.nik}</p>
                </div>
            </div>

            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{karyawan.nama_karyawan}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        NIK: {karyawan.nik} &middot; {karyawan.jabatan?.nama_jabatan ?? 'Tanpa Jabatan'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                                {karyawan.status_kepegawaian && (
                                    <Tag className={STATUS_KEPEGAWAIAN_CLASS[karyawan.status_kepegawaian] ?? ''}>
                                        {karyawan.status_kepegawaian.charAt(0).toUpperCase() + karyawan.status_kepegawaian.slice(1)}
                                    </Tag>
                                )}
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${karyawan.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {karyawan.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            <InfoSection title="Data Pribadi" />
                            <InfoField label="NIK" value={karyawan.nik} />
                            <InfoField label="NIK KTP" value={karyawan.nik_ktp ?? kosong} />
                            <InfoField label="Email" value={karyawan.email ?? kosong} />
                            <InfoField label="Telepon" value={karyawan.telepon ?? kosong} />
                            <InfoField label="Tempat, Tanggal Lahir" value={
                                karyawan.tempat_lahir || karyawan.tanggal_lahir
                                    ? `${karyawan.tempat_lahir ?? '—'}, ${karyawan.tanggal_lahir ? dayjs(karyawan.tanggal_lahir).format('DD MMM YYYY') : '—'}`
                                    : kosong
                            } />
                            <InfoField label="Status Pernikahan" value={
                                karyawan.status_pernikahan
                                    ? `${PERNIKAHAN_LABEL[karyawan.status_pernikahan] ?? karyawan.status_pernikahan} · ${karyawan.jumlah_tanggungan} tanggungan`
                                    : kosong
                            } />
                            <InfoField label="Pendidikan Terakhir" value={karyawan.pendidikan_terakhir ?? kosong} />
                            <InfoField label="Alamat KTP" value={karyawan.alamat_ktp ?? kosong} />
                            <InfoField label="Alamat Domisili" value={karyawan.alamat_domisili ?? kosong} />

                            <InfoSection title="Kepegawaian" />
                            <InfoField label="Jabatan" value={karyawan.jabatan?.nama_jabatan ?? kosong} />
                            <InfoField label="Lokasi Kerja" value={karyawan.lokasi?.nama_lokasi ?? kosong} />
                            <InfoField label="Tanggal Masuk" value={karyawan.tanggal_masuk ? dayjs(karyawan.tanggal_masuk).format('DD MMM YYYY') : kosong} />
                            <InfoField label="Gaji Pokok" value={formatRupiah(karyawan.gaji_pokok)} />
                            <InfoField label="Tunjangan Jabatan" value={
                                karyawan.override_tunjangan_jabatan !== null ? (
                                    <span className="text-amber-600 dark:text-amber-400">
                                        {formatRupiah(karyawan.override_tunjangan_jabatan)} (override)
                                    </span>
                                ) : formatRupiah(karyawan.jabatan?.tunjangan_jabatan ?? 0) + (karyawan.jabatan ? ' (default jabatan)' : '')
                            } />

                            <InfoSection title="Pajak & BPJS" />
                            <InfoField label="Status PTKP" value={karyawan.status_ptkp ?? kosong} />
                            <InfoField label="NPWP" value={karyawan.npwp ?? kosong} />
                            <InfoField label="BPJS Kesehatan" value={
                                karyawan.ikut_bpjs_kesehatan ? (karyawan.no_bpjs_kesehatan ?? 'Terdaftar') : 'Tidak ikut'
                            } />
                            <InfoField label="BPJS Ketenagakerjaan" value={
                                karyawan.ikut_bpjs_ketenagakerjaan ? (karyawan.no_bpjs_ketenagakerjaan ?? 'Terdaftar') : 'Tidak ikut'
                            } />
                            {(karyawan.override_persen_bpjs_kesehatan !== null
                                || karyawan.override_persen_bpjs_jht !== null
                                || karyawan.override_persen_bpjs_jp !== null
                                || karyawan.override_plafon_bpjs_kesehatan !== null) && (
                                <InfoField label="Override BPJS" value={
                                    <span className="text-amber-600 dark:text-amber-400">
                                        {[
                                            karyawan.override_persen_bpjs_kesehatan !== null ? `Kesehatan ${karyawan.override_persen_bpjs_kesehatan}%` : null,
                                            karyawan.override_persen_bpjs_jht !== null ? `JHT ${karyawan.override_persen_bpjs_jht}%` : null,
                                            karyawan.override_persen_bpjs_jp !== null ? `JP ${karyawan.override_persen_bpjs_jp}%` : null,
                                            karyawan.override_plafon_bpjs_kesehatan !== null ? `Plafon ${formatRupiah(karyawan.override_plafon_bpjs_kesehatan)}` : null,
                                        ].filter(Boolean).join(' · ')}
                                    </span>
                                } />
                            )}

                            <InfoSection title="Rekening Bank" />
                            <InfoField label="Bank" value={karyawan.nama_bank ?? kosong} />
                            <InfoField label="Nomor Rekening" value={
                                karyawan.nomor_rekening
                                    ? `${karyawan.nomor_rekening}${karyawan.atas_nama_rekening ? ` a.n. ${karyawan.atas_nama_rekening}` : ''}`
                                    : kosong
                            } />

                            <InfoSection title="Kontak Darurat" />
                            <InfoField label="Nama" value={
                                karyawan.kontak_darurat_nama
                                    ? `${karyawan.kontak_darurat_nama}${karyawan.kontak_darurat_hubungan ? ` (${karyawan.kontak_darurat_hubungan})` : ''}`
                                    : kosong
                            } />
                            <InfoField label="Telepon" value={karyawan.kontak_darurat_telepon ?? kosong} />
                        </div>
                        {karyawan.aktif && (
                            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                                <Button variant="plain" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    icon={<HiOutlineExclamationCircle />}
                                    onClick={() => setExitOpen(true)}>
                                    Proses Exit Karyawan
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama_karyawan?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Data Karyawan</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi karyawan di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="NIK" asterisk invalid={!!errors.nik} errorMessage={errors.nik}>
                                <Input value={form.nik ?? ''} invalid={!!errors.nik}
                                    onChange={e => setForm(p => ({ ...p, nik: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nama Karyawan" asterisk invalid={!!errors.nama_karyawan} errorMessage={errors.nama_karyawan}>
                                <Input value={form.nama_karyawan ?? ''} invalid={!!errors.nama_karyawan}
                                    onChange={e => setForm(p => ({ ...p, nama_karyawan: e.target.value }))} />
                            </FormItem>
                            <FormItem label="NIK KTP">
                                <Input placeholder="16 digit NIK KTP" value={form.nik_ktp ?? ''}
                                    onChange={e => setForm(p => ({ ...p, nik_ktp: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Email">
                                <Input type="email" value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Telepon">
                                <Input value={form.telepon ?? ''} onChange={e => setForm(p => ({ ...p, telepon: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Jenis Kelamin">
                                <Select isSearchable={false} options={JK_OPTIONS}
                                    value={JK_OPTIONS.find(o => o.value === form.jenis_kelamin) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, jenis_kelamin: (opt?.value as 'L' | 'P') ?? null }))} />
                            </FormItem>
                            <FormItem label="Tempat Lahir">
                                <Input value={form.tempat_lahir ?? ''} onChange={e => setForm(p => ({ ...p, tempat_lahir: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Tanggal Lahir">
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={form.tanggal_lahir ? dayjs(form.tanggal_lahir).toDate() : null}
                                    onChange={date => setForm(p => ({ ...p, tanggal_lahir: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="Status Pernikahan">
                                <Select isClearable isSearchable={false} placeholder="Pilih status..."
                                    options={PERNIKAHAN_OPTIONS}
                                    value={PERNIKAHAN_OPTIONS.find(o => o.value === form.status_pernikahan) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, status_pernikahan: (opt?.value as Karyawan['status_pernikahan']) ?? null }))} />
                            </FormItem>
                            <FormItem label="Jumlah Tanggungan">
                                <Input type="number" min={0} max={10} value={form.jumlah_tanggungan ?? 0}
                                    onChange={e => setForm(p => ({ ...p, jumlah_tanggungan: Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Pendidikan Terakhir">
                                <Select isClearable isSearchable={false} placeholder="Pilih pendidikan..."
                                    options={PENDIDIKAN_OPTIONS}
                                    value={PENDIDIKAN_OPTIONS.find(o => o.value === form.pendidikan_terakhir) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, pendidikan_terakhir: opt?.value ?? '' }))} />
                            </FormItem>
                            <div className="hidden sm:block" />
                            <FormItem label="Alamat KTP">
                                <Input textArea rows={2} value={form.alamat_ktp ?? ''}
                                    onChange={e => setForm(p => ({ ...p, alamat_ktp: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Alamat Domisili">
                                <Input textArea rows={2} value={form.alamat_domisili ?? ''}
                                    onChange={e => setForm(p => ({ ...p, alamat_domisili: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Tanggal Masuk">
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={form.tanggal_masuk ? dayjs(form.tanggal_masuk).toDate() : null}
                                    onChange={date => setForm(p => ({ ...p, tanggal_masuk: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="Status Kepegawaian">
                                <Select isSearchable={false} options={STATUS_KEPEGAWAIAN_OPTIONS}
                                    value={STATUS_KEPEGAWAIAN_OPTIONS.find(o => o.value === form.status_kepegawaian) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, status_kepegawaian: (opt?.value as Karyawan['status_kepegawaian']) ?? null }))} />
                            </FormItem>
                            <FormItem label="Jabatan">
                                <Select isClearable isSearchable placeholder="Pilih jabatan..."
                                    options={jabatanOptions}
                                    value={jabatanOptions.find(o => o.value === form.id_jabatan) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, id_jabatan: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Lokasi Kerja">
                                <Select isClearable isSearchable placeholder="Pilih lokasi..."
                                    options={lokasiOptions}
                                    value={lokasiOptions.find(o => o.value === form.id_lokasi) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, id_lokasi: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Gaji Pokok">
                                <Input type="number" min={0} value={form.gaji_pokok ?? ''} onChange={e => setForm(p => ({ ...p, gaji_pokok: Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === '1' }))} />
                            </FormItem>
                            <FormItem label="Status PTKP">
                                <Select isClearable isSearchable={false} placeholder="Pilih PTKP..."
                                    options={PTKP_OPTIONS}
                                    value={PTKP_OPTIONS.find(o => o.value === form.status_ptkp) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, status_ptkp: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="NPWP">
                                <Input value={form.npwp ?? ''} onChange={e => setForm(p => ({ ...p, npwp: e.target.value }))} />
                            </FormItem>
                            <FormItem label="BPJS Kesehatan">
                                <div className="flex items-center gap-3">
                                    <Switcher checked={form.ikut_bpjs_kesehatan ?? false}
                                        onChange={checked => setForm(p => ({ ...p, ikut_bpjs_kesehatan: checked }))} />
                                    <Input placeholder="Nomor kepesertaan" value={form.no_bpjs_kesehatan ?? ''}
                                        disabled={!form.ikut_bpjs_kesehatan}
                                        onChange={e => setForm(p => ({ ...p, no_bpjs_kesehatan: e.target.value }))} />
                                </div>
                            </FormItem>
                            <FormItem label="BPJS Ketenagakerjaan">
                                <div className="flex items-center gap-3">
                                    <Switcher checked={form.ikut_bpjs_ketenagakerjaan ?? false}
                                        onChange={checked => setForm(p => ({ ...p, ikut_bpjs_ketenagakerjaan: checked }))} />
                                    <Input placeholder="Nomor kepesertaan" value={form.no_bpjs_ketenagakerjaan ?? ''}
                                        disabled={!form.ikut_bpjs_ketenagakerjaan}
                                        onChange={e => setForm(p => ({ ...p, no_bpjs_ketenagakerjaan: e.target.value }))} />
                                </div>
                            </FormItem>

                            <div className="sm:col-span-2 mt-2">
                                <p className="text-xs font-medium text-gray-500">Override Persentase BPJS (Opsional)</p>
                                <p className="text-xs text-gray-400 mt-0.5">Kosongkan untuk ikut pengaturan perusahaan di halaman Payroll</p>
                            </div>
                            <FormItem label="Override BPJS Kesehatan (%)">
                                <Input type="number" min={0} max={100} step={0.1} placeholder="Ikut default"
                                    value={form.override_persen_bpjs_kesehatan ?? ''}
                                    onChange={e => setForm(p => ({ ...p, override_persen_bpjs_kesehatan: e.target.value === '' ? null : Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Override Plafon Gaji BPJS Kesehatan (Rp)">
                                <Input type="number" min={0} placeholder="Ikut default"
                                    value={form.override_plafon_bpjs_kesehatan ?? ''}
                                    onChange={e => setForm(p => ({ ...p, override_plafon_bpjs_kesehatan: e.target.value === '' ? null : Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Override BPJS JHT (%)">
                                <Input type="number" min={0} max={100} step={0.1} placeholder="Ikut default"
                                    value={form.override_persen_bpjs_jht ?? ''}
                                    onChange={e => setForm(p => ({ ...p, override_persen_bpjs_jht: e.target.value === '' ? null : Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Override BPJS JP (%)">
                                <Input type="number" min={0} max={100} step={0.1} placeholder="Ikut default"
                                    value={form.override_persen_bpjs_jp ?? ''}
                                    onChange={e => setForm(p => ({ ...p, override_persen_bpjs_jp: e.target.value === '' ? null : Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Override Tunjangan Jabatan (Rp)"
                                extra={<span className="text-xs text-gray-400">Kosongkan untuk ikut default tunjangan jabatan</span>}>
                                <Input type="number" min={0} placeholder="Ikut default jabatan"
                                    value={form.override_tunjangan_jabatan ?? ''}
                                    onChange={e => setForm(p => ({ ...p, override_tunjangan_jabatan: e.target.value === '' ? null : Number(e.target.value) }))} />
                            </FormItem>

                            <FormItem label="Nama Bank">
                                <Input placeholder="BCA / Mandiri / BRI..." value={form.nama_bank ?? ''}
                                    onChange={e => setForm(p => ({ ...p, nama_bank: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nomor Rekening">
                                <Input value={form.nomor_rekening ?? ''} onChange={e => setForm(p => ({ ...p, nomor_rekening: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Atas Nama Rekening">
                                <Input value={form.atas_nama_rekening ?? ''} onChange={e => setForm(p => ({ ...p, atas_nama_rekening: e.target.value }))} />
                            </FormItem>
                            <div className="hidden sm:block" />
                            <FormItem label="Nama Kontak Darurat">
                                <Input value={form.kontak_darurat_nama ?? ''} onChange={e => setForm(p => ({ ...p, kontak_darurat_nama: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Telepon Kontak Darurat">
                                <Input value={form.kontak_darurat_telepon ?? ''} onChange={e => setForm(p => ({ ...p, kontak_darurat_telepon: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Hubungan">
                                <Input placeholder="Istri / Suami / Orang tua..." value={form.kontak_darurat_hubungan ?? ''}
                                    onChange={e => setForm(p => ({ ...p, kontak_darurat_hubungan: e.target.value }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(isiForm(karyawan)); setErrors({}) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h5 className="font-bold">Riwayat Kontrak</h5>
                        <p className="text-gray-500 text-sm mt-0.5">Riwayat kontrak kerja karyawan</p>
                    </div>
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={bukaTambahKontrak}>
                        Tambah Kontrak
                    </Button>
                </div>
                {(() => {
                    const hari = totalHariPkwt(kontrakList)
                    const tahun = hari / 365
                    if (tahun < 4) return null
                    const label = (Math.round(tahun * 10) / 10).toString().replace('.', ',')
                    return (
                        <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 mb-4 text-sm border ${tahun >= 5
                            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400'
                            : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400'}`}>
                            <HiOutlineExclamationCircle className="text-lg shrink-0 mt-0.5" />
                            <span>
                                {tahun >= 5
                                    ? <>Total durasi PKWT karyawan ini sudah <strong>{label} tahun</strong> — melebihi batas maksimal 5 tahun (UU Cipta Kerja). Wajib diangkat PKWTT atau hubungan kerja diakhiri.</>
                                    : <>Total durasi PKWT karyawan ini sudah <strong>{label} tahun</strong> — mendekati batas maksimal 5 tahun (UU Cipta Kerja). Rencanakan pengangkatan PKWTT.</>}
                            </span>
                        </div>
                    )
                })()}
                {kontrakList.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">Belum ada riwayat kontrak.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Jenis</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Nomor</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Mulai</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Selesai</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Status</th>
                                    <th className="w-24" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {kontrakList.map(k => (
                                    <tr key={k.id_kontrak}>
                                        <td className="py-2.5 px-3 font-medium">{JENIS_KONTRAK_LABEL[k.jenis_kontrak] ?? k.jenis_kontrak}</td>
                                        <td className="py-2.5 px-3">{k.nomor_kontrak ?? kosong}</td>
                                        <td className="py-2.5 px-3">{dayjs(k.tanggal_mulai).format('DD MMM YYYY')}</td>
                                        <td className="py-2.5 px-3">{k.tanggal_selesai ? dayjs(k.tanggal_selesai).format('DD MMM YYYY') : kosong}</td>
                                        <td className="py-2.5 px-3">
                                            <Tag className={k.aktif
                                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}>
                                                {k.aktif ? 'Aktif' : 'Berakhir'}
                                            </Tag>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Tooltip title="Edit">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                        onClick={() => bukaEditKontrak(k)}>
                                                        <HiOutlinePencilAlt className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Hapus">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                                        onClick={() => setKontrakHapus(k)}>
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

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h5 className="font-bold">Dokumen</h5>
                        <p className="text-gray-500 text-sm mt-0.5">Dokumen kepegawaian & masa berlakunya</p>
                    </div>
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={bukaTambahDokumen}>
                        Tambah Dokumen
                    </Button>
                </div>
                {dokumenList.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">Belum ada dokumen.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Jenis</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Nomor</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Berlaku Sampai</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">File</th>
                                    <th className="w-24" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {dokumenList.map(d => {
                                    const expiry = getExpiryInfo(d.berlaku_sampai)
                                    return (
                                        <tr key={d.id_dokumen_karyawan}>
                                            <td className="py-2.5 px-3 font-medium">{d.jenis_dokumen}</td>
                                            <td className="py-2.5 px-3">{d.nomor ?? kosong}</td>
                                            <td className="py-2.5 px-3">
                                                {d.berlaku_sampai ? (
                                                    <div>
                                                        <p className="text-xs">{dayjs(d.berlaku_sampai).format('DD MMM YYYY')}</p>
                                                        <Tag className={`text-xs font-semibold mt-1 ${expiry.className}`}>{expiry.label}</Tag>
                                                    </div>
                                                ) : kosong}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                {d.url_file
                                                    ? <a href={d.url_file} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Lihat</a>
                                                    : kosong}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Tooltip title="Edit">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                            onClick={() => bukaEditDokumen(d)}>
                                                            <HiOutlinePencilAlt className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title="Hapus">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                                            onClick={() => setDokumenHapus(d)}>
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

                {!editing && (
                    <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Batal</Button>
                    </div>
                )}
            </Card>

            {riwayatJabatan.length > 0 && (
                <Card>
                    <div className="mb-4">
                        <h5 className="font-bold">Riwayat Jabatan</h5>
                        <p className="text-gray-500 text-sm mt-0.5">Mutasi & promosi tercatat otomatis saat jabatan diubah</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Tanggal</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Dari</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Menjadi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {riwayatJabatan.map(r => (
                                    <tr key={r.id_riwayat}>
                                        <td className="py-2.5 px-3 text-xs">{dayjs(r.dibuat_pada).format('DD MMM YYYY HH:mm')}</td>
                                        <td className="py-2.5 px-3">{r.jabatan_lama ?? <span className="text-gray-400">Tanpa jabatan</span>}</td>
                                        <td className="py-2.5 px-3 font-medium">{r.jabatan_baru ?? <span className="text-gray-400">Tanpa jabatan</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Dialog Tambah/Edit Dokumen */}
            <Dialog isOpen={dokumenOpen} width={800} onRequestClose={() => setDokumenOpen(false)} onClose={() => setDokumenOpen(false)}>
                <h5 className="font-bold mb-4">{dokumenEdit ? 'Edit Dokumen' : 'Tambah Dokumen'}</h5>
                <form onSubmit={e => { e.preventDefault(); handleSimpanDokumen() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Jenis Dokumen" asterisk>
                        <Select isSearchable={false} placeholder="Pilih jenis..."
                            options={JENIS_DOKUMEN_OPTIONS}
                            value={JENIS_DOKUMEN_OPTIONS.find(o => o.value === dokumenForm.jenis_dokumen) ?? null}
                            onChange={opt => setDokumenForm(p => ({ ...p, jenis_dokumen: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Nomor Dokumen">
                        <Input placeholder="Nomor dokumen (opsional)" value={dokumenForm.nomor}
                            onChange={e => setDokumenForm(p => ({ ...p, nomor: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Berlaku Sampai" extra={<span className="text-xs text-gray-400">Kosongkan bila tidak ada masa berlaku</span>}>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={dokumenForm.berlaku_sampai ? dayjs(dokumenForm.berlaku_sampai).toDate() : null}
                            onChange={date => setDokumenForm(p => ({ ...p, berlaku_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label={dokumenEdit ? 'File (ganti, opsional)' : 'File'} asterisk={!dokumenEdit}>
                        <UploadBerkas
                            file={dokumenFile}
                            accept=".pdf,.jpg,.jpeg,.png"
                            label={dokumenEdit ? 'Ganti file (opsional)' : 'Pilih file'}
                            existingUrl={dokumenEdit?.url_file ?? null}
                            existingLabel="Dokumen saat ini"
                            emptyText={dokumenEdit ? 'Belum ada dokumen tersimpan' : null}
                            onChange={f => validasiFile(f, setDokumenFile)}
                        />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => setDokumenOpen(false)}>Batal</Button>
                    <Button type="submit" variant="solid" loading={dokumenSaving}
                        disabled={!dokumenForm.jenis_dokumen || (!dokumenEdit && !dokumenFile)}>
                        Simpan
                    </Button>
                </div>
                </form>
            </Dialog>

            <ConfirmDialog
                isOpen={!!dokumenHapus}
                type="danger"
                title="Hapus Dokumen"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => setDokumenHapus(null)}
                onCancel={() => setDokumenHapus(null)}
                onConfirm={handleHapusDokumen}
                confirmButtonProps={{ loading: dokumenDeleting }}
            >
                <p>Hapus dokumen {dokumenHapus?.jenis_dokumen}
                    {dokumenHapus?.nomor ? ` (${dokumenHapus.nomor})` : ''} milik {karyawan.nama_karyawan}?</p>
            </ConfirmDialog>

            {/* Dialog Tambah/Edit Kontrak */}
            <Dialog isOpen={kontrakOpen} width={800} onRequestClose={() => setKontrakOpen(false)} onClose={() => setKontrakOpen(false)}>
                <h5 className="font-bold mb-4">{kontrakForm.id_kontrak ? 'Edit Kontrak' : 'Tambah Kontrak'}</h5>
                <form onSubmit={e => { e.preventDefault(); handleSimpanKontrak() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Jenis Kontrak" asterisk invalid={!!kontrakErrors.jenis_kontrak} errorMessage={kontrakErrors.jenis_kontrak}>
                        <Select isSearchable={false} placeholder="Pilih jenis..."
                            options={JENIS_KONTRAK_OPTIONS}
                            value={JENIS_KONTRAK_OPTIONS.find(o => o.value === kontrakForm.jenis_kontrak) ?? null}
                            onChange={opt => setKontrakForm(p => ({ ...p, jenis_kontrak: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Nomor Kontrak">
                        <Input placeholder="PKWT/2026/001" value={kontrakForm.nomor_kontrak}
                            onChange={e => setKontrakForm(p => ({ ...p, nomor_kontrak: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Tanggal Mulai" asterisk invalid={!!kontrakErrors.tanggal_mulai} errorMessage={kontrakErrors.tanggal_mulai}>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={kontrakForm.tanggal_mulai ? dayjs(kontrakForm.tanggal_mulai).toDate() : null}
                            onChange={date => setKontrakForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Tanggal Selesai" invalid={!!kontrakErrors.tanggal_selesai} errorMessage={kontrakErrors.tanggal_selesai}
                        extra={<span className="text-xs text-gray-400">Kosongkan untuk PKWTT</span>}>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={kontrakForm.tanggal_selesai ? dayjs(kontrakForm.tanggal_selesai).toDate() : null}
                            onChange={date => setKontrakForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <div className="sm:col-span-2">
                        <FormItem label="Keterangan">
                            <Input textArea rows={2} placeholder="Catatan kontrak (opsional)..."
                                value={kontrakForm.keterangan}
                                onChange={e => setKontrakForm(p => ({ ...p, keterangan: e.target.value }))} />
                        </FormItem>
                    </div>
                    <div className="sm:col-span-2">
                        <FormItem label="File Kontrak">
                            <UploadBerkas
                                file={kontrakFile}
                                accept=".pdf,.jpg,.jpeg,.png"
                                label={kontrakForm.id_kontrak ? 'Ganti file (opsional)' : 'Pilih file (opsional)'}
                                existingUrl={kontrakForm.url_file ?? null}
                                existingLabel="Dokumen saat ini"
                                emptyText={kontrakForm.id_kontrak ? 'Belum ada dokumen tersimpan' : null}
                                onChange={f => validasiFile(f, setKontrakFile)}
                            />
                        </FormItem>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => setKontrakOpen(false)}>Batal</Button>
                    <Button type="submit" variant="solid" loading={kontrakSaving}>Simpan</Button>
                </div>
                </form>
            </Dialog>

            <ConfirmDialog
                isOpen={!!kontrakHapus}
                type="danger"
                title="Hapus Kontrak"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => setKontrakHapus(null)}
                onCancel={() => setKontrakHapus(null)}
                onConfirm={handleHapusKontrak}
                confirmButtonProps={{ loading: kontrakDeleting }}
            >
                <p>Hapus kontrak {kontrakHapus ? (JENIS_KONTRAK_LABEL[kontrakHapus.jenis_kontrak] ?? kontrakHapus.jenis_kontrak) : ''}
                    {kontrakHapus?.nomor_kontrak ? ` (${kontrakHapus.nomor_kontrak})` : ''} milik {karyawan.nama_karyawan}?</p>
            </ConfirmDialog>

            {/* Exit Modal */}
            <Dialog isOpen={exitOpen} onClose={() => setExitOpen(false)}>
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
                            <HiOutlineExclamationCircle className="text-xl text-red-600" />
                        </div>
                        <div>
                            <h5 className="font-bold">Proses Exit Karyawan</h5>
                            <p className="text-gray-500 text-sm">{karyawan.nama_karyawan}</p>
                        </div>
                    </div>
                    <form onSubmit={e => { e.preventDefault(); handleExit() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Jenis Exit" asterisk>
                            <Select isSearchable={false} placeholder="Pilih jenis..."
                                options={JENIS_EXIT_OPTIONS}
                                value={JENIS_EXIT_OPTIONS.find(o => o.value === exitForm.jenis_exit) ?? null}
                                onChange={opt => setExitForm(p => ({ ...p, jenis_exit: opt?.value ?? '' as JenisExit }))} />
                        </FormItem>
                        <FormItem label="Tanggal Efektif" asterisk>
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={exitForm.tanggal_efektif ? dayjs(exitForm.tanggal_efektif).toDate() : null}
                                onChange={date => setExitForm(p => ({ ...p, tanggal_efektif: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Alasan">
                                <Input textArea rows={3} placeholder="Alasan keluar (opsional)..."
                                    value={exitForm.alasan}
                                    onChange={e => setExitForm(p => ({ ...p, alasan: e.target.value }))} />
                            </FormItem>
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-3 py-1">
                            <input type="checkbox" id="dapat_direkrut"
                                checked={exitForm.dapat_direkrut_kembali}
                                onChange={e => setExitForm(p => ({ ...p, dapat_direkrut_kembali: e.target.checked }))}
                                className="w-4 h-4 rounded accent-emerald-600" />
                            <label htmlFor="dapat_direkrut" className="text-sm cursor-pointer">
                                Dapat direkrut kembali
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setExitOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" className="bg-red-600 hover:bg-red-700" loading={exitSaving}
                            disabled={!exitForm.jenis_exit || !exitForm.tanggal_efektif}>
                            Proses Exit
                        </Button>
                    </div>
                    </form>
                </div>
            </Dialog>
        </div>
    )
}
