'use client'
import { use, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Card, Button, Dialog, FormItem, Input, DatePicker, Tag, Tooltip, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogApprovalDialog from '@/components/shared/LogApprovalDialog'
import AjukanApprovalDialog from '@/components/shared/AjukanApprovalDialog'
import PanelAlurStatus, { KELAS_TOMBOL_BATAL, KELAS_IKON_LOG_APPROVAL } from '@/components/shared/PanelAlurStatus'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import useAksesMenu from '@/utils/hooks/useAksesMenu'
import { HiPlusCircle, HiOutlinePlus, HiArrowLeft, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineClipboardList, HiOutlineCash, HiOutlineBan, HiOutlinePaperAirplane, HiOutlinePaperClip, HiOutlineCheckCircle, HiOutlineClock } from 'react-icons/hi'
import { PiFilePdfDuotone } from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { fakturService, Faktur, FakturPajak, PembayaranFaktur } from '@/services/faktur.service'

type EditItemRow = { deskripsi: string; qty: string; harga_satuan: string }
type EditPajakRow = { nama: string; persen: string }
type FormBayar = { tanggal: string; nominal: string; potongan: string; keterangan_potongan: string; no_referensi: string; catatan: string }
const MAKS_PAJAK = 10
const MAKS_UKURAN_BUKTI = 5 * 1024 * 1024
const BATAS_POTONGAN_PERSEN = 10
const LABEL_KECIL = 'text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide'

const STATUS_CLASS: Record<string, string> = {
    draft:             'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    menunggu_approval: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    terkirim:          'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    lunas:             'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    batal:             'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', menunggu_approval: 'Menunggu Approval', terkirim: 'Terkirim', lunas: 'Lunas', batal: 'Batal',
}

// Transisi status yang diizinkan (mengikuti pola halaman Penawaran)
const NEXT_STATUS: Record<string, string[]> = {
    draft:             ['batal'],
    menunggu_approval: ['batal'],
    terkirim:          ['lunas', 'batal'],
    lunas:              [],
    batal:              [],
}

const TAHAP_INVOICE = [
    { status: 'draft',             label: 'Draft' },
    { status: 'menunggu_approval', label: 'Approval' },
    { status: 'terkirim',          label: 'Terkirim' },
    { status: 'lunas',             label: 'Lunas' },
]

const LANGKAH_INVOICE: Record<string, { judul: string; keterangan: string }> = {
    draft:                { judul: 'Siap dikirim ke klien?',              keterangan: 'Invoice perlu disetujui reviewer internal dulu sebelum bisa dikirim ke klien.' },
    draft_ditolak:        { judul: 'Perbaiki lalu ajukan ulang',          keterangan: 'Revisi data invoice sesuai catatan reviewer, lalu ajukan approval kembali.' },
    draft_tanpa_approval: { judul: 'Siap dikirim ke klien?',              keterangan: 'Approval internal sedang nonaktif — invoice bisa langsung ditandai terkirim.' },
    menunggu_approval:    { judul: 'Menunggu keputusan reviewer internal', keterangan: 'Belum bisa dikirim ke klien. Mengubah data akan menarik pengajuan dan mengembalikan invoice ke Draft.' },
    terkirim:             { judul: 'Invoice sudah dikirim ke klien',       keterangan: 'Catat setiap pembayaran yang masuk — invoice lunas otomatis saat tagihannya habis.' },
    lunas:                { judul: 'Pembayaran sudah diterima',            keterangan: 'Invoice ini selesai dan tidak memerlukan aksi lanjutan.' },
    batal:                { judul: 'Invoice dibatalkan',                   keterangan: 'Tidak ada aksi lanjutan untuk invoice ini.' },
}

const RIWAYAT_LABEL: Record<string, string> = {
    draft: 'Dibuat', diedit: 'Diedit', menunggu_approval: 'Menunggu Approval', terkirim: 'Terkirim', lunas: 'Lunas', batal: 'Dibatalkan',
    pembayaran: 'Pembayaran Diterima', pembayaran_dihapus: 'Pembayaran Dihapus',
}

const RIWAYAT_TAG: Record<string, string> = {
    pembayaran:         'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
    pembayaran_dihapus: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300',
    draft:              'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    diedit:             'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    menunggu_approval:  'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    terkirim:           'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    lunas:              'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    batal:              'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
}

const TRIP_STATUS_CLASS: Record<string, string> = {
    belum_mulai: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    berjalan:    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    selesai:     'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    dibatalkan:  'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
}

const TRIP_STATUS_LABEL: Record<string, string> = {
    belum_mulai: 'Belum Mulai', berjalan: 'Berjalan', selesai: 'Selesai', dibatalkan: 'Dibatalkan',
}

function formatDurasi(awal?: string | null, akhir?: string | null): string | null {
    if (!awal || !akhir) return null
    const beda = dayjs(akhir).diff(dayjs(awal), 'minute')
    if (beda < 0) return null
    const jam = Math.floor(beda / 60)
    const menit = beda % 60
    return jam > 0 ? `${jam} jam ${menit} menit` : `${menit} menit`
}

const RIWAYAT_IKON: Record<string, ReactNode> = {
    pembayaran:         <HiOutlineCash />,
    pembayaran_dihapus: <HiOutlineTrash />,
    draft:              <HiOutlinePlus />,
    diedit:             <HiOutlinePencilAlt />,
    menunggu_approval:  <HiOutlineClock />,
    terkirim:           <HiOutlinePaperAirplane />,
    lunas:              <HiOutlineCheckCircle />,
    batal:              <HiOutlineBan />,
}

export default function FakturDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [faktur, setFaktur]     = useState<Faktur | null>(null)
    const [loading, setLoading]   = useState(true)
    const [updating, setUpdating] = useState(false)
    const [pendingStatus, setPendingStatus] = useState<string | null>(null)

    const [downloadingExport, setDownloadingExport] = useState(false)

    const [logOpen, setLogOpen]             = useState(false)
    const [logApprovalOpen, setLogApprovalOpen] = useState(false)

    const [editOpen, setEditOpen]           = useState(false)
    const [editTanggal, setEditTanggal]     = useState('')
    const [editJatuhTempo, setEditJatuhTempo] = useState('')
    const [editItems, setEditItems]         = useState<EditItemRow[]>([])
    const [editPajak, setEditPajak]         = useState<EditPajakRow[]>([])
    const [savingEdit, setSavingEdit]       = useState(false)

    const openEdit = () => {
        if (!faktur) return
        setEditTanggal(faktur.tanggal_faktur ?? '')
        setEditJatuhTempo(faktur.jatuh_tempo ?? '')
        setEditItems((faktur.items ?? []).map(it => ({
            deskripsi: it.deskripsi,
            qty: String(it.qty),
            harga_satuan: String(it.harga_satuan),
        })))
        setEditPajak(
            faktur.pajak && faktur.pajak.length > 0
                ? faktur.pajak.map(p => ({ nama: p.nama, persen: String(p.persen) }))
                : (faktur.persen_pajak ? [{ nama: faktur.nama_pajak ?? '', persen: String(faktur.persen_pajak) }] : [])
        )
        setEditOpen(true)
    }

    const setEditRow = (index: number, patch: Partial<EditItemRow>) =>
        setEditItems(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))

    const tambahEditRow = () => setEditItems(prev => [...prev, { deskripsi: '', qty: '1', harga_satuan: '' }])
    const hapusEditRow  = (index: number) => setEditItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

    const setEditPajakRow = (index: number, patch: Partial<EditPajakRow>) =>
        setEditPajak(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))

    const tambahEditPajak = () => setEditPajak(prev => (prev.length >= MAKS_PAJAK ? prev : [...prev, { nama: '', persen: '' }]))
    const hapusEditPajak  = (index: number) => setEditPajak(prev => prev.filter((_, i) => i !== index))

    const subtotalEdit = editItems.reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.harga_satuan) || 0), 0)
    const nominalPajakEdit = (persen: number) => subtotalEdit * persen / 100
    const totalPajakEdit = editPajak.reduce((sum, r) => sum + nominalPajakEdit(Number(r.persen) || 0), 0)
    const totalEdit = subtotalEdit + totalPajakEdit

    const namaPajakLower = editPajak.map(r => r.nama.trim().toLowerCase())
    const pajakDuplikat = (index: number) => namaPajakLower[index] !== '' && namaPajakLower.filter(n => n === namaPajakLower[index]).length > 1
    const pajakValid = editPajak.every((row, i) => {
        const nama = row.nama.trim()
        const persen = row.persen === '' ? NaN : Number(row.persen)
        return nama !== '' && !Number.isNaN(persen) && persen >= 0 && persen <= 100 && !pajakDuplikat(i)
    })
    const editValid = editItems.length > 0 && editItems.every(r => r.deskripsi.trim() !== '' && (Number(r.qty) || 0) > 0) && pajakValid

    const handleSaveEdit = async () => {
        if (!editValid) return
        setSavingEdit(true)
        try {
            const pajakPayload: FakturPajak[] = editPajak.map(r => ({ nama: r.nama.trim(), persen: Number(r.persen) || 0 }))
            const updated = await fakturService.update(id, {
                tanggal_faktur: editTanggal || null,
                jatuh_tempo: editJatuhTempo || null,
                pajak: pajakPayload,
                items: editItems.map(r => ({
                    deskripsi: r.deskripsi.trim(),
                    qty: Number(r.qty),
                    harga_satuan: Number(r.harga_satuan) || 0,
                })),
            })
            setFaktur(updated)
            setEditOpen(false)
            toast.push(<Notification type="success" title="Invoice berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingEdit(false)
        }
    }

    useEffect(() => {
        fakturService.get(id)
            .then(setFaktur)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleStatus = async (status: string) => {
        setUpdating(true)
        try {
            const updated = await fakturService.updateStatus(id, status)
            setFaktur(updated)
            toast.push(<Notification type="success" title={`Invoice ditandai ${STATUS_LABEL[status] ?? status}`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdating(false)
            setPendingStatus(null)
        }
    }

    const [ajukanOpen, setAjukanOpen] = useState(false)
    const [tandaiTerkirimOpen, setTandaiTerkirimOpen] = useState(false)
    const [menandaiTerkirim, setMenandaiTerkirim] = useState(false)

    const { klik } = usePratinjauBerkas()
    const bolehKelolaPiutang = useAksesMenu()('/piutang')
    const [nominalDisentuh, setNominalDisentuh] = useState(false)
    const [alasanHapusBayar, setAlasanHapusBayar] = useState('')
    const [bayarOpen, setBayarOpen] = useState(false)
    const [bayar, setBayar] = useState<FormBayar>({ tanggal: dayjs().format('YYYY-MM-DD'), nominal: '', potongan: '', keterangan_potongan: '', no_referensi: '', catatan: '' })
    const [buktiBayar, setBuktiBayar] = useState<File | null>(null)
    const [menyimpanBayar, setMenyimpanBayar] = useState(false)
    const [hapusBayar, setHapusBayar] = useState<PembayaranFaktur | null>(null)

    const bukaBayar = () => {
        if (!faktur) return
        const sisa = faktur.sisa ?? faktur.total
        setBayar({ tanggal: dayjs().format('YYYY-MM-DD'), nominal: sisa >= 1 ? String(Math.round(sisa)) : '', potongan: '', keterangan_potongan: '', no_referensi: '', catatan: '' })
        setNominalDisentuh(false)
        setBuktiBayar(null)
        setBayarOpen(true)
    }

    const simpanBayar = async () => {
        if (menyimpanBayar) return
        setMenyimpanBayar(true)
        try {
            const updated = await fakturService.catatPembayaran(id, {
                tanggal_bayar: bayar.tanggal,
                nominal: Number(bayar.nominal) || 0,
                potongan: Number(bayar.potongan) || 0,
                keterangan_potongan: bayar.keterangan_potongan.trim(),
                no_referensi: bayar.no_referensi.trim(),
                catatan: bayar.catatan.trim(),
            }, buktiBayar)
            setFaktur(updated)
            setBayarOpen(false)
            toast.push(<Notification type="success" title={updated.status === 'lunas' ? 'Pembayaran dicatat — invoice lunas' : 'Pembayaran dicatat'} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenyimpanBayar(false)
        }
    }

    const konfirmasiHapusBayar = async () => {
        if (!hapusBayar) return
        setMenyimpanBayar(true)
        try {
            setFaktur(await fakturService.hapusPembayaran(id, hapusBayar.id_pembayaran_faktur, alasanHapusBayar.trim()))
            toast.push(<Notification type="success" title="Pembayaran dihapus" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenyimpanBayar(false)
            setHapusBayar(null)
            setAlasanHapusBayar('')
        }
    }

    const handleExportPdf = async () => {
        setDownloadingExport(true)
        try {
            const res = await axios.get(API_ENDPOINTS.FAKTUR_EXPORT_PDF(id), { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = `invoice-${faktur?.nomor_faktur ?? id}.pdf`
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

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!faktur) return <div className="p-6 text-red-500">Invoice tidak ditemukan.</div>

    const initial = faktur.nomor_faktur?.charAt(0).toUpperCase() ?? 'F'
    const subtotalItems = (faktur.items ?? []).reduce((s, i) => s + i.subtotal, 0)
    const pajakList: FakturPajak[] = faktur.pajak && faktur.pajak.length > 0
        ? faktur.pajak
        : (faktur.persen_pajak ? [{ nama: faktur.nama_pajak || 'Pajak', persen: faktur.persen_pajak }] : [])

    const ditolak = faktur.status === 'draft' && !!faktur.alasan_ditolak_internal
    const tanpaApproval = faktur.approval_aktif === false
    const daftarBayar = faktur.pembayaran ?? []
    const terbayar = faktur.terbayar ?? 0
    const sisaTagihan = faktur.sisa ?? Math.max(faktur.total - terbayar, 0)
    const persenBayar = faktur.total > 0 ? Math.min(100, Math.round(terbayar / faktur.total * 100)) : 0
    const dibayarSebagian = faktur.status === 'terkirim' && terbayar > 0
    const nominalBayar = Number(bayar.nominal) || 0
    const potonganBayar = Number(bayar.potongan) || 0
    const masukBayar = nominalBayar + potonganBayar
    const bayarMelebihi = masukBayar > Math.ceil(sisaTagihan)
    const batasPotongan = Math.max(faktur.total * BATAS_POTONGAN_PERSEN / 100 - (faktur.potongan_bayar ?? 0), 0)
    const potonganMelebihi = potonganBayar > batasPotongan
    const bayarValid = !!bayar.tanggal && masukBayar > 0 && !bayarMelebihi && !potonganMelebihi && (potonganBayar === 0 || bayar.keterangan_potongan.trim() !== '')
    const tanpaSisa = faktur.status === 'terkirim' && sisaTagihan < 1
    const bisaBatal = (NEXT_STATUS[faktur.status] ?? []).includes('batal') && terbayar === 0
    const langkah = LANGKAH_INVOICE[
        faktur.status === 'draft' ? (tanpaApproval ? 'draft_tanpa_approval' : ditolak ? 'draft_ditolak' : 'draft') : faktur.status
    ]
    const kelasIkonAlur = ditolak
        ? 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-300'
        : (STATUS_CLASS[faktur.status] ?? 'bg-gray-100 text-gray-600')
    const riwayatLog = [...(faktur.riwayat_status ?? [])].reverse()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push(ROUTES.FAKTUR)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                    >
                        <HiArrowLeft className="text-xl" />
                    </button>
                    <div>
                        <h3 className="font-bold">{faktur.nomor_faktur}</h3>
                        <p className="text-gray-500 text-sm mt-0.5">Informasi dan pembayaran invoice</p>
                    </div>
                </div>
            </div>

            <PanelAlurStatus
                judul="Alur Invoice"
                alat={(
                    <div className="flex items-center gap-2">
                        <Tooltip title="Log Invoice">
                            <span className={KELAS_IKON_LOG_APPROVAL} onClick={() => setLogOpen(true)}>
                                <HiOutlineClock className="text-lg" />
                            </span>
                        </Tooltip>
                        <Tooltip title="Log Approval">
                            <span className={KELAS_IKON_LOG_APPROVAL} onClick={() => setLogApprovalOpen(true)}>
                                <HiOutlineClipboardList className="text-lg" />
                            </span>
                        </Tooltip>
                    </div>
                )}
                tahap={TAHAP_INVOICE}
                status={faktur.status}
                statusLabel={ditolak ? 'Draft — Ditolak' : dibayarSebagian ? 'Terkirim — Dibayar Sebagian' : (STATUS_LABEL[faktur.status] ?? faktur.status)}
                kelasIkon={kelasIkonAlur}
                tahapGagal={ditolak ? 1 : undefined}
                selesai={faktur.status === 'lunas'}
                gagal={faktur.status === 'batal' ? 'Invoice ini telah dibatalkan dan tidak bisa diproses lebih lanjut.' : undefined}
                catatan={ditolak ? [{ warna: 'merah', judul: 'Approval ditolak — perlu revisi', isi: `“${faktur.alasan_ditolak_internal}”` }] : []}
                langkah={faktur.status !== 'batal' ? langkah : undefined}
                aksi={faktur.status !== 'batal' && (
                    <>
                        {bisaBatal && (
                            <Button size="sm" variant="plain" icon={<HiOutlineBan />} className={KELAS_TOMBOL_BATAL} onClick={() => setPendingStatus('batal')}>
                                Batalkan Invoice
                            </Button>
                        )}
                        {faktur.status === 'draft' && (tanpaApproval ? (
                            <Button size="sm" variant="solid" icon={<HiOutlinePaperAirplane />} onClick={() => setTandaiTerkirimOpen(true)}>
                                Tandai Terkirim
                            </Button>
                        ) : (
                            <Button size="sm" variant="solid" icon={<HiOutlinePaperAirplane />} onClick={() => setAjukanOpen(true)}>
                                {ditolak ? 'Ajukan Ulang' : 'Ajukan Approval'}
                            </Button>
                        ))}
                        {faktur.status === 'terkirim' && bolehKelolaPiutang && !tanpaSisa && (
                            <Button size="sm" variant="solid" icon={<HiOutlineCash />} onClick={bukaBayar}>
                                Catat Pembayaran
                            </Button>
                        )}
                        {tanpaSisa && (
                            <Button size="sm" variant="solid" icon={<HiOutlineCheckCircle />} onClick={() => setPendingStatus('lunas')}>
                                Tandai Lunas
                            </Button>
                        )}
                    </>
                )}
            />

            <ConfirmDialog
                isOpen={!!pendingStatus}
                type={pendingStatus === 'batal' ? 'danger' : 'info'}
                title="Ubah Status Invoice"
                confirmText="Ya, Ubah"
                cancelText="Batal"
                confirmButtonProps={{ loading: updating }}
                onClose={() => setPendingStatus(null)}
                onCancel={() => setPendingStatus(null)}
                onConfirm={() => pendingStatus && handleStatus(pendingStatus)}
            >
                <p className="text-sm">
                    Ubah status invoice ke{' '}
                    <span className="font-semibold">{pendingStatus ? STATUS_LABEL[pendingStatus] : ''}</span>?{' '}
                    Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

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
                        const updated = await fakturService.ajukanApproval(id)
                        setFaktur(updated)
                        toast.push(<Notification type="success" title="Invoice ditandai terkirim" />)
                    } catch (err) {
                        toast.push(<Notification type="danger" title={parseApiError(err)} />)
                    } finally {
                        setMenandaiTerkirim(false)
                        setTandaiTerkirimOpen(false)
                    }
                }}
            >
                <p className="text-sm">Approval internal sedang nonaktif, jadi <span className="font-semibold">{faktur.nomor_faktur}</span> akan langsung berstatus Terkirim tanpa melalui approver. Lanjutkan?</p>
            </ConfirmDialog>

            <Card>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                            {initial}
                        </div>
                        <div>
                            <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{faktur.nomor_faktur}</p>
                            <p className="text-sm text-gray-500 mt-1">{formatRupiah(faktur.total)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Tooltip title="Cetak PDF">
                            <span
                                className={`cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30 transition-colors ${downloadingExport ? 'opacity-50 pointer-events-none' : ''}`}
                                onClick={handleExportPdf}
                            >
                                <PiFilePdfDuotone className="text-lg" />
                            </span>
                        </Tooltip>
                    </div>
                </div>

                <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {([
                        { label: 'Nomor Invoice',   value: faktur.nomor_faktur },
                        { label: 'Total',           value: <span className="font-semibold">{formatRupiah(faktur.total)}</span> },
                        { label: 'Tanggal Invoice', value: faktur.tanggal_faktur ?? <span className="text-gray-400">—</span> },
                        { label: 'Jatuh Tempo',    value: faktur.jatuh_tempo ?? <span className="text-gray-400">—</span> },
                        { label: 'Klien',  value: faktur.nama_klien ?? <span className="text-gray-400">—</span> },
                        {
                            label: 'Proyek',
                            value: faktur.nama_proyek
                                ? (faktur.id_proyek
                                    ? <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                        onClick={() => router.push(ROUTES.PROYEK_DETAIL(faktur.id_proyek!))}>
                                        {faktur.nama_proyek}
                                    </span>
                                    : faktur.nama_proyek)
                                : <span className="text-gray-400">—</span>,
                        },
                        {
                            label: 'Ref. Penawaran',
                            value: faktur.nomor_penawaran
                                ? (
                                    <span>
                                        {faktur.nomor_penawaran}
                                        {faktur.nilai_penawaran != null && (
                                            <span className="text-xs text-gray-400 ml-2">Nilai: {formatRupiah(faktur.nilai_penawaran)}</span>
                                        )}
                                    </span>
                                )
                                : <span className="text-gray-400">— dibuat tanpa referensi penawaran</span>,
                        },
                    ]).map(({ label, value }) => (
                        <div key={label}>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Dibuat</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {faktur.dibuat_oleh_nama ?? '—'}
                            {faktur.dibuat_pada && <span className="text-xs text-gray-400"> · {dayjs(faktur.dibuat_pada).format('DD/MM/YYYY HH:mm')}</span>}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Terakhir Diubah</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {faktur.diubah_pada ? (
                                <>
                                    {faktur.diubah_oleh_nama ?? '—'}
                                    <span className="text-xs text-gray-400"> · {dayjs(faktur.diubah_pada).format('DD/MM/YYYY HH:mm')}</span>
                                </>
                            ) : <span className="text-gray-400">Belum pernah diubah</span>}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Kembali</Button>
                </div>
            </Card>

            {['terkirim', 'lunas'].includes(faktur.status) && (
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <p className={LABEL_KECIL}>Pembayaran Klien{daftarBayar.length > 0 ? ` (${daftarBayar.length})` : ''}</p>
                        {faktur.tanggal_lunas && <p className="text-xs text-gray-400">Lunas {dayjs(faktur.tanggal_lunas).format('DD MMM YYYY')}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <p className={`${LABEL_KECIL} mb-1`}>Total Tagihan</p>
                            <p className="text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-100">{formatRupiah(faktur.total)}</p>
                        </div>
                        <div>
                            <p className={`${LABEL_KECIL} mb-1`}>Sudah Dibayar</p>
                            <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatRupiah(terbayar)}</p>
                            {(faktur.potongan_bayar ?? 0) > 0 && (
                                <p className="text-xs text-gray-400">termasuk potongan {formatRupiah(faktur.potongan_bayar ?? 0)}</p>
                            )}
                        </div>
                        <div>
                            <p className={`${LABEL_KECIL} mb-1`}>Sisa Tagihan</p>
                            <p className={`text-sm font-semibold tabular-nums ${sisaTagihan > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>{formatRupiah(sisaTagihan)}</p>
                        </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${persenBayar}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{persenBayar}% terbayar</p>

                    {daftarBayar.length === 0 ? (
                        <p className="text-sm text-gray-400 mt-4">Belum ada pembayaran yang dicatat.</p>
                    ) : (
                        <div className="flex flex-col mt-4">
                            {daftarBayar.map((p, idx) => {
                                const terakhir = idx === daftarBayar.length - 1
                                return (
                                    <div key={p.id_pembayaran_faktur} className="flex gap-3">
                                        <div className="w-20 shrink-0 text-right text-xs text-gray-400 pt-1">{dayjs(p.tanggal_bayar).format('DD MMM YYYY')}</div>
                                        <div className="flex flex-col items-center">
                                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                <HiOutlineCash />
                                            </span>
                                            {!terakhir && <span className="flex-1 w-px bg-gray-200 dark:bg-gray-600 my-1" />}
                                        </div>
                                        <div className={`flex-1 min-w-0 pt-0.5 ${terakhir ? '' : 'pb-3'}`}>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                <span className="text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-100">{formatRupiah(p.nominal)}</span>
                                                {p.potongan > 0 && (
                                                    <span className="text-xs text-amber-600 dark:text-amber-400 [overflow-wrap:anywhere]">
                                                        + potongan {formatRupiah(p.potongan)}{p.keterangan_potongan ? ` (${p.keterangan_potongan})` : ''}
                                                    </span>
                                                )}
                                                {p.no_referensi && <span className="text-xs text-gray-400 font-mono [overflow-wrap:anywhere]">{p.no_referensi}</span>}
                                                <span className="ml-auto flex items-center gap-2">
                                                    {p.dicatat_oleh && <span className="text-xs text-gray-400">oleh {p.dicatat_oleh}</span>}
                                                    {p.url_bukti && (
                                                        <Tooltip title="Lihat bukti">
                                                            <a href={p.url_bukti} onClick={klik(p.url_bukti, 'Bukti pembayaran', `bukti-${faktur.nomor_faktur}`)} target="_blank" rel="noreferrer"
                                                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 transition-colors">
                                                                <HiOutlinePaperClip className="text-sm" />
                                                            </a>
                                                        </Tooltip>
                                                    )}
                                                    {bolehKelolaPiutang && (
                                                        <Tooltip title="Hapus pembayaran">
                                                            <span className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors"
                                                                onClick={() => { setAlasanHapusBayar(''); setHapusBayar(p) }}>
                                                                <HiOutlineTrash className="text-sm" />
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                </span>
                                            </div>
                                            {p.catatan && <p className="text-xs text-gray-400 mt-0.5 [overflow-wrap:anywhere]">{p.catatan}</p>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Card>
            )}

            <ConfirmDialog
                isOpen={!!hapusBayar}
                type="danger"
                title="Hapus Pembayaran"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: menyimpanBayar, disabled: alasanHapusBayar.trim().length < 3 }}
                onClose={() => setHapusBayar(null)}
                onCancel={() => setHapusBayar(null)}
                onConfirm={konfirmasiHapusBayar}
            >
                <p className="text-sm mb-3">
                    Hapus pembayaran {hapusBayar ? formatRupiah(hapusBayar.nominal + hapusBayar.potongan) : ''} tanggal {hapusBayar ? dayjs(hapusBayar.tanggal_bayar).format('DD MMM YYYY') : ''}?
                    {faktur.status === 'lunas' ? ' Invoice akan kembali berstatus Terkirim.' : ''}
                </p>
                <Input textArea rows={2} maxLength={150} placeholder="Alasan penghapusan (wajib), mis. salah input nominal"
                    value={alasanHapusBayar} onChange={e => setAlasanHapusBayar(e.target.value)} />
            </ConfirmDialog>

            <Dialog isOpen={bayarOpen} onRequestClose={() => setBayarOpen(false)} onClose={() => setBayarOpen(false)} width={560}>
                <h5 className="text-base font-semibold mb-1">Catat Pembayaran</h5>
                <p className="text-xs text-gray-500 mb-4">Sisa tagihan {formatRupiah(sisaTagihan)}. Kalau klien membayar bertahap, catat sebesar yang diterima; sisanya tetap tercatat sebagai piutang.</p>
                <form onSubmit={e => { e.preventDefault(); if (bayarValid) simpanBayar() }}>
                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                            <FormItem label="Tanggal Diterima" asterisk>
                                <DatePicker inputFormat="DD/MM/YYYY" maxDate={new Date()}
                                    value={bayar.tanggal ? dayjs(bayar.tanggal).toDate() : null}
                                    onChange={date => setBayar(p => ({ ...p, tanggal: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="Nominal Diterima" asterisk>
                                <Input prefix="Rp" placeholder="0" invalid={bayarMelebihi}
                                    value={bayar.nominal ? formatNum(Number(bayar.nominal)) : ''}
                                    onChange={e => { setNominalDisentuh(true); setBayar(p => ({ ...p, nominal: e.target.value.replace(/\D/g, '') })) }} />
                            </FormItem>
                            <FormItem label="Potongan oleh Klien" extra={<span className="text-xs text-gray-400">Mis. PPh 23 atau biaya transfer — mengurangi sisa tagihan, bukan uang masuk.</span>}>
                                <Input prefix="Rp" placeholder="0" invalid={potonganMelebihi}
                                    value={bayar.potongan ? formatNum(Number(bayar.potongan)) : ''}
                                    onChange={e => {
                                        const potongan = e.target.value.replace(/\D/g, '')
                                        setBayar(p => ({
                                            ...p,
                                            potongan,
                                            nominal: nominalDisentuh ? p.nominal : String(Math.max(Math.round(sisaTagihan) - (Number(potongan) || 0), 0) || ''),
                                        }))
                                    }} />
                            </FormItem>
                            <FormItem label="Keterangan Potongan" asterisk={potonganBayar > 0}>
                                <Input placeholder="Mis. PPh 23 2%" maxLength={150} disabled={potonganBayar === 0}
                                    value={bayar.keterangan_potongan}
                                    onChange={e => setBayar(p => ({ ...p, keterangan_potongan: e.target.value }))} />
                            </FormItem>
                            <FormItem label="No. Referensi">
                                <Input placeholder="No. transfer / giro" maxLength={100}
                                    value={bayar.no_referensi}
                                    onChange={e => setBayar(p => ({ ...p, no_referensi: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Bukti (opsional)">
                                <UploadBerkas file={buktiBayar} label="Pilih file"
                                    onChange={f => {
                                        if (f && f.size > MAKS_UKURAN_BUKTI) {
                                            toast.push(<Notification type="danger" title="Ukuran file maksimal 5 MB" />)
                                            return
                                        }
                                        setBuktiBayar(f)
                                    }} />
                            </FormItem>
                        </div>
                        <FormItem label="Catatan">
                            <Input textArea rows={2} maxLength={500} placeholder="Mis. termin 1 dari 3" value={bayar.catatan}
                                onChange={e => setBayar(p => ({ ...p, catatan: e.target.value }))} />
                        </FormItem>
                        {bayarMelebihi && <p className="text-xs text-red-500 dark:text-red-400 -mt-2 mb-2">Nominal ditambah potongan melebihi sisa tagihan.</p>}
                        {potonganMelebihi && <p className="text-xs text-red-500 dark:text-red-400 -mt-2 mb-2">Potongan melebihi {BATAS_POTONGAN_PERSEN}% nilai invoice (maksimal {formatRupiah(batasPotongan)}) — selisih sebesar itu perlu koreksi invoice.</p>}
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sisa setelah pembayaran ini</span>
                            <span className="font-bold text-lg tabular-nums">{formatRupiah(Math.max(sisaTagihan - masukBayar, 0))}</span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setBayarOpen(false)}>Kembali</Button>
                        <Button type="submit" variant="solid" loading={menyimpanBayar} disabled={!bayarValid}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            {faktur.items && faktur.items.length > 0 && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Item Invoice</p>
                        {['draft', 'menunggu_approval'].includes(faktur.status) && (
                            <Button size="sm" variant="solid" icon={<HiOutlinePencilAlt />} onClick={openEdit}>
                                Edit Invoice
                            </Button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Deskripsi</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Qty</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Harga Satuan</th>
                                    <th className="py-2.5 text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {faktur.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{item.deskripsi}</td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{item.qty}</td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{formatRupiah(item.harga_satuan)}</td>
                                        <td className="py-3 text-right font-semibold text-gray-800 dark:text-gray-200">{formatRupiah(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                {pajakList.length > 0 && (
                                    <>
                                        <tr className="border-t border-gray-200 dark:border-gray-600">
                                            <td colSpan={3} className="pt-3 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Subtotal</td>
                                            <td className="pt-3 text-right text-gray-600 dark:text-gray-400">
                                                {formatRupiah(subtotalItems)}
                                            </td>
                                        </tr>
                                        {pajakList.map((p, i) => (
                                            <tr key={i}>
                                                <td colSpan={3} className="pt-1 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                                    {p.nama || 'Pajak'} ({p.persen}%)
                                                </td>
                                                <td className="pt-1 text-right text-gray-600 dark:text-gray-400">
                                                    {formatRupiah(subtotalItems * p.persen / 100)}
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                                <tr className={pajakList.length > 0 ? '' : 'border-t border-gray-200 dark:border-gray-600'}>
                                    <td colSpan={3} className="pt-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total</td>
                                    <td className="pt-2 text-right font-bold text-gray-900 dark:text-gray-100">{formatRupiah(faktur.total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            )}

            {faktur.trip_terkait && faktur.trip_terkait.length > 0 && (
                <Card>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">
                        Trip Terkait ({faktur.trip_terkait.length})
                    </p>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Rute</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Supir & Armada</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Berangkat</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Selesai</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Durasi</th>
                                    <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {faktur.trip_terkait.map(t => (
                                    <tr key={t.id_trip}>
                                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200">{t.rute ?? '—'}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                            {t.supir_nama ?? '—'}
                                            {t.armada_nopol && <span className="text-gray-400"> · {t.armada_nopol}</span>}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                            {t.waktu_berangkat ? dayjs(t.waktu_berangkat).format('DD/MM/YY HH:mm') : '—'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                            {t.waktu_checkout ? dayjs(t.waktu_checkout).format('DD/MM/YY HH:mm') : '—'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                            {formatDurasi(t.waktu_checkin, t.waktu_checkout) ?? '—'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TRIP_STATUS_CLASS[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {TRIP_STATUS_LABEL[t.status] ?? t.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <Dialog isOpen={editOpen} onRequestClose={() => setEditOpen(false)} onClose={() => setEditOpen(false)} width={800}>
                <h5 className="text-base font-semibold mb-2">Edit Invoice</h5>
                <p className="text-xs text-gray-500 mb-5">
                    Hanya invoice berstatus draft yang bisa diedit — total dihitung ulang otomatis dari item.
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSaveEdit() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Tanggal Invoice">
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={editTanggal ? dayjs(editTanggal).toDate() : null}
                                onChange={date => setEditTanggal(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        </FormItem>
                        <FormItem label="Jatuh Tempo (opsional)">
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={editJatuhTempo ? dayjs(editJatuhTempo).toDate() : null}
                                onChange={date => setEditJatuhTempo(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        </FormItem>
                    </div>
                    <div className="max-h-[50vh] overflow-y-auto pr-1">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold">Item Invoice</p>
                                <Button type="button" size="xs" variant="solid" icon={<HiPlusCircle />} onClick={tambahEditRow}>
                                    Tambah Item
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2">
                                {editItems.map((row, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-12 sm:col-span-6">
                                            <Input placeholder="Deskripsi item..." value={row.deskripsi}
                                                onChange={e => setEditRow(index, { deskripsi: e.target.value })} />
                                        </div>
                                        <div className="col-span-3 sm:col-span-2">
                                            <Input placeholder="Qty" value={row.qty}
                                                onChange={e => setEditRow(index, { qty: e.target.value.replace(/\D/g, '') })} />
                                        </div>
                                        <div className="col-span-6 sm:col-span-3">
                                            <Input prefix="Rp" placeholder="0"
                                                value={row.harga_satuan ? formatNum(Number(row.harga_satuan)) : ''}
                                                onChange={e => setEditRow(index, { harga_satuan: e.target.value.replace(/\D/g, '') })} />
                                        </div>
                                        <div className="col-span-3 sm:col-span-1 flex justify-end">
                                            <button type="button" onClick={() => hapusEditRow(index)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors disabled:opacity-40"
                                                disabled={editItems.length <= 1}>
                                                <HiOutlineTrash />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold">Pajak (opsional)</p>
                                    <button type="button" onClick={tambahEditPajak} disabled={editPajak.length >= MAKS_PAJAK}
                                        className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                                        <HiOutlinePlus /> Tambah Pajak
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {editPajak.map((row, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-12 sm:col-span-7">
                                                <Input placeholder="Nama pajak (mis. PPN)" value={row.nama}
                                                    invalid={row.nama.trim() === '' || pajakDuplikat(index)}
                                                    onChange={e => setEditPajakRow(index, { nama: e.target.value })} />
                                            </div>
                                            <div className="col-span-9 sm:col-span-4">
                                                <Input suffix="%" placeholder="0" value={row.persen}
                                                    invalid={row.persen === '' || Number(row.persen) < 0 || Number(row.persen) > 100}
                                                    onChange={e => setEditPajakRow(index, { persen: e.target.value.replace(/[^\d.]/g, '') })} />
                                            </div>
                                            <div className="col-span-3 sm:col-span-1 flex justify-end">
                                                <button type="button" onClick={() => hapusEditPajak(index)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors">
                                                    <HiOutlineTrash />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {editPajak.some((row, i) => pajakDuplikat(i)) && (
                                    <p className="text-red-500 text-xs mt-1">Nama pajak tidak boleh sama dengan baris lain</p>
                                )}
                            </div>

                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mt-3 flex flex-col gap-1">
                                {editPajak.length > 0 && (
                                    <>
                                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                            <span>Subtotal</span>
                                            <span className="tabular-nums">{formatRupiah(subtotalEdit)}</span>
                                        </div>
                                        {editPajak.map((row, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                                <span>{row.nama.trim() || 'Pajak'} ({Number(row.persen) || 0}%)</span>
                                                <span className="tabular-nums">{formatRupiah(nominalPajakEdit(Number(row.persen) || 0))}</span>
                                            </div>
                                        ))}
                                    </>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</span>
                                    <span className="font-bold text-lg tabular-nums">{formatRupiah(totalEdit)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setEditOpen(false)}>Kembali</Button>
                        <Button type="submit" variant="solid" loading={savingEdit} disabled={!editValid}>Simpan Perubahan</Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={logOpen} width={520} closable={false} onRequestClose={() => setLogOpen(false)} onClose={() => setLogOpen(false)}>
                <div className="flex items-center justify-between gap-3 mb-1">
                    <h5 className="font-bold">Log Invoice</h5>
                    <Tag className={`${kelasIkonAlur} border-0 font-semibold`}>
                        {ditolak ? 'Draft — Ditolak' : dibayarSebagian ? 'Terkirim — Dibayar Sebagian' : (STATUS_LABEL[faktur.status] ?? faktur.status)}
                    </Tag>
                </div>
                <p className="text-xs text-gray-400 font-mono mb-3">{faktur.nomor_faktur} — {formatRupiah(faktur.total)}</p>
                {riwayatLog.length === 0 ? (
                    <p className="text-sm text-gray-400 py-6 text-center">Belum ada riwayat untuk invoice ini.</p>
                ) : (
                    <div className="max-h-[60vh] overflow-y-auto pr-1 mt-2">
                        {riwayatLog.map((r, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-16 shrink-0 text-right text-xs text-gray-400 leading-tight pt-1">
                                    {r.waktu ? (
                                        <>
                                            {dayjs(r.waktu).format('DD MMM YYYY')}
                                            <br />
                                            {dayjs(r.waktu).format('HH:mm')}
                                        </>
                                    ) : '—'}
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${RIWAYAT_TAG[r.status] ?? 'bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-300'}`}>
                                        {RIWAYAT_IKON[r.status] ?? <HiOutlineClock />}
                                    </span>
                                    {i < riwayatLog.length - 1 && <span className="flex-1 w-px bg-gray-200 dark:bg-gray-600 my-1" />}
                                </div>
                                <div className="flex-1 min-w-0 pb-6">
                                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{RIWAYAT_LABEL[r.status] ?? r.status}</p>
                                    {r.oleh && <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{r.oleh}</p>}
                                    {r.keterangan && (
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2">
                                            {r.keterangan}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex justify-center mt-4">
                    <Button variant="default" onClick={() => setLogOpen(false)}>Kembali</Button>
                </div>
            </Dialog>

            <LogApprovalDialog
                isOpen={logApprovalOpen}
                onClose={() => setLogApprovalOpen(false)}
                kode="faktur"
                idReferensi={id}
                emptyMessage="Belum ada pengajuan approval untuk invoice ini — ajukan dari tombol Ajukan Approval."
            />

            <AjukanApprovalDialog
                isOpen={ajukanOpen}
                onClose={() => setAjukanOpen(false)}
                kode="faktur"
                idReferensi={id}
                nomor={faktur.nomor_faktur}
                onAjukan={async () => {
                    const updated = await fakturService.ajukanApproval(id)
                    setFaktur(updated)
                }}
                onSukses={() => { }}
            />
        </div>
    )
}