'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Tag, Dialog, Tooltip, Upload, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import axios from 'axios'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import RichTextEditor from '@/components/shared/RichTextEditor'
import RichTextView from '@/components/shared/RichTextView'
import AjukanApprovalDialog from '@/components/shared/AjukanApprovalDialog'
import PanelAlurStatus, { KELAS_TOMBOL_BATAL } from '@/components/shared/PanelAlurStatus'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineExternalLink, HiPlusCircle, HiOutlineTrash, HiOutlineViewList, HiOutlineMail, HiOutlineDocumentText, HiOutlineBan, HiOutlineChat, HiOutlineCheckCircle, HiOutlinePaperAirplane, HiOutlineBriefcase } from 'react-icons/hi'
import { PiFilePdfDuotone } from 'react-icons/pi'
import PilihRuteDialog, { PilihanItemRute } from '../PilihRuteDialog'
import { penawaranService, Penawaran, PenawaranStatus, TipeHargaPenawaran } from '@/services/penawaran.service'
import { projectService } from '@/services/project.service'
import { ruteService, Rute, labelRute } from '@/services/rute.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { klienService, Klien } from '@/services/klien.service'
import { ROUTES } from '@/constants/route.constant'
import { TIPE_HARGA_OPTIONS, labelTipeHarga, tipeHargaNilaiTetap } from '@/constants/tipeHarga.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { parseApiError } from '@/utils/error.util'
import { kontenKeHtml } from '@/utils/richText'
import { formatRupiah, formatNum } from '@/utils/formatNumber'

const STATUS_CLASS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
    menunggu_approval: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    terkirim: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    negosiasi: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    disetujui: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    ditolak: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', menunggu_approval: 'Menunggu Approval', terkirim: 'Terkirim', negosiasi: 'Negosiasi', disetujui: 'Disetujui', ditolak: 'Ditolak',
}

const NEXT_STATUS: Record<PenawaranStatus, PenawaranStatus[]> = {
    draft: [],
    menunggu_approval: [],
    terkirim: ['negosiasi', 'disetujui', 'ditolak'],
    negosiasi: ['disetujui', 'ditolak'],
    disetujui: [],
    ditolak: [],
}

const TAHAP_PENAWARAN = [
    { status: 'draft',             label: 'Draft' },
    { status: 'menunggu_approval', label: 'Approval' },
    { status: 'terkirim',          label: 'Terkirim' },
    { status: 'disetujui',         label: 'Disetujui' },
]

const LANGKAH_PENAWARAN: Record<string, { judul: string; keterangan: string }> = {
    draft:                { judul: 'Siap dikirim ke klien?',               keterangan: 'Penawaran perlu disetujui reviewer internal dulu sebelum bisa dikirim ke klien.' },
    draft_ditolak:        { judul: 'Perbaiki lalu ajukan ulang',           keterangan: 'Revisi data penawaran sesuai catatan reviewer, lalu ajukan approval kembali.' },
    draft_tanpa_approval: { judul: 'Siap dikirim ke klien?',               keterangan: 'Approval internal sedang nonaktif — penawaran bisa langsung ditandai terkirim.' },
    menunggu_approval:    { judul: 'Menunggu keputusan reviewer internal',  keterangan: 'Belum bisa dikirim ke klien. Mengubah data akan menarik pengajuan dan mengembalikan penawaran ke Draft.' },
    terkirim:             { judul: 'Menunggu respons klien',                keterangan: 'Perbarui status sesuai jawaban klien: masuk negosiasi, disetujui, atau ditolak.' },
    negosiasi:            { judul: 'Sedang negosiasi dengan klien',         keterangan: 'Perbarui status setelah ada keputusan akhir dari klien.' },
    ditolak:              { judul: 'Penawaran ditolak klien',               keterangan: 'Tidak ada aksi lanjutan untuk penawaran ini.' },
}

interface EditForm {
    id_klien: string
    judul: string
    tipe_harga: TipeHargaPenawaran
    nilai_str: string
    tanggal_penawaran: string
    jumlah_hari: string
    catatan: string
}

interface ItemForm {
    id_rute: string
    id_jenis_kendaraan: string
    harga_satuan_str: string
    jumlah_hari_str: string
    estimasi_ritase_str: string
    keterangan: string
}

type Option = { value: string; label: string }

const ITEM_KOSONG: ItemForm = {
    id_rute: '', id_jenis_kendaraan: '',
    harga_satuan_str: '', jumlah_hari_str: '', estimasi_ritase_str: '1', keterangan: '',
}

export default function PenawaranDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [data, setData] = useState<Penawaran | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState<EditForm>({
        id_klien: '', judul: '', tipe_harga: 'per_rit', nilai_str: '', tanggal_penawaran: '', jumlah_hari: '', catatan: '',
    })
    const [errors, setErrors] = useState<Partial<Record<keyof EditForm, string>>>({})

    const [items, setItems] = useState<ItemForm[]>([])
    const [itemError, setItemError] = useState('')
    const [ruteOptions, setRuteOptions] = useState<Option[]>([])
    const [jenisOptions, setJenisOptions] = useState<Option[]>([])
    const [klienOptions, setKlienOptions] = useState<Option[]>([])
    const [dialogRuteTerbuka, setDialogRuteTerbuka] = useState(false)

    const [showJadikanProyek, setShowJadikanProyek] = useState(false)
    const [jpForm, setJpForm] = useState({ nama_proyek: '', tanggal_mulai: '', tanggal_selesai: '' })
    const [jpErrors, setJpErrors] = useState<{ nama_proyek?: string }>({})
    const [jpSaving, setJpSaving] = useState(false)

    useEffect(() => {
        ruteService.list({ limit: 100 })
            .then(res => setRuteOptions((res.data ?? []).map((r: Rute) => ({ value: r.id_rute, label: labelRute(r) }))))
            .catch(() => { })
        jenisKendaraanService.list(1)
            .then(res => setJenisOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => { })
        klienService.list(1, 100)
            .then(res => setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: k.nama_klien }))))
            .catch(() => { })
    }, [])

    const totalItems = items.reduce(
        (sum, it) => sum + Number(it.harga_satuan_str || 0) * Number(it.estimasi_ritase_str || 1), 0)
    const nilaiOtomatis = form.tipe_harga === 'per_rit' && items.length > 0

    const updateItem = (index: number, patch: Partial<ItemForm>) => {
        setItems(prev => {
            const next = [...prev]
            next[index] = { ...next[index], ...patch }
            return next
        })
    }

    const itemBaru = (patch: Partial<ItemForm> = {}): ItemForm => ({ ...ITEM_KOSONG, jumlah_hari_str: form.jumlah_hari, ...patch })

    const setJumlahHari = (nilai: string) => {
        const lama = form.jumlah_hari
        setForm(p => ({ ...p, jumlah_hari: nilai }))
        setItems(prev => prev.map(it => (it.jumlah_hari_str === lama ? { ...it, jumlah_hari_str: nilai } : it)))
    }

    const tambahItemDariDialog = (pilihan: PilihanItemRute) => {
        setItems(prev => [...prev, itemBaru({ id_rute: pilihan.id_rute })])
    }

    const tambahRuteOption = (r: Rute) =>
        setRuteOptions(prev => prev.some(o => o.value === r.id_rute)
            ? prev.map(o => o.value === r.id_rute ? { ...o, label: labelRute(r) } : o)
            : [...prev, { value: r.id_rute, label: labelRute(r) }])

    const setItemRute = (index: number, value: string) => updateItem(index, { id_rute: value })
    const setItemJenis = (index: number, value: string) => updateItem(index, { id_jenis_kendaraan: value })

    const validateItems = () => {
        if (items.length === 0) return true
        const perRit = form.tipe_harga === 'per_rit'
        const hariSalah = items.some(it => it.jumlah_hari_str !== '' && Number(it.jumlah_hari_str) < 1)
        const invalid = items.some(it => !it.id_rute || !it.id_jenis_kendaraan || (perRit && !it.harga_satuan_str))
        setItemError(invalid
            ? (perRit ? 'Setiap item wajib punya rute, jenis kendaraan, dan harga' : 'Setiap item wajib punya rute dan jenis kendaraan')
            : (hariSalah ? 'Hari pada item minimal 1' : ''))
        return !invalid && !hariSalah
    }

    const validate = () => {
        const e: Partial<Record<keyof EditForm, string>> = {}
        if (!form.judul.trim()) e.judul = 'Judul penawaran wajib diisi'
        if (!form.id_klien) e.id_klien = 'Klien wajib dipilih'
        if (form.jumlah_hari && Number(form.jumlah_hari) < 1) e.jumlah_hari = 'Jumlah hari minimal 1'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const [pendingStatus, setPendingStatus] = useState<PenawaranStatus | null>(null)
    const [statusLoading, setStatusLoading] = useState(false)
    const [downloadingPdf, setDownloadingPdf] = useState(false)
    const [sendingEmail, setSendingEmail] = useState(false)
    const [kirimEmailOpen, setKirimEmailOpen] = useState(false)
    const [emailForm, setEmailForm] = useState({ email_tujuan: '', subjek: '', pesan: '' })
    const [emailErrors, setEmailErrors] = useState<Partial<Record<'email_tujuan' | 'subjek' | 'pesan', string>>>({})
    const [lampiranEmail, setLampiranEmail] = useState<File[]>([])

    useEffect(() => {
        penawaranService.get(id)
            .then(d => {
                setData(d)
                setForm({
                    id_klien: d.id_klien ?? '',
                    judul: d.judul,
                    tipe_harga: d.tipe_harga ?? 'per_rit',
                    nilai_str: d.nilai_penawaran != null ? String(d.nilai_penawaran) : '',
                    tanggal_penawaran: d.tanggal_penawaran ?? '',
                    jumlah_hari: d.jumlah_hari != null ? String(d.jumlah_hari) : '',
                    catatan: d.catatan ?? '',
                })
                setItems((d.items ?? []).map(it => ({
                    id_rute: it.id_rute,
                    id_jenis_kendaraan: it.id_jenis_kendaraan,
                    harga_satuan_str: String(Math.round(it.harga_satuan)),
                    jumlah_hari_str: it.jumlah_hari != null ? String(it.jumlah_hari) : '',
                    estimasi_ritase_str: String(it.estimasi_ritase),
                    keterangan: it.keterangan ?? '',
                })))
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        if (!validate() || !validateItems()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setSaving(true)
        try {
            const updated = await penawaranService.update(id, {
                id_klien: form.id_klien,
                judul: form.judul,
                tipe_harga: form.tipe_harga,
                nilai_penawaran: nilaiOtomatis
                    ? undefined
                    : (form.nilai_str ? Number(form.nilai_str) : null),
                tanggal_penawaran: form.tanggal_penawaran || null,
                jumlah_hari: form.jumlah_hari ? Number(form.jumlah_hari) : null,
                catatan: form.catatan || null,
                items: items.map(it => ({
                    id_rute: it.id_rute,
                    id_jenis_kendaraan: it.id_jenis_kendaraan,
                    harga_satuan: form.tipe_harga !== 'per_rit' ? undefined : Number(it.harga_satuan_str || 0),
                    jumlah_hari: it.jumlah_hari_str ? Number(it.jumlah_hari_str) : null,
                    estimasi_ritase: Number(it.estimasi_ritase_str || 1),
                    keterangan: it.keterangan.trim() || null,
                })),
            })
            setData(updated)
            setForm(p => ({ ...p, tipe_harga: updated.tipe_harga ?? p.tipe_harga }))
            setItems((updated.items ?? []).map(it => ({
                id_rute: it.id_rute,
                id_jenis_kendaraan: it.id_jenis_kendaraan,
                harga_satuan_str: String(Math.round(it.harga_satuan)),
                jumlah_hari_str: it.jumlah_hari != null ? String(it.jumlah_hari) : '',
                estimasi_ritase_str: String(it.estimasi_ritase),
                keterangan: it.keterangan ?? '',
            })))
            setEditing(false)
            setErrors({})
            toast.push(<Notification type="success" title="Penawaran berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleStatusChange = async () => {
        if (!pendingStatus) return
        setStatusLoading(true)
        try {
            const updated = await penawaranService.updateStatus(id, pendingStatus)
            setData(updated)
            setPendingStatus(null)
            toast.push(<Notification type="success" title={`Status diubah ke ${STATUS_LABEL[pendingStatus]}`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setStatusLoading(false)
        }
    }

    const [ajukanOpen, setAjukanOpen] = useState(false)
    const [tandaiTerkirimOpen, setTandaiTerkirimOpen] = useState(false)
    const [menandaiTerkirim, setMenandaiTerkirim] = useState(false)

    const handleDownloadPdf = async () => {
        if (!data) return
        setDownloadingPdf(true)
        try {
            const res = await axios.get(API_ENDPOINTS.PENAWARAN_PDF(id), { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = `penawaran-${data.nomor_penawaran}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingPdf(false)
        }
    }

    const openKirimEmail = () => {
        if (!data) return
        setEmailForm({
            email_tujuan: data.email_klien ?? '',
            subjek: `Penawaran ${data.nomor_penawaran} - ${data.judul}`,
            pesan: `Yth. ${data.nama_klien || 'Bapak/Ibu'},\n\nBersama email ini kami sampaikan penawaran ${data.nomor_penawaran} — ${data.judul}. Detail lengkap dapat dilihat pada berkas PDF terlampir.\n\nJika ada pertanyaan lebih lanjut, silakan hubungi kami kembali.\n\nHormat kami,`,
        })
        setEmailErrors({})
        setLampiranEmail([])
        setKirimEmailOpen(true)
    }

    const handleKirimEmail = async () => {
        const e: typeof emailErrors = {}
        if (!emailForm.email_tujuan.trim()) e.email_tujuan = 'Alamat email tujuan wajib diisi'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email_tujuan.trim())) e.email_tujuan = 'Format email tidak valid'
        if (!emailForm.subjek.trim()) e.subjek = 'Subjek wajib diisi'
        if (!emailForm.pesan.trim()) e.pesan = 'Pesan wajib diisi'
        setEmailErrors(e)
        if (Object.keys(e).length > 0) return

        setSendingEmail(true)
        try {
            const updated = await penawaranService.kirimEmail(id, {
                email_tujuan: emailForm.email_tujuan.trim(),
                subjek: emailForm.subjek.trim(),
                pesan: emailForm.pesan,
                lampiran: lampiranEmail,
            })
            setData(updated)
            toast.push(<Notification type="success" title={`Penawaran berhasil dikirim ke ${updated.email_terkirim_ke}`} />)
            setKirimEmailOpen(false)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSendingEmail(false)
        }
    }

    const openJadikanProyek = () => {
        if (!data) return
        setJpForm({ nama_proyek: data.judul, tanggal_mulai: '', tanggal_selesai: '' })
        setJpErrors({})
        setShowJadikanProyek(true)
    }

    const handleJadikanProyek = async () => {
        if (!data) return
        if (!jpForm.nama_proyek.trim()) {
            setJpErrors({ nama_proyek: 'Nama proyek wajib diisi' })
            return
        }
        setJpSaving(true)
        try {
            const proyek = await projectService.create({
                id_penawaran: data.id_penawaran,
                nama_proyek: jpForm.nama_proyek.trim(),
                tanggal_mulai: jpForm.tanggal_mulai || undefined,
                tanggal_selesai: jpForm.tanggal_selesai || undefined,
            })
            toast.push(<Notification type="success" title="Proyek berhasil dibuat" />)
            setShowJadikanProyek(false)
            router.push(ROUTES.PROYEK_DETAIL(proyek.id_proyek))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setJpSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Penawaran tidak ditemukan.</div>

    const initial = data.nomor_penawaran.charAt(0).toUpperCase()
    const nextStatuses = NEXT_STATUS[data.status] ?? []
    const ditolakInternal = data.status === 'draft' && !!data.alasan_ditolak_internal
    const tanpaApproval = data.approval_aktif === false
    const langkahAlur = data.status === 'draft'
        ? LANGKAH_PENAWARAN[tanpaApproval ? 'draft_tanpa_approval' : ditolakInternal ? 'draft_ditolak' : 'draft']
        : data.status === 'disetujui'
            ? { judul: 'Penawaran disetujui klien', keterangan: data.id_proyek ? 'Penawaran ini sudah terhubung ke proyek.' : 'Langkah selanjutnya: jadikan proyek berdasarkan penawaran ini, lalu tambahkan penugasan di halaman proyek.' }
            : LANGKAH_PENAWARAN[data.status]
    const kelasIkonAlur = ditolakInternal
        ? 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-300'
        : (STATUS_CLASS[data.status] ?? 'bg-gray-100 text-gray-600')
    const nilaiTetap = tipeHargaNilaiTetap(data.tipe_harga)

    const statusBelumBisaKirimEmail = data.status === 'draft' || data.status === 'menunggu_approval'
    const tooltipKirimEmail = statusBelumBisaKirimEmail
        ? 'Penawaran berstatus draft/menunggu approval belum bisa dikirim ke klien'
        : 'Kirim Email ke Klien'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.PENAWARAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">{data.nomor_penawaran}</h4>
                    <p className="text-gray-500 text-sm mt-0.5">{data.judul}</p>
                </div>
            </div>

            <PanelAlurStatus
                judul="Alur Penawaran"
                tahap={TAHAP_PENAWARAN}
                status={data.status}
                statusLabel={ditolakInternal ? 'Draft — Ditolak' : (STATUS_LABEL[data.status] ?? data.status)}
                kelasIkon={kelasIkonAlur}
                tahapAktif={data.status === 'negosiasi' ? 2 : undefined}
                tahapGagal={ditolakInternal ? 1 : undefined}
                selesai={data.status === 'disetujui'}
                gagal={data.status === 'ditolak' ? 'Penawaran ini ditolak oleh klien dan tidak bisa diproses lebih lanjut.' : undefined}
                catatan={[
                    ...(ditolakInternal ? [{ warna: 'merah' as const, judul: 'Approval ditolak — perlu revisi', isi: `“${data.alasan_ditolak_internal}”` }] : []),
                    ...(data.proyek_status === 'batal' ? [{
                        warna: 'merah' as const,
                        judul: `Proyek dari penawaran ini sudah dibatalkan${data.kode_proyek ? ` (${data.kode_proyek})` : ''}`,
                        isi: 'Penawaran tetap tersimpan sebagai riwayat kesepakatan, tapi proyeknya tidak lagi berjalan.',
                    }] : []),
                ]}
                langkah={data.status !== 'ditolak' ? langkahAlur : undefined}
                aksi={data.status !== 'ditolak' && (
                    <>
                        {nextStatuses.includes('ditolak') && (
                            <Button size="sm" variant="plain" icon={<HiOutlineBan />} className={KELAS_TOMBOL_BATAL} onClick={() => setPendingStatus('ditolak')}>
                                Ditolak Klien
                            </Button>
                        )}
                        {nextStatuses.includes('negosiasi') && (
                            <Button size="sm" variant="default" icon={<HiOutlineChat />} onClick={() => setPendingStatus('negosiasi')}>
                                Masuk Negosiasi
                            </Button>
                        )}
                        {nextStatuses.includes('disetujui') && (
                            <Button size="sm" variant="solid" icon={<HiOutlineCheckCircle />} onClick={() => setPendingStatus('disetujui')}>
                                Disetujui Klien
                            </Button>
                        )}
                        {data.status === 'draft' && (tanpaApproval ? (
                            <Button size="sm" variant="solid" icon={<HiOutlinePaperAirplane />} onClick={() => setTandaiTerkirimOpen(true)}>
                                Tandai Terkirim
                            </Button>
                        ) : (
                            <Button size="sm" variant="solid" icon={<HiOutlinePaperAirplane />} onClick={() => setAjukanOpen(true)}>
                                {ditolakInternal ? 'Ajukan Ulang' : 'Ajukan Approval'}
                            </Button>
                        ))}
                        {data.status === 'disetujui' && (data.id_proyek ? (
                            <Button size="sm" variant="solid" icon={<HiOutlineExternalLink />} onClick={() => router.push(ROUTES.PROYEK_DETAIL(data.id_proyek!))}>
                                Lihat Proyek
                            </Button>
                        ) : (
                            <Button size="sm" variant="solid" icon={<HiOutlineBriefcase />} onClick={openJadikanProyek}>
                                Jadikan Proyek
                            </Button>
                        ))}
                    </>
                )}
            />

            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">
                                        {data.nomor_penawaran}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-0.5">{data.judul}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Tooltip title="Cetak PDF">
                                    <span
                                        className={`cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30 transition-colors ${downloadingPdf ? 'opacity-50 pointer-events-none' : ''}`}
                                        onClick={handleDownloadPdf}
                                    >
                                        <PiFilePdfDuotone className="text-lg" />
                                    </span>
                                </Tooltip>
                                <Tooltip title={tooltipKirimEmail}>
                                    <Button size="sm" variant="default" icon={<HiOutlineMail />}
                                        disabled={statusBelumBisaKirimEmail}
                                        onClick={openKirimEmail} />
                                </Tooltip>
                                {(data.status === 'draft' || data.status === 'negosiasi') && (
                                    <Tooltip title="Edit">
                                        <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />}
                                            onClick={() => setEditing(true)} />
                                    </Tooltip>
                                )}
                            </div>
                        </div>

                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {(
                                [
                                    { label: 'Nomor Penawaran', value: data.nomor_penawaran },
                                    { label: 'Judul', value: data.judul },
                                    { label: 'Tipe Harga', value: labelTipeHarga(data.tipe_harga) },
                                    {
                                        label: nilaiTetap ? `Nilai ${labelTipeHarga(data.tipe_harga)}` : 'Nilai Penawaran',
                                        value: data.nilai_penawaran != null
                                            ? formatRupiah(data.nilai_penawaran)
                                            : <span className="text-gray-400">-</span>,
                                    },
                                    {
                                        label: 'Tanggal Penawaran',
                                        value: data.tanggal_penawaran ?? <span className="text-gray-400">-</span>,
                                    },
                                    {
                                        label: 'Jumlah Hari',
                                        value: data.jumlah_hari != null ? `${data.jumlah_hari} hari` : <span className="text-gray-400">-</span>,
                                    },
                                    ...(data.email_terkirim_pada ? [{
                                        label: 'Status Email',
                                        value: data.email_gagal_pada ? (
                                            <div>
                                                <Tag className="bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300 border-0 mb-1">Gagal terkirim</Tag>
                                                <p className="text-sm text-gray-800 dark:text-gray-200">
                                                    Dikirim {dayjs(data.email_terkirim_pada).format('DD MMM YYYY HH:mm')} ke {data.email_terkirim_ke}, ditolak {dayjs(data.email_gagal_pada).format('DD MMM YYYY HH:mm')}
                                                </p>
                                                {data.email_gagal_alasan && (
                                                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 break-words">{data.email_gagal_alasan}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 border-0 mb-1">Diserahkan ke server mail</Tag>
                                                <p className="text-sm text-gray-800 dark:text-gray-200">
                                                    {dayjs(data.email_terkirim_pada).format('DD MMM YYYY HH:mm')} ke {data.email_terkirim_ke}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">Belum ada laporan gagal — status diperbarui otomatis bila ada bounce.</p>
                                            </div>
                                        ),
                                        lebar: true,
                                    }] : []),
                                    {
                                        label: 'Catatan',
                                        value: data.catatan ? <RichTextView konten={data.catatan} /> : <span className="text-gray-400">-</span>,
                                        lebar: true,
                                    },
                                ] as { label: string; value: React.ReactNode; lebar?: boolean }[]
                            ).map(({ label, value, lebar }) => (
                                <div key={label} className={lebar ? 'sm:col-span-2' : undefined}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                                        {label}
                                    </p>
                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                            <p className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Item Rute</p>
                            {data.items && data.items.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                                            <tr className="text-left text-gray-600 dark:text-gray-300">
                                                <th className="px-3 py-2 font-semibold min-w-[200px]">Rute</th>
                                                <th className="px-3 py-2 font-semibold min-w-[150px]">Jenis Kendaraan</th>
                                                {!nilaiTetap && <th className="px-3 py-2 font-semibold min-w-[150px]">Harga Satuan</th>}
                                                <th className="px-3 py-2 font-semibold w-24">Hari</th>
                                                <th className="px-3 py-2 font-semibold w-24">Trip</th>
                                                {!nilaiTetap && <th className="px-3 py-2 font-semibold text-right min-w-[120px]">Subtotal</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.items.map(it => (
                                                <tr key={it.id_penawaran_item} className="border-b border-gray-100 dark:border-gray-700">
                                                    <td className="px-3 py-2">{it.nama_rute ?? '-'}</td>
                                                    <td className="px-3 py-2">{it.nama_jenis ?? '-'}</td>
                                                    {!nilaiTetap && <td className="px-3 py-2">{formatRupiah(it.harga_satuan)}</td>}
                                                    <td className="px-3 py-2">{it.jumlah_hari ?? '-'}</td>
                                                    <td className="px-3 py-2">{it.estimasi_ritase}</td>
                                                    {!nilaiTetap && <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{formatRupiah(it.subtotal)}</td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">Belum ada item rute pada penawaran ini.</p>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold text-xl flex-shrink-0 select-none">
                                {initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">
                                    Edit Penawaran
                                </p>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Hanya penawaran Draft atau Negosiasi yang dapat diubah
                                </p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />

                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                <FormItem label="Judul Penawaran" asterisk invalid={!!errors.judul} errorMessage={errors.judul} className="sm:col-span-2">
                                    <Input
                                        value={form.judul}
                                        invalid={!!errors.judul}
                                        onChange={e => setForm(p => ({ ...p, judul: e.target.value }))}
                                    />
                                </FormItem>
                                <FormItem label="Tipe Harga" asterisk>
                                    <Select<{ value: TipeHargaPenawaran; label: string }> isSearchable={false}
                                        options={TIPE_HARGA_OPTIONS}
                                        value={TIPE_HARGA_OPTIONS.find(o => o.value === form.tipe_harga) ?? null}
                                        onChange={opt => setForm(p => ({ ...p, tipe_harga: opt?.value ?? 'per_rit' }))} />
                                </FormItem>
                                <FormItem label="Klien" asterisk invalid={!!errors.id_klien} errorMessage={errors.id_klien}>
                                    <Select<Option> isSearchable placeholder="Pilih klien"
                                        options={klienOptions}
                                        value={klienOptions.find(o => o.value === form.id_klien) ?? null}
                                        onChange={opt => setForm(p => ({ ...p, id_klien: opt?.value ?? '' }))} />
                                </FormItem>
                                <FormItem label={form.tipe_harga === 'per_rit' ? 'Nilai Penawaran' : `Nilai ${labelTipeHarga(form.tipe_harga)}`}
                                    extra={nilaiOtomatis ? <span className="text-xs text-gray-400 ml-2">(otomatis dari item rate card)</span> : undefined}>
                                    <Input
                                        prefix="Rp"
                                        placeholder="0"
                                        disabled={nilaiOtomatis}
                                        value={nilaiOtomatis
                                            ? formatNum(totalItems)
                                            : (form.nilai_str ? formatNum(Number(form.nilai_str)) : '')}
                                        onChange={e =>
                                            setForm(p => ({
                                                ...p,
                                                nilai_str: e.target.value.replace(/\D/g, ''),
                                            }))
                                        }
                                    />
                                </FormItem>
                                <FormItem label="Tanggal Penawaran">
                                    <DatePicker inputFormat="DD/MM/YYYY"
                                        value={form.tanggal_penawaran ? dayjs(form.tanggal_penawaran).toDate() : null}
                                        onChange={date => setForm(p => ({ ...p, tanggal_penawaran: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                                    />
                                </FormItem>
                                <FormItem label="Jumlah Hari" invalid={!!errors.jumlah_hari} errorMessage={errors.jumlah_hari}>
                                    <Input type="number" min="1" placeholder="Contoh: 26" suffix="hari"
                                        value={form.jumlah_hari}
                                        invalid={!!errors.jumlah_hari}
                                        onChange={e => setJumlahHari(e.target.value)} />
                                </FormItem>
                                <FormItem label="Catatan" className="sm:col-span-2">
                                    <RichTextEditor
                                        content={kontenKeHtml(form.catatan)}
                                        onChange={({ html }) => setForm(p => ({ ...p, catatan: html === '<p></p>' ? '' : html }))}
                                    />
                                </FormItem>
                            </div>

                            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">Item Rute</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {form.tipe_harga !== 'per_rit'
                                                ? `Tambahkan rute cakupan proyek — nilainya diisi manual di field Nilai ${labelTipeHarga(form.tipe_harga)} di atas`
                                                : 'Isi harga satuan dan trip untuk tiap rute secara manual'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" size="sm" variant="default" icon={<HiOutlineViewList />}
                                            onClick={() => setDialogRuteTerbuka(true)}>
                                            Daftar Rute
                                        </Button>
                                        <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                            onClick={() => setItems(prev => [...prev, itemBaru()])}>
                                            Tambah Item
                                        </Button>
                                    </div>
                                </div>
                                {itemError && <p className="text-red-500 text-sm mb-2">{itemError}</p>}
                                {items.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                                <tr className="text-left text-gray-600 dark:text-gray-300">
                                                    <th className="px-3 py-2 font-semibold min-w-[200px]">Rute</th>
                                                    <th className="px-3 py-2 font-semibold min-w-[150px]">Jenis Kendaraan</th>
                                                    {form.tipe_harga === 'per_rit' && (
                                                        <th className="px-3 py-2 font-semibold min-w-[150px]">Harga Satuan</th>
                                                    )}
                                                    <th className="px-3 py-2 font-semibold w-24">Hari</th>
                                                    <th className="px-3 py-2 font-semibold w-24">Trip</th>
                                                    {form.tipe_harga === 'per_rit' && (
                                                        <th className="px-3 py-2 font-semibold text-right min-w-[120px]">Subtotal</th>
                                                    )}
                                                    <th className="px-3 py-2 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((it, i) => (
                                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700 align-top">
                                                        <td className="px-3 py-2">
                                                            <Select<Option> isSearchable placeholder="Pilih rute..."
                                                                options={ruteOptions}
                                                                value={ruteOptions.find(o => o.value === it.id_rute) ?? null}
                                                                menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                                onChange={opt => setItemRute(i, opt?.value ?? '')} />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Select<Option> isSearchable placeholder="Pilih jenis..."
                                                                options={jenisOptions}
                                                                value={jenisOptions.find(o => o.value === it.id_jenis_kendaraan) ?? null}
                                                                menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                                onChange={opt => setItemJenis(i, opt?.value ?? '')} />
                                                        </td>
                                                        {form.tipe_harga === 'per_rit' && (
                                                            <td className="px-3 py-2">
                                                                <Input prefix="Rp" placeholder="0"
                                                                    value={it.harga_satuan_str ? formatNum(Number(it.harga_satuan_str)) : ''}
                                                                    onChange={e => updateItem(i, {
                                                                        harga_satuan_str: e.target.value.replace(/\D/g, ''),
                                                                    })} />
                                                            </td>
                                                        )}
                                                        <td className="px-3 py-2">
                                                            <Input type="number" min="1"
                                                                value={it.jumlah_hari_str}
                                                                onChange={e => updateItem(i, { jumlah_hari_str: e.target.value })} />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input type="number" min="1"
                                                                value={it.estimasi_ritase_str}
                                                                onChange={e => updateItem(i, { estimasi_ritase_str: e.target.value })} />
                                                        </td>
                                                        {form.tipe_harga === 'per_rit' && (
                                                            <td className="px-3 py-2 text-right font-semibold whitespace-nowrap pt-4">
                                                                {formatRupiah(Number(it.harga_satuan_str || 0) * Number(it.estimasi_ritase_str || 1))}
                                                            </td>
                                                        )}
                                                        <td className="px-3 py-2 pt-3">
                                                            <span
                                                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 hover:bg-red-200 cursor-pointer transition-colors"
                                                                onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                                                            ><HiOutlineTrash /></span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {form.tipe_harga === 'per_rit' && (
                                            <div className="flex justify-end mt-3">
                                                <p className="text-sm">Total Nilai Penawaran:{' '}
                                                    <span className="font-bold text-base">{formatRupiah(totalItems)}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button
                                    type="button"
                                    variant="plain"
                                    onClick={() => { setEditing(false); setErrors({}) }}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" variant="solid" loading={saving}>
                                    Simpan
                                </Button>
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

            <ConfirmDialog
                isOpen={!!pendingStatus}
                type="info"
                title="Ubah Status Penawaran"
                confirmText="Ya, Ubah"
                cancelText="Batal"
                onClose={() => setPendingStatus(null)}
                onCancel={() => setPendingStatus(null)}
                onConfirm={handleStatusChange}
                confirmButtonProps={{ loading: statusLoading }}
            >
                <p>
                    Ubah status penawaran ke{' '}
                    <strong>{pendingStatus ? STATUS_LABEL[pendingStatus] : ''}</strong>?{' '}
                    Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

            <Dialog isOpen={kirimEmailOpen} onRequestClose={() => setKirimEmailOpen(false)} onClose={() => setKirimEmailOpen(false)} width={800}>
                <h5 className="text-base font-semibold mb-1">Kirim Email ke Klien</h5>
                <p className="text-xs text-gray-400 mb-4">
                    PDF penawaran {data.nomor_penawaran} akan dilampirkan otomatis
                </p>
                <div className="flex flex-col gap-4">
                    <FormItem label="Alamat Tujuan" asterisk invalid={!!emailErrors.email_tujuan} errorMessage={emailErrors.email_tujuan}>
                        <Input type="email" placeholder="email@klien.com" value={emailForm.email_tujuan}
                            invalid={!!emailErrors.email_tujuan}
                            onChange={e => setEmailForm(p => ({ ...p, email_tujuan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Subjek" asterisk invalid={!!emailErrors.subjek} errorMessage={emailErrors.subjek}>
                        <Input value={emailForm.subjek} invalid={!!emailErrors.subjek}
                            onChange={e => setEmailForm(p => ({ ...p, subjek: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Pesan" asterisk invalid={!!emailErrors.pesan} errorMessage={emailErrors.pesan}>
                        <RichTextEditor
                            content={kontenKeHtml(emailForm.pesan)}
                            onChange={({ html }) => setEmailForm(p => ({ ...p, pesan: html === '<p></p>' ? '' : html }))}
                        />
                    </FormItem>
                    <FormItem label="Lampiran Tambahan" extra={<span className="text-xs text-gray-400">PDF penawaran selalu ikut terlampir otomatis</span>}>
                        <Upload
                            accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx"
                            multiple
                            showList={false}
                            fileList={lampiranEmail}
                            beforeUpload={(baru) => {
                                const daftar = Array.from(baru ?? [])
                                if (lampiranEmail.length + daftar.length > 10) return 'Maksimal 10 file lampiran'
                                const kebesaran = daftar.find(f => f.size > 5 * 1024 * 1024)
                                if (kebesaran) return `File ${kebesaran.name} melebihi 5MB`
                                return true
                            }}
                            onChange={files => setLampiranEmail(files)}
                        >
                            <Button type="button" variant="default" size="sm" icon={<HiOutlineDocumentText />}>
                                Pilih file (bisa lebih dari satu, maks. 10 file × 5MB)
                            </Button>
                        </Upload>
                        {lampiranEmail.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-3">
                                {lampiranEmail.map((file, idx) => (
                                    <div key={`${file.name}-${idx}`}
                                        className="flex items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5">
                                        <HiOutlineDocumentText className="text-base text-gray-400 shrink-0" />
                                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">
                                            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                                        </p>
                                        <span
                                            className="cursor-pointer inline-flex items-center justify-center w-6 h-6 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
                                            onClick={() => setLampiranEmail(prev => prev.filter((_, i) => i !== idx))}>
                                            <HiOutlineTrash className="text-sm" />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button variant="plain" onClick={() => setKirimEmailOpen(false)}>Batal</Button>
                    <Button variant="solid" loading={sendingEmail} onClick={handleKirimEmail}>Kirim</Button>
                </div>
            </Dialog>

            <Dialog isOpen={showJadikanProyek} onRequestClose={() => setShowJadikanProyek(false)} onClose={() => setShowJadikanProyek(false)} width={800}>
                <h5 className="text-base font-semibold mb-1">Jadikan Proyek</h5>
                <p className="text-xs text-gray-400 mb-4">
                    Proyek baru akan langsung aktif dan terhubung ke penawaran {data.nomor_penawaran}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Nama Proyek" asterisk invalid={!!jpErrors.nama_proyek} errorMessage={jpErrors.nama_proyek} className="sm:col-span-2">
                        <Input
                            value={jpForm.nama_proyek}
                            invalid={!!jpErrors.nama_proyek}
                            onChange={e => setJpForm(p => ({ ...p, nama_proyek: e.target.value }))}
                        />
                    </FormItem>
                    <FormItem label="Tanggal Mulai">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={jpForm.tanggal_mulai ? dayjs(jpForm.tanggal_mulai).toDate() : null}
                            onChange={date => setJpForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                        />
                    </FormItem>
                    <FormItem label="Tanggal Selesai">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={jpForm.tanggal_selesai ? dayjs(jpForm.tanggal_selesai).toDate() : null}
                            onChange={date => setJpForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                        />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button variant="plain" onClick={() => setShowJadikanProyek(false)}>Batal</Button>
                    <Button variant="solid" loading={jpSaving} onClick={handleJadikanProyek}>Simpan</Button>
                </div>
            </Dialog>

            <PilihRuteDialog
                isOpen={dialogRuteTerbuka}
                onClose={() => setDialogRuteTerbuka(false)}
                onPilih={tambahItemDariDialog}
                onRuteBaru={tambahRuteOption}
            />

            <ConfirmDialog
                isOpen={tandaiTerkirimOpen}
                type="info"
                title="Tandai Terkirim"
                confirmText="Ya, Tandai Terkirim"
                cancelText="Batal"
                confirmButtonProps={{ loading: menandaiTerkirim }}
                onClose={() => setTandaiTerkirimOpen(false)}
                onCancel={() => setTandaiTerkirimOpen(false)}
                onConfirm={async () => {
                    setMenandaiTerkirim(true)
                    try {
                        const updated = await penawaranService.ajukanApproval(id)
                        setData(updated)
                        toast.push(<Notification type="success" title="Penawaran ditandai terkirim" />)
                    } catch (err) {
                        toast.push(<Notification type="danger" title={parseApiError(err)} />)
                    } finally {
                        setMenandaiTerkirim(false)
                        setTandaiTerkirimOpen(false)
                    }
                }}
            >
                <p className="text-sm">Approval internal sedang nonaktif, jadi <span className="font-semibold">{data.nomor_penawaran}</span> akan langsung berstatus Terkirim tanpa melalui approver. Lanjutkan?</p>
            </ConfirmDialog>

            <AjukanApprovalDialog
                isOpen={ajukanOpen}
                onClose={() => setAjukanOpen(false)}
                kode="penawaran"
                idReferensi={id}
                nomor={data.nomor_penawaran}
                onAjukan={async () => {
                    const updated = await penawaranService.ajukanApproval(id)
                    setData(updated)
                }}
                onSukses={() => { }}
            />
        </div>
    )
}
