'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Checkbox, Dialog, FormItem, Input, Spinner, Tag, Tooltip, Upload, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogAktivitasKeuanganDialog, { PENGAJUAN_LABEL, PENGAJUAN_TAG } from '@/components/shared/LogAktivitasKeuanganDialog'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import LampiranPreview from '@/components/shared/LampiranPreview'
import TeksLipat from '@/components/shared/TeksLipat'
import { KELAS_TOMBOL_BATAL } from '@/components/shared/PanelAlurStatus'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineTrash, HiOutlinePaperClip, HiOutlineClipboardList, HiOutlineExternalLink, HiOutlinePlus, HiOutlineDocumentText, HiOutlineInboxIn, HiOutlineBan } from 'react-icons/hi'
import { PiFilePdfDuotone } from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import { permintaanPembelianService, type PermintaanPembelian, type PermintaanBukti, type PermintaanItem, type TahapBukti, type Termin, type TerminPayload, type SyaratPembayaran } from '@/services/permintaanPembelian.service'
import BeliTunaiDialog from './BeliTunaiDialog'
import { barangService, type Barang } from '@/services/barang.service'
import { supplierService } from '@/services/supplier.service'
import { STATUS_LABEL, STATUS_TAG, JENIS_LABEL, TAHAP_LABEL, TIPE_LABEL, TIPE_TAG, bolehDiubah, adaKomponenBiaya, rincianBiaya } from './status'
import { STATUS_LABEL as STATUS_LABEL_PS, STATUS_TAG as STATUS_TAG_PS } from '../pembelian-sparepart/status'

const JENIS_TAG: Record<string, string> = {
    barang:    'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    jasa:      'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
    sparepart: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    aset:      'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
}

const TERMIN_LABEL: Record<string, string> = { menunggu: 'Menunggu', ditransfer: 'Ditransfer' }
const TERMIN_TAG: Record<string, string> = {
    menunggu:   'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    ditransfer: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
}

type Option = { value: string; label: string }
type TerminRow = { nama: string; nominal: string; jatuh_tempo: string }
const namaUnit = (i: PermintaanItem) => [i.merk, i.model, i.tahun].filter(Boolean).join(' ') || i.nama_item
const hargaTerisi = (harga: Record<string, string>) => Object.values(harga).some(h => h !== '')
const buktiGambar = (b: PermintaanBukti) => /\.(jpe?g|png|webp|gif)$/i.test(b.nama_asli) || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(b.url_file)
const rapikanPersen = (nilai: string) => {
    const [bulat, ...pecahan] = nilai.replace(/,/g, '.').replace(/[^0-9.]/g, '').split('.')
    return pecahan.length > 0 ? `${bulat}.${pecahan.join('').slice(0, 2)}` : bulat
}
type FormDibeli = { id_supplier: string; tanggal: string; syarat: SyaratPembayaran; harga: Record<string, string>; barang: Record<string, string>; diskon: string; ppn_persen: string; ongkir: string }
const SYARAT_OPTIONS: { value: SyaratPembayaran; label: string }[] = [
    { value: 'setelah_terima', label: 'Setelah barang diterima' },
    { value: 'di_muka', label: 'Bayar di muka' },
]
type FormUlang = { idTermin: string | null; catatan: string; koreksi: boolean; harga: Record<string, string>; diskon: string; ppn_persen: string; ongkir: string }
const FORM_ULANG_KOSONG: FormUlang = { idTermin: null, catatan: '', koreksi: false, harga: {}, diskon: '', ppn_persen: '', ongkir: '' }
const LABEL = 'text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1'
const VALUE = 'text-sm font-medium text-gray-800 dark:text-gray-200'
const TH = 'py-2 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

export default function DetailPermintaan({ id }: { id: string }) {
    const router = useRouter()
    const { klik } = usePratinjauBerkas()
    const { session } = useCurrentSession()
    const authority = ((session?.user?.authority ?? []) as string[]).map(a => a.toLowerCase())
    const punyaPeran = (...roles: string[]) => roles.some(r => authority.includes(r))
    const pengadaan = punyaPeran('pengadaan', 'superadmin')
    const kelola = punyaPeran('pengadaan', 'superadmin', 'admin')
    const idSaya = (session?.user as { id?: string } | undefined)?.id ?? ''

    const [data, setData] = useState<PermintaanPembelian | null>(null)
    const [loading, setLoading] = useState(false)
    const [gagal, setGagal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [logOpen, setLogOpen] = useState(false)
    const [mengunduhPo, setMengunduhPo] = useState(false)
    const [prosesOpen, setProsesOpen] = useState(false)
    const [hapusOpen, setHapusOpen] = useState(false)
    const [hapusBuktiTarget, setHapusBuktiTarget] = useState<PermintaanBukti | null>(null)
    const [batalOpen, setBatalOpen] = useState(false)
    const [alasanBatal, setAlasanBatal] = useState('')
    const [dibeliOpen, setDibeliOpen] = useState(false)
    const [supplierOptions, setSupplierOptions] = useState<Option[]>([])
    const [barangOptions, setBarangOptions] = useState<Option[]>([])
    const [dibeli, setDibeli] = useState<FormDibeli>({ id_supplier: '', tanggal: dayjs().format('YYYY-MM-DD'), syarat: 'setelah_terima', harga: {}, barang: {}, diskon: '', ppn_persen: '', ongkir: '' })
    const [tunaiOpen, setTunaiOpen] = useState(false)
    const [terminRows, setTerminRows] = useState<TerminRow[]>([])
    const [notaDibeli, setNotaDibeli] = useState<File[]>([])
    const [realisasiOpen, setRealisasiOpen] = useState(false)
    const [modeDibeli, setModeDibeli] = useState<'po' | 'dibeli'>('dibeli')
    const [realisasi, setRealisasi] = useState<{ id_supplier: string; tanggal: string; harga: Record<string, string>; diskon: string; ppn_persen: string; ongkir: string }>({ id_supplier: '', tanggal: dayjs().format('YYYY-MM-DD'), harga: {}, diskon: '', ppn_persen: '', ongkir: '' })
    const [notaRealisasi, setNotaRealisasi] = useState<File[]>([])
    const [logTermin, setLogTermin] = useState<Termin | null>(null)
    const [terimaOpen, setTerimaOpen] = useState(false)
    const [terima, setTerima] = useState<{ tanggal: string; qty: Record<string, string>; keterangan: string }>({ tanggal: dayjs().format('YYYY-MM-DD'), qty: {}, keterangan: '' })
    const [tutupOpen, setTutupOpen] = useState(false)
    const [tutup, setTutup] = useState({ alasan: '', diskon: '', ongkir: '' })
    const [riwayatTerimaPenuh, setRiwayatTerimaPenuh] = useState(false)
    const [ulangOpen, setUlangOpen] = useState(false)
    const [ulang, setUlang] = useState<FormUlang>(FORM_ULANG_KOSONG)
    const [notaUlang, setNotaUlang] = useState<File[]>([])
    const [buatCepatUntuk, setBuatCepatUntuk] = useState<string | null>(null)
    const [buatCepat, setBuatCepat] = useState({ nama: '', satuan: 'pcs' })

    const muat = useCallback(async () => {
        setLoading(true)
        try {
            setData(await permintaanPembelianService.get(id))
            setGagal(false)
        } catch (err) {
            setGagal(true)
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { setData(null); setGagal(false); muat() }, [muat])

    const jalankan = async (aksi: () => Promise<unknown>, sukses: string, tutup?: () => void, muatUlang = true) => {
        if (submitting) return
        setSubmitting(true)
        try {
            await aksi()
            toast.push(<Notification type="success" title={sukses} />)
            tutup?.()
            if (muatUlang) await muat()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const bukaDibeli = async (mode: 'po' | 'dibeli') => {
        if (!data || submitting) return
        const harga: Record<string, string> = {}
        const barang: Record<string, string> = {}
        data.items.forEach(i => { harga[i.id_item] = String(i.harga_aktual ?? i.harga_estimasi); barang[i.id_item] = i.id_barang ?? '' })
        const adaPo = !!data.nomor_po
        setModeDibeli(mode)
        setDibeli({
            id_supplier: data.id_supplier ?? '',
            tanggal: mode === 'po' && data.tanggal_po ? dayjs(data.tanggal_po).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            syarat: data.syarat_pembayaran ?? 'setelah_terima',
            harga, barang,
            diskon: adaPo && data.diskon > 0 ? String(data.diskon) : '',
            ppn_persen: adaPo && data.ppn_persen > 0 ? String(data.ppn_persen) : '',
            ongkir: adaPo && data.ongkir > 0 ? String(data.ongkir) : '',
        })
        setTerminRows(mode === 'dibeli' && data.tipe === 'aset' ? [{ nama: '', nominal: '', jatuh_tempo: '' }] : [])
        setNotaDibeli([])
        try {
            const [sup, brg] = await Promise.all([supplierService.list({ limit: 999 }), data.tipe === 'umum' ? barangService.list({ limit: 100 }) : Promise.resolve(null)])
            setSupplierOptions(sup.data.map(s => ({ value: s.id_supplier, label: s.nama })))
            if (brg) setBarangOptions(brg.data.map((b: Barang) => ({ value: b.id_barang, label: `${b.kode} · ${b.nama}` })))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        }
        setDibeliOpen(true)
    }

    const bukaRealisasi = async () => {
        if (!data || submitting) return
        const harga: Record<string, string> = {}
        data.items.forEach(i => { harga[i.id_item] = String(i.harga_aktual ?? i.harga_estimasi) })
        const dariPo = data.status === 'dipesan'
        setRealisasi({
            id_supplier: data.id_supplier ?? '', tanggal: dayjs().format('YYYY-MM-DD'), harga,
            diskon: dariPo && data.diskon > 0 ? String(data.diskon) : '',
            ppn_persen: dariPo && data.ppn_persen > 0 ? String(data.ppn_persen) : '',
            ongkir: dariPo && data.ongkir > 0 ? String(data.ongkir) : '',
        })
        setNotaRealisasi([])
        if (supplierOptions.length === 0) {
            try {
                const sup = await supplierService.list({ limit: 999 })
                setSupplierOptions(sup.data.map(s => ({ value: s.id_supplier, label: s.nama })))
            } catch (err) {
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
            }
        }
        setRealisasiOpen(true)
    }

    const ubahTermin = (idx: number, patch: Partial<TerminRow>) => setTerminRows(rows => rows.map((r, i) => i === idx ? { ...r, ...patch } : r))

    const submitPesan = () => {
        if (!data || !dibeli.id_supplier) return
        const revisi = !!data.nomor_po
        jalankan(() => permintaanPembelianService.pesan(data.id_permintaan, {
            id_supplier: dibeli.id_supplier, tanggal_po: dibeli.tanggal,
            ...(data.tipe === 'umum' ? { syarat_pembayaran: dibeli.syarat } : {}),
            items: data.items.map(i => ({ id_item: i.id_item, harga_aktual: Number(dibeli.harga[i.id_item]) || 0, id_barang: i.jenis === 'barang' ? (dibeli.barang[i.id_item] || null) : null })),
            diskon: Number(dibeli.diskon) || 0,
            ppn_persen: Number(dibeli.ppn_persen) || 0,
            ongkir: Number(dibeli.ongkir) || 0,
        }), data.tipe === 'umum' && dibeli.syarat === 'di_muka'
            ? (revisi ? 'PO diperbarui — bila supplier atau nilainya berubah, pembayaran di muka diajukan ulang dari awal' : 'PO diterbitkan, pengajuan pembayaran di muka dikirim ke Keuangan')
            : (revisi ? 'PO diperbarui' : 'PO diterbitkan'), () => setDibeliOpen(false))
    }

    const submitDibeli = () => {
        if (!data || !dibeli.id_supplier) return
        const isAset = data.tipe === 'aset'
        const termin: TerminPayload[] | undefined = isAset
            ? terminRows.map(r => ({ nama: r.nama.trim(), nominal: Number(r.nominal) || 0, jatuh_tempo: r.jatuh_tempo || null }))
            : undefined
        const idPermintaan = data.id_permintaan
        const nota = notaDibeli
        jalankan(async () => {
            if (nota.length > 0) {
                const hasil = await permintaanPembelianService.uploadBukti(idPermintaan, nota, 'pembelian')
                setData(hasil)
                setNotaDibeli([])
            }
            return permintaanPembelianService.dibeli(idPermintaan, {
                id_supplier: dibeli.id_supplier, tanggal_pembelian: dibeli.tanggal,
                items: data.items.map(i => ({ id_item: i.id_item, harga_aktual: Number(dibeli.harga[i.id_item]) || 0, id_barang: i.jenis === 'barang' ? (dibeli.barang[i.id_item] || null) : null })),
                diskon: Number(dibeli.diskon) || 0,
                ppn_persen: Number(dibeli.ppn_persen) || 0,
                ongkir: Number(dibeli.ongkir) || 0,
                ...(termin ? { termin } : {}),
            })
        }, isAset ? `Ditandai dibeli, ${termin?.length ?? 0} termin pembayaran dibuat` : 'Ditandai dibeli, pengajuan pembayaran dibuat', () => setDibeliOpen(false))
    }

    const jumlahNotaTersimpan = data?.bukti.filter(b => b.tahap === 'pembelian').length ?? 0
    const adaNota = jumlahNotaTersimpan + notaDibeli.length > 0
    const adaNotaRealisasi = jumlahNotaTersimpan + notaRealisasi.length > 0

    const submitRealisasi = () => {
        if (!data) return
        const idPermintaan = data.id_permintaan
        const nota = notaRealisasi
        jalankan(async () => {
            if (nota.length > 0) {
                const hasil = await permintaanPembelianService.uploadBukti(idPermintaan, nota, 'pembelian')
                setData(hasil)
                setNotaRealisasi([])
            }
            return permintaanPembelianService.realisasiSparepart(idPermintaan, {
                tanggal_pembelian: realisasi.tanggal,
                id_supplier: realisasi.id_supplier || null,
                items: data.items.map(i => ({ id_item: i.id_item, harga_aktual: Number(realisasi.harga[i.id_item]) || 0 })),
                diskon: Number(realisasi.diskon) || 0,
                ppn_persen: Number(realisasi.ppn_persen) || 0,
                ongkir: Number(realisasi.ongkir) || 0,
            })
        }, 'Realisasi tersimpan, PR diterima', () => setRealisasiOpen(false))
    }

    const submitBuatCepat = async () => {
        if (!buatCepatUntuk || !buatCepat.nama.trim()) return
        try {
            const b = await barangService.buatCepat({ nama: buatCepat.nama.trim(), satuan: buatCepat.satuan })
            setBarangOptions(prev => [...prev, { value: b.id_barang, label: `${b.kode} · ${b.nama}` }])
            setDibeli(p => ({ ...p, barang: { ...p.barang, [buatCepatUntuk]: b.id_barang } }))
            setBuatCepatUntuk(null)
            toast.push(<Notification type="success" title="Barang didaftarkan ke Master Barang" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        }
    }

    const bukaTerima = () => {
        if (!data || submitting) return
        const qty: Record<string, string> = {}
        data.items.forEach(i => { qty[i.id_item] = String(Math.max(i.qty - (i.qty_diterima ?? 0), 0)) })
        setTerima({ tanggal: dayjs().format('YYYY-MM-DD'), qty, keterangan: '' })
        setTerimaOpen(true)
    }

    const bukaTutupSisa = () => {
        if (!data || submitting) return
        const pesan = data.items.reduce((s, i) => s + i.qty * (i.harga_aktual ?? 0), 0)
        const diterima = data.items.reduce((s, i) => s + (i.qty_diterima ?? 0) * (i.harga_aktual ?? 0), 0)
        const diskon = pesan > 0 ? Math.round(data.diskon * diterima / pesan) : 0
        const adaDiterima = data.items.some(i => (i.qty_diterima ?? 0) > 0)
        setTutup({ alasan: '', diskon: adaDiterima && diskon > 0 ? String(diskon) : '', ongkir: adaDiterima && data.ongkir > 0 ? String(data.ongkir) : '' })
        setTutupOpen(true)
    }

    const submitTutupSisa = () => {
        if (!data) return
        jalankan(() => permintaanPembelianService.tutupSisa(data.id_permintaan, {
            alasan: tutup.alasan.trim(),
            diskon: Number(tutup.diskon) || 0,
            ongkir: Number(tutup.ongkir) || 0,
            jumlah_diterima: data.items.reduce((s, i) => s + (i.qty_diterima ?? 0), 0),
        }), data.pengajuan_keuangan?.status === 'ditolak'
            ? 'Sisa ditutup — pengajuan pembayarannya berstatus ditolak, ajukan ulang pembayarannya'
            : dibayarMenungguBarang
                ? 'Sisa ditutup, PR selesai — periksa kelebihan bayarnya'
                : 'Sisa ditutup, pembayaran disesuaikan', () => setTutupOpen(false))
    }

    const bukaAjukanUlang = (termin?: Termin) => {
        if (!data || submitting) return
        const harga: Record<string, string> = {}
        data.items.forEach(i => { harga[i.id_item] = String(i.harga_aktual ?? i.harga_estimasi) })
        setUlang({
            idTermin: termin?.id_termin ?? null, catatan: '', koreksi: false, harga,
            diskon: data.diskon > 0 ? String(data.diskon) : '',
            ppn_persen: data.ppn_persen > 0 ? String(data.ppn_persen) : '',
            ongkir: data.ongkir > 0 ? String(data.ongkir) : '',
        })
        setNotaUlang([])
        setUlangOpen(true)
    }

    const submitAjukanUlang = () => {
        if (!data) return
        const idPermintaan = data.id_permintaan
        const nota = notaUlang
        jalankan(async () => {
            if (nota.length > 0) {
                const hasil = await permintaanPembelianService.uploadBukti(idPermintaan, nota, 'pembelian')
                setData(hasil)
                setNotaUlang([])
            }
            const versi = terminUlang ? terminUlang.pengajuan?.versi : data.pengajuan_keuangan?.versi
            return permintaanPembelianService.ajukanUlangPembayaran(idPermintaan, {
                catatan: ulang.catatan.trim(),
                ...(ulang.idTermin ? { id_termin: ulang.idTermin } : {}),
                ...(versi !== undefined ? { versi_pengajuan: versi } : {}),
                ...(ulang.koreksi ? {
                    items: data.items.map(i => ({ id_item: i.id_item, harga_aktual: Number(ulang.harga[i.id_item]) || 0 })),
                    diskon: Number(ulang.diskon) || 0,
                    ppn_persen: Number(ulang.ppn_persen) || 0,
                    ongkir: Number(ulang.ongkir) || 0,
                } : {}),
            })
        }, pengajuanHilang ? 'Pengajuan pembayaran dibuat ulang' : 'Pembayaran diajukan ulang', () => setUlangOpen(false))
    }

    const submitTerima = () => {
        if (!data) return
        jalankan(() => permintaanPembelianService.terima(data.id_permintaan, {
            tanggal_diterima: terima.tanggal, keterangan: terima.keterangan || undefined,
            items: data.items.map(i => ({ id_item: i.id_item, qty_diterima: Number(terima.qty[i.id_item]) || 0, qty_sebelumnya: i.qty_diterima ?? 0 })),
        }), terimaLengkap ? 'Penerimaan dikonfirmasi' : 'Penerimaan sebagian dicatat', () => setTerimaOpen(false))
    }

    const cetakPo = async () => {
        if (!data?.nomor_po || mengunduhPo) return
        const nomorPo = data.nomor_po
        setMengunduhPo(true)
        try {
            const blob = await permintaanPembelianService.cetakPo(data.id_permintaan)
            const href = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = href
            link.download = `${nomorPo}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduhPo(false)
        }
    }

    const handleUpload = (files: File[], tahap: TahapBukti) => {
        if (!data || files.length === 0) return
        jalankan(() => permintaanPembelianService.uploadBukti(data.id_permintaan, files, tahap), 'Lampiran diunggah')
    }

    const pengaju = !!data && data.id_pengaju === idSaya
    const sparepart = data?.tipe === 'sparepart'
    const aset = data?.tipe === 'aset'
    const ps = data?.pembelian_sparepart ?? null
    const bolehEdit = !!data && bolehDiubah(data.status) && (pengaju || kelola)
    const bolehBatal = !!data && (pengadaan ? ['menunggu_approval', 'disetujui', 'diproses', 'dipesan'].includes(data.status) : pengaju && ['menunggu_approval', 'disetujui'].includes(data.status))
    const pelakuMandiri = !!data && pengaju && data.boleh_realisasi_mandiri
    const bolehPesan = !!data && pengadaan && ['diproses', 'dipesan'].includes(data.status)
    const bolehDibeli = !!data && pengadaan && data.status === 'dipesan' && !sparepart && data.syarat_pembayaran !== 'di_muka'
    const bolehTunaiMandiri = !!data && data.tipe === 'umum' && data.batas_beli_tunai !== null && data.batas_beli_tunai !== undefined
        && data.total_estimasi <= data.batas_beli_tunai
    const bolehBeliTunai = !!data && data.tipe === 'umum'
        && ((pengadaan && data.status === 'diproses') || (pengaju && data.status === 'disetujui' && bolehTunaiMandiri))
    const diMuka = data?.syarat_pembayaran === 'di_muka'
    const dibayarMenungguBarang = !!data && !!data.tanggal_pembayaran && ['dibeli', 'diterima_sebagian'].includes(data.status)
    const bolehTerima = !!data && ['dibeli', 'diterima_sebagian'].includes(data.status) && (pengaju || pengadaan) && !sparepart && !aset
    const bolehTutupSisa = !!data && pengadaan && !sparepart && !aset
        && (data.status === 'diterima_sebagian' || (data.status === 'dibeli' && dibayarMenungguBarang))
    const terbayarDiMuka = dibayarMenungguBarang ? (data?.pengajuan_keuangan?.nominal ?? data?.total_aktual ?? 0) : 0
    const tanpaPenerimaan = (data?.items ?? []).every(i => (i.qty_diterima ?? 0) === 0)
    const sisaItem = (i: PermintaanItem) => Math.max(i.qty - (i.qty_diterima ?? 0), 0)
    const totalTerima = (data?.items ?? []).reduce((s, i) => s + (Number(terima.qty[i.id_item]) || 0), 0)
    const terimaMelebihi = (data?.items ?? []).some(i => (Number(terima.qty[i.id_item]) || 0) > sisaItem(i))
    const terimaLengkap = (data?.items ?? []).every(i => (Number(terima.qty[i.id_item]) || 0) === sisaItem(i))
    const nilaiDiterima = (data?.items ?? []).reduce((s, i) => s + (i.qty_diterima ?? 0) * (i.harga_aktual ?? 0), 0)
    const diskonTutup = Number(tutup.diskon) || 0
    const ppnTutup = Math.round((nilaiDiterima - diskonTutup) * (data?.ppn_persen ?? 0) / 100)
    const totalTutup = nilaiDiterima - diskonTutup + ppnTutup + (Number(tutup.ongkir) || 0)
    const tutupMelebihiTerbayar = dibayarMenungguBarang && totalTutup > terbayarDiMuka
    const diskonTutupMelebihi = Math.round(diskonTutup * 100) > Math.round(nilaiDiterima * 100)
    const bolehDaftarUnit = !!data && aset && data.status === 'dibeli'
    const bolehRealisasiSparepart = !!data && sparepart && (
        (data.status === 'dipesan' && pengadaan)
        || (['disetujui', 'diproses'].includes(data.status) && pelakuMandiri)
    )
    const realisasiDariPo = !!data && data.status === 'dipesan'
    const tahapUpload: TahapBukti | null = !data ? null
        : sparepart ? ((data.status === 'dipesan' || (data.boleh_realisasi_mandiri && ['disetujui', 'diproses'].includes(data.status))) ? 'pembelian' : bolehDiubah(data.status) ? 'pengajuan' : null)
        : data.status === 'dipesan' ? 'pembelian'
        : ['dibeli', 'diterima_sebagian'].includes(data.status) ? (aset ? null : 'penerimaan')
        : bolehDiubah(data.status) ? 'pengajuan'
        : null
    const tampilKartuPs = !!data && sparepart && !!ps && ['diproses', 'dipesan', 'diterima', 'selesai'].includes(data.status)
    const daftarTermin = data?.termin ?? []
    const subtotalDibeli = (data?.items ?? []).reduce((s, i) => s + i.qty * (Number(dibeli.harga[i.id_item]) || 0), 0)
    const diskonDibeli = Number(dibeli.diskon) || 0
    const ppnPersenDibeli = Number(dibeli.ppn_persen) || 0
    const ppnDibeli = Math.round((subtotalDibeli - diskonDibeli) * ppnPersenDibeli / 100)
    const totalAktualDibeli = subtotalDibeli - diskonDibeli + ppnDibeli + (Number(dibeli.ongkir) || 0)
    const diskonMelebihi = Math.round(diskonDibeli * 100) > Math.round(subtotalDibeli * 100)
    const modePo = modeDibeli === 'po'
    const totalDibeliNol = hargaTerisi(dibeli.harga) && totalAktualDibeli <= 0
    const hargaDibeliValid = (data?.items ?? []).every(i => dibeli.harga[i.id_item] !== '' && Number(dibeli.harga[i.id_item]) >= 0)
    const ppnMelebihi = ppnPersenDibeli > 100
    const biaya = data && (data.nomor_po || adaKomponenBiaya(data)) ? rincianBiaya(data) : null
    const subtotalRealisasi = (data?.items ?? []).reduce((s, i) => s + i.qty * (Number(realisasi.harga[i.id_item]) || 0), 0)
    const diskonRealisasi = Number(realisasi.diskon) || 0
    const ppnPersenRealisasi = Number(realisasi.ppn_persen) || 0
    const ppnRealisasi = Math.round((subtotalRealisasi - diskonRealisasi) * ppnPersenRealisasi / 100)
    const totalAktualRealisasi = subtotalRealisasi - diskonRealisasi + ppnRealisasi + (Number(realisasi.ongkir) || 0)
    const biayaRealisasiSalah = Math.round(diskonRealisasi * 100) > Math.round(subtotalRealisasi * 100) || ppnPersenRealisasi > 100
    const totalRealisasiNol = hargaTerisi(realisasi.harga) && totalAktualRealisasi <= 0
    const overBatasRealisasi = !realisasiDariPo && data?.batas_mandiri != null && totalAktualRealisasi > data.batas_mandiri
    const hargaRealisasiValid = (data?.items ?? []).every(i => realisasi.harga[i.id_item] !== '' && Number(realisasi.harga[i.id_item]) >= 0)
    const totalTermin = terminRows.reduce((s, r) => s + (Number(r.nominal) || 0), 0)
    const sisaTermin = Math.round((totalAktualDibeli - totalTermin) * 100) / 100
    const terminValid = terminRows.length > 0 && terminRows.every(r => r.nama.trim() !== '' && (Number(r.nominal) || 0) > 0) && sisaTermin === 0
    const bukaArmadaBaru = (idItem: string) => data && router.push(`${ROUTES.ARMADA_BARU}?id_permintaan=${data.id_permintaan}&id_item=${idItem}`)
    const riwayatTerima = data?.penerimaan ?? []
    const riwayatTerimaTersembunyi = !riwayatTerimaPenuh && riwayatTerima.length > 5 ? riwayatTerima.length - 4 : 0
    const riwayatTerimaTampil = riwayatTerima.slice(riwayatTerimaTersembunyi)
    const pengajuanDitolak = !!data && !aset && data.pengajuan_keuangan?.status === 'ditolak'
    const pengajuanHilang = !!data && !aset && !data.pengajuan_keuangan && ['dibeli', 'diterima_sebagian', 'diterima'].includes(data.status) && (data.total_aktual ?? 0) > 0
    const bolehAjukanUlang = !!data && (pengajuanDitolak || pengajuanHilang) && ['dibeli', 'diterima_sebagian', 'diterima'].includes(data.status)
        && (pengadaan || (sparepart && !!data.dibeli_oleh && data.dibeli_oleh === idSaya))
    const bolehAjukanUlangTermin = !!data && aset && pengadaan && ['dibeli', 'diterima'].includes(data.status)
    const terminUlang = ulang.idTermin ? daftarTermin.find(t => t.id_termin === ulang.idTermin) ?? null : null
    const alasanTolakUlang = terminUlang ? terminUlang.pengajuan?.alasan_ditolak : data?.pengajuan_keuangan?.alasan_ditolak
    const qtyBayar = (i: PermintaanItem) => data?.sisa_ditutup_pada ? (i.qty_diterima ?? 0) : i.qty
    const subtotalUlang = (data?.items ?? []).reduce((s, i) => s + qtyBayar(i) * (Number(ulang.harga[i.id_item]) || 0), 0)
    const diskonUlang = Number(ulang.diskon) || 0
    const ppnPersenUlang = Number(ulang.ppn_persen) || 0
    const ppnUlang = Math.round((subtotalUlang - diskonUlang) * ppnPersenUlang / 100)
    const totalUlang = ulang.koreksi ? subtotalUlang - diskonUlang + ppnUlang + (Number(ulang.ongkir) || 0) : (data?.total_aktual ?? 0)
    const biayaUlangSalah = ulang.koreksi && (Math.round(diskonUlang * 100) > Math.round(subtotalUlang * 100) || ppnPersenUlang > 100)
    const hargaUlangValid = !ulang.koreksi || (data?.items ?? []).every(i => ulang.harga[i.id_item] !== '' && Number(ulang.harga[i.id_item]) >= 0)
    const overBatasUlang = ulang.koreksi && !pengadaan && data?.batas_mandiri != null && totalUlang > data.batas_mandiri
    const adaNotaUlang = !!ulang.idTermin || jumlahNotaTersimpan + notaUlang.length > 0

    return (
        <>
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PERMINTAAN_PEMBELIAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-bold truncate" title={data?.judul}>{data?.judul ?? 'Detail Permintaan'}</h3>
                        {data?.prioritas === 'urgent' && <Tag className="shrink-0 text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">Urgent</Tag>}
                    </div>
                    <p className="text-gray-500 text-sm mt-0.5 font-mono">{data?.nomor_permintaan ?? '—'}</p>
                </div>
                {loading && data && <Spinner size={20} />}
            </div>

            {!data ? (
                <Card>
                    {gagal ? (
                        <div className="flex flex-col items-center gap-3 py-8 text-center">
                            <p className="text-gray-500">Permintaan tidak ditemukan atau Anda tidak memiliki akses</p>
                            <Button size="sm" variant="default" onClick={() => router.push(ROUTES.PERMINTAAN_PEMBELIAN)}>Kembali ke daftar</Button>
                        </div>
                    ) : (
                        <div className="py-16 text-center"><Spinner className="inline-block" size={32} /></div>
                    )}
                </Card>
            ) : (
                <>
                    <Card>
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-wrap items-center gap-2">
                                <Tag className={`text-xs font-semibold ${STATUS_TAG[data.status]}`}>{STATUS_LABEL[data.status]}</Tag>
                                {data.tipe !== 'umum' && <Tag className={`text-xs font-semibold ${TIPE_TAG[data.tipe]}`}>{TIPE_LABEL[data.tipe]}</Tag>}
                                <div className="flex-1" />
                                {data.nomor_po && data.status !== 'dibatalkan' && (
                                    <Tooltip title="Cetak PO">
                                        <span
                                            className={`cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30 transition-colors ${mengunduhPo ? 'opacity-50 pointer-events-none' : ''}`}
                                            onClick={cetakPo}
                                        >
                                            <PiFilePdfDuotone className="text-lg" />
                                        </span>
                                    </Tooltip>
                                )}
                                {!aset && <Tooltip title="Log Aktivitas Pembayaran"><Button size="sm" variant="default" icon={<HiOutlineClipboardList />} onClick={() => setLogOpen(true)} /></Tooltip>}
                                {tahapUpload && (pengaju || kelola) && (
                                    <Upload accept=".jpg,.jpeg,.png,.webp,.pdf" showList={false} multiple disabled={submitting} onChange={(semua, sebelumnya) => handleUpload(semua.slice(sebelumnya.length), tahapUpload)}>
                                        <Tooltip title={`Unggah ${TAHAP_LABEL[tahapUpload]}`}><Button type="button" size="sm" variant="default" icon={<HiOutlinePaperClip />} loading={submitting} /></Tooltip>
                                    </Upload>
                                )}
                                {bolehEdit && (
                                    <>
                                        <Tooltip title="Hapus"><Button size="sm" variant="default" icon={<HiOutlineTrash />} customColorClass={() => 'text-red-500 hover:border-red-300 hover:ring-red-300'} onClick={() => setHapusOpen(true)} /></Tooltip>
                                        <Tooltip title="Edit"><Button size="sm" variant="solid" icon={<HiOutlinePencilAlt />} onClick={() => router.push(ROUTES.PERMINTAAN_PEMBELIAN_EDIT(data.id_permintaan))} /></Tooltip>
                                    </>
                                )}
                                {bolehBatal && <Button size="sm" variant="plain" icon={<HiOutlineBan />} className={KELAS_TOMBOL_BATAL} onClick={() => { setAlasanBatal(''); setBatalOpen(true) }}>Batalkan</Button>}
                                {pengadaan && data.status === 'disetujui' && <Button size="sm" variant="solid" onClick={() => setProsesOpen(true)}>Mulai Proses</Button>}
                                {bolehBeliTunai && <Button size="sm" variant="default" onClick={() => setTunaiOpen(true)}>Beli Tunai</Button>}
                                {bolehPesan && (
                                    <Button size="sm" variant={data.status === 'dipesan' ? 'default' : 'solid'} onClick={() => bukaDibeli('po')}>
                                        {data.status === 'dipesan' ? 'Revisi PO' : 'Terbitkan PO'}
                                    </Button>
                                )}
                                {bolehDibeli && <Button size="sm" variant="solid" onClick={() => bukaDibeli('dibeli')}>Tandai Dibeli</Button>}
                                {bolehRealisasiSparepart && <Button size="sm" variant="solid" onClick={bukaRealisasi}>Catat Realisasi</Button>}
                                {bolehTutupSisa && <Button size="sm" variant="default" onClick={bukaTutupSisa}>Tutup Sisa</Button>}
                                {bolehTerima && <Button size="sm" variant="solid" onClick={bukaTerima}>{data.status === 'diterima_sebagian' ? 'Catat Penerimaan Berikutnya' : 'Konfirmasi Penerimaan'}</Button>}
                            </div>

                            {data.tipe === 'umum' && data.status === 'disetujui' && bolehTunaiMandiri && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    Nilainya di bawah batas pembelian tunai ({formatRupiah(data.batas_beli_tunai ?? 0)}) — pemohon boleh membeli sendiri lalu mencatatnya lewat tombol Beli Tunai, atau menunggu diproses tim Pengadaan.
                                </div>
                            )}

                            {sparepart && data.batas_mandiri !== null && ['disetujui', 'diproses'].includes(data.status) && (
                                <div className={`rounded-xl border px-4 py-3 text-sm ${data.boleh_realisasi_mandiri ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                                    {data.boleh_realisasi_mandiri
                                        ? `Nilainya di bawah batas mandiri (${formatRupiah(data.batas_mandiri)}) — pengaju boleh beli sendiri lalu catat realisasi di sini.`
                                        : `Di atas batas mandiri (${formatRupiah(data.batas_mandiri)}) — dibeli lewat PO oleh tim Pengadaan.`}
                                </div>
                            )}

                            {data.status === 'diterima_sebagian' && !dibayarMenungguBarang && (
                                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                                    {diMuka
                                        ? 'Baru diterima sebagian. PO ini bayar di muka — Keuangan bisa mentransfer tanpa menunggu sisanya.'
                                        : 'Baru diterima sebagian. Pembayaran belum bisa ditransfer sampai penerimaan lengkap atau sisanya ditutup.'}
                                </div>
                            )}
                            {data.sisa_ditutup_pada && (
                                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                    Sisa pesanan ditutup pada {dayjs(data.sisa_ditutup_pada).format('DD MMM YYYY')} — {data.kelebihan_bayar !== null && data.kelebihan_bayar !== undefined
                                        ? 'pembayarannya sudah ditransfer di muka, jadi nilainya tidak ikut berubah.'
                                        : data.metode_pembelian === 'tunai'
                                            ? 'nilai pembelian mengikuti jumlah yang benar-benar dibeli.'
                                            : 'pembayaran mengikuti jumlah yang diterima.'}
                                    {data.alasan_tutup_sisa ? ` Alasan: ${data.alasan_tutup_sisa}` : ''}
                                </div>
                            )}

                            {diMuka && data.status === 'dipesan' && !pengajuanDitolak && (
                                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                                    <span className="font-semibold">PO bayar di muka.</span>{' '}
                                    {data.pengajuan_keuangan
                                        ? <>Pengajuan pembayaran <span className="font-mono">{data.pengajuan_keuangan.nomor_pengajuan}</span> sudah dikirim ke Keuangan ({PENGAJUAN_LABEL[data.pengajuan_keuangan.status] ?? data.pengajuan_keuangan.status}). PR otomatis menjadi Dibeli setelah ditransfer.</>
                                        : <>Pengajuan pembayarannya belum ada — simpan ulang lewat Revisi PO untuk mengirimnya ke Keuangan.</>}
                                </div>
                            )}

                            {dibayarMenungguBarang && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                    <span className="font-semibold">Sudah dibayar di muka</span> pada {dayjs(data.tanggal_pembayaran).format('DD MMM YYYY')}, tetapi barang/jasanya belum diterima lengkap. Konfirmasi penerimaan begitu barang datang.
                                </div>
                            )}

                            {(data.kelebihan_bayar ?? 0) > 0 && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                    <span className="font-semibold">Kelebihan bayar {formatRupiah(data.kelebihan_bayar ?? 0)}.</span> Sisa pesanan ditutup setelah dibayar di muka — minta pengembalian dana dari supplier.
                                </div>
                            )}

                            {pengajuanDitolak && (
                                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
                                    <div className="flex-1 min-w-48 text-sm text-red-700 dark:text-red-300">
                                        <p className="font-semibold">
                                            Pembayaran ditolak
                                            {data.pengajuan_keuangan?.nomor_pengajuan ? <span className="font-mono font-normal"> · {data.pengajuan_keuangan.nomor_pengajuan}</span> : null}
                                        </p>
                                        {data.pengajuan_keuangan?.alasan_ditolak && <TeksLipat teks={data.pengajuan_keuangan.alasan_ditolak} className="mt-0.5" />}
                                        <p className="text-xs mt-1 opacity-80">
                                            {data.status === 'dipesan'
                                                ? 'Perbaiki PO lewat tombol Revisi PO — pembayaran di muka otomatis diajukan ulang saat PO disimpan.'
                                                : 'Perbaiki nota atau rincian biayanya, lalu ajukan ulang supaya diproses Keuangan lagi.'}
                                        </p>
                                    </div>
                                    {bolehAjukanUlang && <Button size="sm" variant="solid" onClick={() => bukaAjukanUlang()}>Ajukan Ulang Pembayaran</Button>}
                                </div>
                            )}
                            {pengajuanHilang && (
                                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                                    <p className="flex-1 min-w-48 text-sm text-amber-700 dark:text-amber-300">
                                        PR ini sudah dibeli tetapi tidak punya pengajuan pembayaran, jadi belum bisa dibayar Keuangan.
                                    </p>
                                    {bolehAjukanUlang && <Button size="sm" variant="solid" onClick={() => bukaAjukanUlang()}>Buat Pengajuan Pembayaran</Button>}
                                </div>
                            )}

                            {tampilKartuPs && ps && (
                                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-500/30 dark:bg-violet-500/10">
                                    <div className="flex-1 min-w-48">
                                        <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-violet-700 dark:text-violet-300">
                                            <span>Pembelian Sparepart <span className="font-mono">{ps.nomor_pengajuan}</span> ·</span>
                                            <Tag className={`text-[10px] font-semibold ${STATUS_TAG_PS[ps.status] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL_PS[ps.status] ?? ps.status}</Tag>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="default" icon={<HiOutlineExternalLink />} onClick={() => router.push(ROUTES.PEMBELIAN_SPAREPART_DETAIL(ps.id_pembelian))}>Buka</Button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                                <div><p className={LABEL}>Pemohon</p><p className={VALUE}>{data.username_pengaju ?? '—'}</p></div>
                                <div><p className={LABEL}>Departemen</p><p className={VALUE}>{data.nama_departemen ?? '—'}</p></div>
                                <div><p className={LABEL}>Kategori</p><p className={VALUE}>{data.nama_kategori ?? '—'}</p></div>
                                <div><p className={LABEL}>Prioritas</p><p className={`${VALUE} ${data.prioritas === 'urgent' ? 'text-red-600 dark:text-red-400' : ''}`}>{data.prioritas === 'urgent' ? 'Urgent' : 'Normal'}</p></div>
                                <div><p className={LABEL}>Tanggal Permintaan</p><p className={VALUE}>{dayjs(data.tanggal_permintaan).format('DD MMM YYYY')}</p></div>
                                <div><p className={LABEL}>Dibutuhkan</p><p className={VALUE}>{data.tanggal_dibutuhkan ? dayjs(data.tanggal_dibutuhkan).format('DD MMM YYYY') : '—'}</p></div>
                                <div><p className={LABEL}>{data.metode_pembelian === 'tunai' ? 'Dibeli di' : 'Supplier'}</p><p className={VALUE}>{data.nama_supplier ?? data.nama_toko ?? '—'}</p></div>
                                {data.metode_pembelian === 'tunai' && <div><p className={LABEL}>Beli Tunai, Ditalangi</p><p className={VALUE}>{data.nama_penalang ?? '—'}</p></div>}
                                {diMuka && <div><p className={LABEL}>Syarat Pembayaran</p><p className={VALUE}>Bayar di muka</p></div>}
                                <div><p className={LABEL}>Tanggal Pembelian</p><p className={VALUE}>{data.tanggal_pembelian ? dayjs(data.tanggal_pembelian).format('DD MMM YYYY') : '—'}</p></div>
                                {data.nomor_po && <div><p className={LABEL}>No. PO</p><p className={`${VALUE} font-mono`}>{data.nomor_po}</p></div>}
                                {data.nomor_po && <div><p className={LABEL}>Tanggal PO</p><p className={VALUE}>{data.tanggal_po ? dayjs(data.tanggal_po).format('DD MMM YYYY') : '—'}</p></div>}
                                {data.id_perawatan && (
                                    <div className="col-span-2">
                                        <p className={LABEL}>Perawatan</p>
                                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                                            onClick={() => router.push(`${ROUTES.PERAWATAN_ARMADA}?detail=${data.id_perawatan}`)}>
                                            {data.nopol_perawatan ?? '—'} · {data.tanggal_perawatan ? dayjs(data.tanggal_perawatan).format('DD MMM YYYY') : '—'}
                                            <HiOutlineExternalLink />
                                        </span>
                                    </div>
                                )}
                                <div><p className={LABEL}>Total Estimasi</p><p className={`${VALUE} font-bold`}>{formatRupiah(data.total_estimasi)}</p></div>
                                <div><p className={LABEL}>Total Aktual</p><p className={`${VALUE} font-bold`}>{data.total_aktual !== null ? formatRupiah(data.total_aktual) : '—'}</p></div>
                                <div><p className={LABEL}>Diterima</p><p className={VALUE}>{data.tanggal_diterima ? dayjs(data.tanggal_diterima).format('DD MMM YYYY') : '—'}</p></div>
                                <div><p className={LABEL}>Dibayar</p><p className={VALUE}>{data.tanggal_pembayaran ? dayjs(data.tanggal_pembayaran).format('DD MMM YYYY') : '—'}</p></div>
                                <div className="col-span-2 lg:col-span-4"><p className={LABEL}>Alasan Permintaan</p><p className="text-sm whitespace-pre-line">{data.alasan}</p></div>
                                {data.alasan_ditolak && <div className="col-span-2 lg:col-span-4"><p className={LABEL}>Alasan Ditolak</p><p className="text-sm text-red-500">{data.alasan_ditolak}</p></div>}
                                {data.alasan_batal && <div className="col-span-2 lg:col-span-4"><p className={LABEL}>Alasan Dibatalkan</p><p className="text-sm text-red-500">{data.alasan_batal}</p></div>}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div>
                            <p className={`${LABEL} mb-2`}>{aset ? 'Unit yang Diajukan' : 'Item'}</p>
                            <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                                <table className="w-full text-sm">
                                    {aset ? (
                                        <thead className="bg-blue-50 dark:bg-blue-500/10"><tr>
                                            <th className={TH}>Unit</th><th className={`${TH} text-right`}>Jumlah</th><th className={`${TH} text-right`}>Estimasi</th><th className={`${TH} text-right`}>Aktual</th><th className={TH}>Terdaftar</th><th className={`${TH} text-right`}>Subtotal</th>
                                        </tr></thead>
                                    ) : (
                                        <thead className="bg-blue-50 dark:bg-blue-500/10"><tr>
                                            <th className={TH}>Jenis</th><th className={TH}>Nama</th><th className={`${TH} text-right`}>Qty</th><th className={`${TH} text-right`}>Estimasi</th><th className={`${TH} text-right`}>Aktual</th><th className={`${TH} text-right`}>Diterima</th><th className={`${TH} text-right`}>Subtotal</th>
                                        </tr></thead>
                                    )}
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {data.items.map(i => aset ? (
                                            <tr key={i.id_item}>
                                                <td className="py-2 px-3"><p className="font-medium">{namaUnit(i)}</p><p className="text-xs text-gray-400">{i.nama_jenis_kendaraan ?? '—'}{i.spesifikasi ? ` · ${i.spesifikasi}` : ''}</p>{i.keterangan && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 [overflow-wrap:anywhere]">Catatan: {i.keterangan}</p>}</td>
                                                <td className="py-2 px-3 text-right whitespace-nowrap">{formatNum(i.qty)} {i.satuan}</td>
                                                <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(i.harga_estimasi)}</td>
                                                <td className="py-2 px-3 text-right whitespace-nowrap">{i.harga_aktual !== null ? formatRupiah(i.harga_aktual) : '—'}</td>
                                                <td className="py-2 px-3">
                                                    <p className="font-medium whitespace-nowrap">{formatNum(i.qty_diterima ?? 0)}/{formatNum(i.qty)}</p>
                                                    {(i.armada_terdaftar ?? []).length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {(i.armada_terdaftar ?? []).map(a => (
                                                                <span key={a.id_armada} className="font-mono text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" onClick={() => router.push(ROUTES.ARMADA_DETAIL(a.id_armada))}>{a.nopol}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {bolehDaftarUnit && (
                                                        <Button type="button" size="xs" variant="solid" className="mt-1.5" disabled={(i.qty_diterima ?? 0) >= i.qty} onClick={() => bukaArmadaBaru(i.id_item)}>Daftarkan Unit</Button>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-right whitespace-nowrap font-semibold">{formatRupiah(i.subtotal_aktual ?? i.subtotal_estimasi)}</td>
                                            </tr>
                                        ) : (
                                            <tr key={i.id_item}>
                                                <td className="py-2 px-3"><Tag className={`text-[10px] font-semibold ${JENIS_TAG[i.jenis] ?? JENIS_TAG.jasa}`}>{JENIS_LABEL[i.jenis]}</Tag></td>
                                                <td className="py-2 px-3"><p className="font-medium">{i.nama_item}</p><p className="text-xs text-gray-400">{i.kode_sparepart ?? i.kode_barang ?? (i.jenis === 'barang' ? 'belum ditautkan ke master' : '')}{i.spesifikasi ? ` · ${i.spesifikasi}` : ''}</p>{i.keterangan && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 [overflow-wrap:anywhere]">Catatan: {i.keterangan}</p>}</td>
                                                <td className="py-2 px-3 text-right whitespace-nowrap">{formatNum(i.qty)} {i.satuan}</td>
                                                <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(i.harga_estimasi)}</td>
                                                <td className="py-2 px-3 text-right whitespace-nowrap">{i.harga_aktual !== null ? formatRupiah(i.harga_aktual) : '—'}</td>
                                                <td className="py-2 px-3 text-right whitespace-nowrap">
                                                    {i.qty_diterima === null ? '—' : i.qty_diterima < i.qty
                                                        ? <span className="text-orange-600 dark:text-orange-400">{formatNum(i.qty_diterima)} / {formatNum(i.qty)}</span>
                                                        : formatNum(i.qty_diterima)}
                                                </td>
                                                <td className="py-2 px-3 text-right whitespace-nowrap font-semibold">{formatRupiah(i.subtotal_aktual ?? i.subtotal_estimasi)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {biaya && (
                                <div className="flex justify-end mt-3">
                                    <div className="w-full max-w-xs flex flex-col gap-1">
                                        {biaya.baris.map(b => (
                                            <div key={b.label} className="flex items-center justify-between px-4 text-sm text-gray-500 dark:text-gray-400">
                                                <span>{b.label}</span>
                                                <span className="tabular-nums">{b.nilai}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-2 mt-1">
                                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-100 tabular-nums">{formatRupiah(biaya.total)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {riwayatTerima.length > 0 && (
                        <Card>
                            <p className={`${LABEL} mb-3`}>Riwayat Penerimaan ({riwayatTerima.length})</p>
                            {riwayatTerimaTersembunyi > 0 && (
                                <button type="button" onClick={() => setRiwayatTerimaPenuh(true)}
                                    className="ml-[128px] mb-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                    Tampilkan {formatNum(riwayatTerimaTersembunyi)} penerimaan sebelumnya
                                </button>
                            )}
                            <div className="flex flex-col">
                                {riwayatTerimaTampil.map((t, idx) => {
                                    const terakhir = idx === riwayatTerimaTampil.length - 1 && !data.sisa_ditutup_pada
                                    return (
                                        <div key={t.id_penerimaan} className="flex gap-3">
                                            <div className="w-20 shrink-0 text-right text-xs text-gray-400 pt-1">{dayjs(t.tanggal_diterima).format('DD MMM YYYY')}</div>
                                            <div className="flex flex-col items-center">
                                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                    <HiOutlineInboxIn />
                                                </span>
                                                {!terakhir && <span className="flex-1 w-px bg-gray-200 dark:bg-gray-600 my-1" />}
                                            </div>
                                            <div className={`flex-1 min-w-0 pt-0.5 ${terakhir ? '' : 'pb-3'}`}>
                                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Penerimaan ke-{riwayatTerimaTersembunyi + idx + 1}</span>
                                                    <span className="text-sm text-gray-600 dark:text-gray-300 [overflow-wrap:anywhere]">
                                                        {t.items.map(i => `${i.nama_item} ${formatNum(i.qty)} ${i.satuan}`).join(' · ')}
                                                    </span>
                                                    {t.diterima_oleh && <span className="text-xs text-gray-400 ml-auto">oleh {t.diterima_oleh}</span>}
                                                </div>
                                                {t.keterangan && <p className="text-xs text-gray-400 mt-0.5 [overflow-wrap:anywhere]">{t.keterangan}</p>}
                                            </div>
                                        </div>
                                    )
                                })}
                                {data.sisa_ditutup_pada && (
                                    <div className="flex gap-3">
                                        <div className="w-20 shrink-0 text-right text-xs text-gray-400 pt-1">{dayjs(data.sisa_ditutup_pada).format('DD MMM YYYY')}</div>
                                        <div className="flex flex-col items-center">
                                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0 bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-300">
                                                <HiOutlineBan />
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Sisa pesanan ditutup</span>
                                            {data.alasan_tutup_sisa && <p className="text-xs text-gray-400 mt-0.5 [overflow-wrap:anywhere]">{data.alasan_tutup_sisa}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {aset && daftarTermin.length > 0 && (
                        <Card>
                            <div className="flex items-center justify-between mb-2">
                                <p className={LABEL}>Termin Pembayaran ({daftarTermin.length})</p>
                                {data.termin_lunas && <Tag className={`text-[10px] font-semibold ${TERMIN_TAG.ditransfer}`}>Lunas</Tag>}
                            </div>
                            <div className="flex flex-col gap-2">
                                {daftarTermin.map(t => (
                                    <div key={t.id_termin} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
                                        <div className="flex-1 min-w-40">
                                            <p className="text-sm font-medium">Termin {t.urutan}: {t.nama}</p>
                                            <p className="text-xs text-gray-400">
                                                {t.pengajuan ? <span className="font-mono">{t.pengajuan.nomor_pengajuan}</span> : 'pengajuan belum tersedia'}
                                                {t.jatuh_tempo ? ` · jatuh tempo ${dayjs(t.jatuh_tempo).format('DD MMM YYYY')}` : ''}
                                                {t.tanggal_transfer ? ` · ditransfer ${dayjs(t.tanggal_transfer).format('DD MMM YYYY')}` : ''}
                                            </p>
                                            {t.pengajuan?.status === 'ditolak' && t.pengajuan.alasan_ditolak && (
                                                <TeksLipat teks={t.pengajuan.alasan_ditolak} awalan="Ditolak:" className="text-xs text-red-500 dark:text-red-400 mt-0.5" />
                                            )}
                                        </div>
                                        <span className="text-sm font-semibold whitespace-nowrap">{formatRupiah(t.nominal)}</span>
                                        <Tag className={`text-[10px] font-semibold ${TERMIN_TAG[t.status] ?? TERMIN_TAG.menunggu}`}>{TERMIN_LABEL[t.status] ?? t.status}</Tag>
                                        {t.pengajuan && t.status !== 'ditransfer' && (
                                            <Tag className={`text-[10px] font-semibold ${PENGAJUAN_TAG[t.pengajuan.status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'}`}>{PENGAJUAN_LABEL[t.pengajuan.status] ?? t.pengajuan.status}</Tag>
                                        )}
                                        {bolehAjukanUlangTermin && t.pengajuan?.status === 'ditolak' && (
                                            <Button size="xs" variant="solid" onClick={() => bukaAjukanUlang(t)}>Ajukan Ulang</Button>
                                        )}
                                        <Tooltip title="Log Aktivitas Termin"><Button size="xs" variant="default" icon={<HiOutlineClipboardList />} onClick={() => setLogTermin(t)} /></Tooltip>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {data.bukti.length > 0 && (
                        <Card>
                            <div className="flex flex-wrap gap-x-8 gap-y-5">
                                {(['pengajuan', 'pembelian', 'penerimaan'] as TahapBukti[]).map(tahap => {
                                    const daftar = data.bukti.filter(b => b.tahap === tahap)
                                    if (daftar.length === 0) return null
                                    return (
                                        <div key={tahap} className="w-full sm:w-auto min-w-0 max-w-full">
                                            <p className={`${LABEL} mb-2`}>{TAHAP_LABEL[tahap]} ({daftar.length})</p>
                                            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                                                {daftar.map(b => (
                                                    <div key={b.id_bukti} className="relative min-w-0 sm:w-40">
                                                        <a href={b.url_file} onClick={klik(b.url_file, b.nama_asli, b.nama_asli.replace(/\.[^.]+$/, ''))}
                                                            target="_blank" rel="noopener noreferrer" title={`Buka ${b.nama_asli}`}>
                                                            {buktiGambar(b) ? (
                                                                <img src={b.url_file} alt={b.nama_asli}
                                                                    className="w-full h-28 object-cover rounded-lg border border-gray-100 dark:border-gray-700 hover:opacity-90 transition-opacity" />
                                                            ) : (
                                                                <div className="w-full h-28 flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:opacity-90 transition-opacity">
                                                                    <HiOutlineDocumentText className="text-3xl" />
                                                                    <span className="text-xs font-semibold uppercase">{(b.nama_asli.split('.').pop() ?? '').toLowerCase() || 'File'}</span>
                                                                </div>
                                                            )}
                                                        </a>
                                                        <p className="text-xs text-gray-400 truncate mt-1">{b.nama_asli}</p>
                                                        {(pengaju || kelola) && (
                                                            <Tooltip title="Hapus">
                                                                <span
                                                                    className="absolute top-1 right-1 cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 shadow transition-colors"
                                                                    onClick={() => setHapusBuktiTarget(b)}>
                                                                    <HiOutlineTrash className="text-sm" />
                                                                </span>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    )}

                    <div className="flex justify-end">
                        <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.push(ROUTES.PERMINTAAN_PEMBELIAN)}>Kembali</Button>
                    </div>
                </>
            )}
        </div>

        <LogAktivitasKeuanganDialog isOpen={logOpen && !aset} info={data?.pengajuan_keuangan} judul="Log Aktivitas — Pembayaran PR"
            emptyMessage={sparepart ? 'Pengajuan pembayaran dibuat setelah realisasi Pembelian Sparepart.' : 'Pengajuan pembayaran dibuat setelah Pengadaan menandai Dibeli.'} onClose={() => setLogOpen(false)} />

        <LogAktivitasKeuanganDialog isOpen={!!logTermin} info={logTermin?.pengajuan} judul={logTermin ? `Log Aktivitas — Termin ${logTermin.urutan}: ${logTermin.nama}` : 'Log Aktivitas'}
            emptyMessage="Pengajuan pembayaran termin ini belum tersedia." onClose={() => setLogTermin(null)} />

        <ConfirmDialog isOpen={prosesOpen} type="info" title="Mulai Proses Pengadaan" confirmText="Ya, Proses" cancelText="Batal"
            confirmButtonProps={{ loading: submitting }} onClose={() => setProsesOpen(false)} onCancel={() => setProsesOpen(false)}
            onConfirm={() => data && jalankan(() => permintaanPembelianService.proses(data.id_permintaan), 'Permintaan mulai diproses', () => setProsesOpen(false))}>
            <p>{sparepart ? `Ambil PR ${data?.nomor_permintaan} untuk diproses? Dokumen Pembelian Sparepart akan dibuat otomatis.` : `Ambil PR ${data?.nomor_permintaan} untuk diproses (cari supplier & harga)?`}</p>
        </ConfirmDialog>

        <ConfirmDialog isOpen={!!hapusBuktiTarget} type="danger" title="Hapus Lampiran" confirmText="Ya, Hapus" cancelText="Batal"
            confirmButtonProps={{ loading: submitting }} onClose={() => setHapusBuktiTarget(null)} onCancel={() => setHapusBuktiTarget(null)}
            onConfirm={() => data && hapusBuktiTarget && jalankan(() => permintaanPembelianService.hapusBukti(data.id_permintaan, hapusBuktiTarget.id_bukti), 'Lampiran dihapus', () => setHapusBuktiTarget(null))}>
            <p>Hapus lampiran {hapusBuktiTarget?.nama_asli}?</p>
        </ConfirmDialog>

        <ConfirmDialog isOpen={hapusOpen} type="danger" title="Hapus Permintaan" confirmText="Ya, Hapus" cancelText="Batal"
            confirmButtonProps={{ loading: submitting }} onClose={() => setHapusOpen(false)} onCancel={() => setHapusOpen(false)}
            onConfirm={() => data && jalankan(() => permintaanPembelianService.remove(data.id_permintaan), 'Permintaan dihapus', () => { setHapusOpen(false); router.push(ROUTES.PERMINTAAN_PEMBELIAN) }, false)}>
            <p>Hapus PR {data?.nomor_permintaan}? Tindakan ini tidak dapat dibatalkan.</p>
        </ConfirmDialog>

        <ConfirmDialog isOpen={batalOpen} type="danger" title="Batalkan Permintaan" confirmText="Ya, Batalkan" cancelText="Kembali"
            confirmButtonProps={{ loading: submitting, disabled: !alasanBatal.trim() }} onClose={() => setBatalOpen(false)} onCancel={() => setBatalOpen(false)}
            onConfirm={() => data && jalankan(() => permintaanPembelianService.batal(data.id_permintaan, alasanBatal.trim()), 'Permintaan dibatalkan', () => setBatalOpen(false))}>
            {sparepart && ps && ['diproses', 'dipesan'].includes(data?.status ?? '') && <p className="text-sm text-amber-600 mb-2">Pembelian Sparepart {ps.nomor_pengajuan} akan ikut dibatalkan (ditolak).</p>}
            {data?.status === 'dipesan' && data.nomor_po && <p className="text-sm text-amber-600 mb-2">PO {data.nomor_po} sudah terbit — kabari supplier bahwa pesanan dibatalkan.</p>}
            <p className="text-sm font-semibold mb-1">Alasan pembatalan <span className="text-red-500">*</span></p>
            <Input textArea rows={3} value={alasanBatal} onChange={e => setAlasanBatal(e.target.value)} />
        </ConfirmDialog>

        <Dialog isOpen={dibeliOpen} onRequestClose={() => setDibeliOpen(false)} onClose={() => setDibeliOpen(false)} width={680}>
            <h5 className="font-bold mb-1">{modePo ? (data?.nomor_po ? `Revisi PO ${data.nomor_po}` : 'Terbitkan PO') : 'Tandai Dibeli'}</h5>
            <p className="text-xs text-gray-400 mb-4">
                {modePo
                    ? (data?.nomor_po
                        ? 'Ubah supplier, harga, diskon, PPN, atau ongkos kirim. Nomor PO tetap; cetak ulang PO setelah disimpan dan kirim lagi ke supplier.'
                        : 'Isi supplier, harga yang disepakati, diskon, PPN, dan ongkos kirim. Nomor PO terbit saat disimpan dan PO bisa langsung dicetak untuk supplier. Nota belum diperlukan di tahap ini.')
                    : aset
                        ? 'Cocokkan dengan nota supplier: koreksi harga bila berbeda dari PO, isi rincian termin pembayaran, dan unggah nota. Satu pengajuan pengeluaran (kategori Pembelian Aset) dibuat per termin.'
                        : 'Cocokkan dengan nota supplier: koreksi harga bila berbeda dari PO lalu unggah nota. Pengajuan pembayaran dibuat saat disimpan.'}
            </p>
            <div className="grid grid-cols-2 gap-3">
                <FormItem label={modePo ? 'Supplier' : 'Supplier (sesuai PO)'} asterisk><Select<Option> isSearchable isDisabled={!modePo} options={supplierOptions} value={supplierOptions.find(o => o.value === dibeli.id_supplier) ?? null} onChange={opt => setDibeli(p => ({ ...p, id_supplier: (opt as Option | null)?.value ?? '' }))} /></FormItem>
                <FormItem label={modePo ? 'Tanggal PO' : 'Tanggal Pembelian'} asterisk><DatePicker inputFormat="DD/MM/YYYY" value={dayjs(dibeli.tanggal).toDate()} onChange={d => setDibeli(p => ({ ...p, tanggal: d ? dayjs(d).format('YYYY-MM-DD') : '' }))} /></FormItem>
            </div>
            {modePo && data?.tipe === 'umum' && (
                <FormItem label="Syarat Pembayaran">
                    <Select<{ value: SyaratPembayaran; label: string }> isSearchable={false} options={SYARAT_OPTIONS}
                        value={SYARAT_OPTIONS.find(o => o.value === dibeli.syarat) ?? SYARAT_OPTIONS[0]}
                        onChange={opt => setDibeli(p => ({ ...p, syarat: opt?.value ?? 'setelah_terima' }))} />
                    <p className="text-xs text-gray-400 mt-1">
                        {dibeli.syarat === 'di_muka'
                            ? 'Pengajuan pembayaran langsung dikirim ke Keuangan saat PO disimpan, tanpa menunggu barang datang. PR otomatis menjadi Dibeli setelah ditransfer. Pakai untuk toko online atau supplier yang minta dibayar dulu.'
                            : 'Pengajuan pembayaran dibuat saat Tandai Dibeli, dan Keuangan baru bisa mentransfer setelah barang/jasa dikonfirmasi diterima.'}
                    </p>
                </FormItem>
            )}
            {!modePo && (
            <FormItem label="Nota Supplier" asterisk={jumlahNotaTersimpan === 0} extra={jumlahNotaTersimpan > 0 ? <span className="text-xs text-gray-400">{jumlahNotaTersimpan} file sudah tersimpan</span> : undefined}>
                <Upload accept=".jpg,.jpeg,.png,.webp,.pdf" multiple showList={false} fileList={notaDibeli}
                    beforeUpload={baru => {
                        const daftar = Array.from(baru ?? [])
                        if (notaDibeli.length + daftar.length > 10) return 'Maksimal 10 file'
                        const kebesaran = daftar.find(f => f.size > 5 * 1024 * 1024)
                        if (kebesaran) return `File ${kebesaran.name} melebihi 5MB`
                        return true
                    }}
                    onChange={files => setNotaDibeli(files)}>
                    <Button type="button" variant="default" size="sm" icon={<HiOutlinePaperClip />}>Pilih file nota (maks. 10 × 5MB)</Button>
                </Upload>
                {notaDibeli.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        {notaDibeli.map((file, idx) => (
                            <div key={`${file.name}-${idx}`} className="relative group">
                                <LampiranPreview file={file} />
                                <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                                <button
                                    type="button"
                                    className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 shadow"
                                    onClick={() => setNotaDibeli(prev => prev.filter((_, i) => i !== idx))}
                                >
                                    <HiOutlineTrash className="text-xs" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </FormItem>
            )}
            <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-1">
                {data?.items.map(i => (
                    <div key={i.id_item} className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                        <p className="font-medium text-sm">{aset ? namaUnit(i) : i.nama_item} <span className="text-xs text-gray-400">× {formatNum(i.qty)} {i.satuan}</span></p>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <FormItem label={`${modePo ? 'Harga' : 'Harga Aktual'} / ${aset ? 'unit' : 'satuan'}`} className="mb-0"><Input prefix="Rp" value={dibeli.harga[i.id_item] ? formatNum(Number(dibeli.harga[i.id_item])) : ''} onChange={e => setDibeli(p => ({ ...p, harga: { ...p.harga, [i.id_item]: e.target.value.replace(/\D/g, '') } }))} /></FormItem>
                            {i.jenis === 'barang' && (
                                <FormItem label="Master Barang" className="mb-0" extra={<span className="text-xs text-blue-600 cursor-pointer" onClick={() => { setBuatCepatUntuk(i.id_item); setBuatCepat({ nama: i.nama_item, satuan: i.satuan }) }}>+ daftarkan baru</span>}>
                                    <Select<Option> isSearchable options={barangOptions} value={barangOptions.find(o => o.value === dibeli.barang[i.id_item]) ?? null}
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                        onChange={opt => setDibeli(p => ({ ...p, barang: { ...p.barang, [i.id_item]: (opt as Option | null)?.value ?? '' } }))} />
                                </FormItem>
                            )}
                        </div>
                    </div>
                ))}
                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                    <p className="text-sm font-semibold mb-3">Ringkasan Biaya</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormItem label="Subtotal" className="mb-0">
                            <p className="h-12 flex items-center text-sm font-semibold tabular-nums">{formatRupiah(subtotalDibeli)}</p>
                        </FormItem>
                        <FormItem label="Diskon" className="mb-0">
                            <Input prefix="Rp" placeholder="0" invalid={diskonMelebihi} value={dibeli.diskon ? formatNum(Number(dibeli.diskon)) : ''}
                                onChange={e => setDibeli(p => ({ ...p, diskon: e.target.value.replace(/\D/g, '') }))} />
                            {diskonMelebihi && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Diskon tidak boleh melebihi subtotal ({formatRupiah(subtotalDibeli)})</p>}
                        </FormItem>
                        <FormItem label="PPN" className="mb-0">
                            <div className="flex items-center gap-2">
                                <Input className="w-24" suffix="%" placeholder="0" invalid={ppnMelebihi} value={dibeli.ppn_persen}
                                    onChange={e => setDibeli(p => ({ ...p, ppn_persen: rapikanPersen(e.target.value) }))} />
                                <Input className="flex-1" prefix="Rp" placeholder="0" readOnly value={dibeli.ppn_persen ? formatNum(ppnDibeli) : ''} />
                            </div>
                            {ppnMelebihi && <p className="text-xs text-red-500 dark:text-red-400 mt-1">PPN tidak boleh melebihi 100%</p>}
                        </FormItem>
                        <FormItem label="Ongkos Kirim" className="mb-0">
                            <Input prefix="Rp" placeholder="0" value={dibeli.ongkir ? formatNum(Number(dibeli.ongkir)) : ''}
                                onChange={e => setDibeli(p => ({ ...p, ongkir: e.target.value.replace(/\D/g, '') }))} />
                        </FormItem>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mt-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</span>
                        <span className="font-bold text-lg tabular-nums">{formatRupiah(totalAktualDibeli)}</span>
                    </div>
                    {totalDibeliNol && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Total pembelian tidak boleh Rp 0.</p>}
                </div>
                {aset && !modePo && (
                    <div className="rounded-lg border border-sky-200 bg-sky-50/40 dark:border-sky-500/30 dark:bg-sky-500/5 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold">Termin Pembayaran <span className="text-red-500">*</span></p>
                            <button type="button" onClick={() => setTerminRows(rows => [...rows, { nama: '', nominal: '', jatuh_tempo: '' }])}
                                className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 font-medium">
                                <HiOutlinePlus /> Tambah Termin
                            </button>
                        </div>
                        {terminRows.length === 0 ? (
                            <p className="text-xs text-gray-400">Belum ada termin — tambahkan minimal satu termin (misal DP dan Pelunasan).</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {terminRows.map((r, idx) => (
                                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                                        <FormItem label={idx === 0 ? 'Nama Termin' : ''} className="mb-0"><Input size="sm" placeholder={`Termin ${idx + 1}`} value={r.nama} onChange={e => ubahTermin(idx, { nama: e.target.value })} /></FormItem>
                                        <FormItem label={idx === 0 ? 'Nominal' : ''} className="mb-0"><Input size="sm" prefix="Rp" placeholder="0" value={r.nominal ? formatNum(Number(r.nominal)) : ''} onChange={e => ubahTermin(idx, { nominal: e.target.value.replace(/\D/g, '') })} /></FormItem>
                                        <FormItem label={idx === 0 ? 'Jatuh Tempo' : ''} className="mb-0"><DatePicker size="sm" inputFormat="DD/MM/YYYY" placeholder="Opsional" value={r.jatuh_tempo ? dayjs(r.jatuh_tempo).toDate() : null} onChange={d => ubahTermin(idx, { jatuh_tempo: d ? dayjs(d).format('YYYY-MM-DD') : '' })} /></FormItem>
                                        <Button type="button" size="sm" variant="plain" icon={<HiOutlineTrash />} customColorClass={() => 'text-red-500 hover:text-red-600'} onClick={() => setTerminRows(rows => rows.filter((_, i) => i !== idx))} />
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className={`text-xs mt-3 ${sisaTermin === 0 && terminRows.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            Total aktual {formatRupiah(totalAktualDibeli)} · Total termin {formatRupiah(totalTermin)} · Sisa {formatRupiah(sisaTermin)}
                        </p>
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={() => setDibeliOpen(false)}>Kembali</Button>
                {modePo ? (
                    <Button type="button" variant="solid" loading={submitting} disabled={!dibeli.id_supplier || !dibeli.tanggal || !hargaDibeliValid || diskonMelebihi || ppnMelebihi || totalAktualDibeli <= 0} onClick={submitPesan}>{data?.nomor_po ? 'Simpan Revisi' : 'Terbitkan PO'}</Button>
                ) : (
                    <Button type="button" variant="solid" loading={submitting} disabled={!dibeli.id_supplier || !dibeli.tanggal || !adaNota || !hargaDibeliValid || diskonMelebihi || ppnMelebihi || totalAktualDibeli <= 0 || (aset && !terminValid)} onClick={submitDibeli}>Simpan</Button>
                )}
            </div>
        </Dialog>

        {data && (
            <BeliTunaiDialog
                isOpen={tunaiOpen}
                data={data}
                namaPenalangAwal={session?.user?.name ?? ''}
                onClose={() => setTunaiOpen(false)}
                onSelesai={hasil => setData(hasil)}
            />
        )}

        <Dialog isOpen={realisasiOpen} onRequestClose={() => setRealisasiOpen(false)} onClose={() => setRealisasiOpen(false)} width={640}>
            <h5 className="font-bold mb-1">Catat Realisasi</h5>
            <p className="text-xs text-gray-400 mb-4">
                {realisasiDariPo
                    ? `Cocokkan dengan nota supplier untuk PO ${data?.nomor_po ?? ''}: koreksi harga bila berbeda lalu unggah nota. Stok bertambah dan pengajuan pembayaran dibuat saat disimpan.`
                    : 'Isi tanggal pembelian, supplier (opsional), harga aktual per item, dan unggah nota pembelian.'}
            </p>
            {overBatasRealisasi && (
                <p className="text-sm text-red-500 mb-3">
                    Total aktual {formatRupiah(totalAktualRealisasi)} melebihi batas mandiri {formatRupiah(data?.batas_mandiri ?? 0)} — {pengadaan ? 'tutup dialog ini lalu terbitkan PO lebih dulu.' : 'realisasi harus dilakukan tim Pengadaan.'}
                </p>
            )}
            <div className="grid grid-cols-2 gap-3">
                <FormItem label="Tanggal Pembelian" asterisk><DatePicker inputFormat="DD/MM/YYYY" value={dayjs(realisasi.tanggal).toDate()} onChange={d => setRealisasi(p => ({ ...p, tanggal: d ? dayjs(d).format('YYYY-MM-DD') : '' }))} /></FormItem>
                <FormItem label={realisasiDariPo ? 'Supplier (sesuai PO)' : 'Supplier (opsional)'}><Select<Option> isSearchable isClearable={!realisasiDariPo} isDisabled={realisasiDariPo} options={supplierOptions} value={supplierOptions.find(o => o.value === realisasi.id_supplier) ?? null} onChange={opt => setRealisasi(p => ({ ...p, id_supplier: (opt as Option | null)?.value ?? '' }))} /></FormItem>
            </div>
            <FormItem label="Nota Pembelian" asterisk={jumlahNotaTersimpan === 0} extra={jumlahNotaTersimpan > 0 ? <span className="text-xs text-gray-400">{jumlahNotaTersimpan} file sudah tersimpan</span> : undefined}>
                <Upload accept=".jpg,.jpeg,.png,.webp,.pdf" multiple showList={false} fileList={notaRealisasi}
                    beforeUpload={baru => {
                        const daftar = Array.from(baru ?? [])
                        if (notaRealisasi.length + daftar.length > 10) return 'Maksimal 10 file'
                        const kebesaran = daftar.find(f => f.size > 5 * 1024 * 1024)
                        if (kebesaran) return `File ${kebesaran.name} melebihi 5MB`
                        return true
                    }}
                    onChange={files => setNotaRealisasi(files)}>
                    <Button type="button" variant="default" size="sm" icon={<HiOutlinePaperClip />}>Pilih file nota (maks. 10 × 5MB)</Button>
                </Upload>
                {notaRealisasi.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        {notaRealisasi.map((file, idx) => (
                            <div key={`${file.name}-${idx}`} className="relative group">
                                <LampiranPreview file={file} />
                                <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                                <button
                                    type="button"
                                    className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 shadow"
                                    onClick={() => setNotaRealisasi(prev => prev.filter((_, i) => i !== idx))}
                                >
                                    <HiOutlineTrash className="text-xs" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </FormItem>
            <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
                {data?.items.map(i => (
                    <div key={i.id_item} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
                        <div className="text-sm">
                            <p className="font-medium">{i.nama_item}</p>
                            <p className="text-xs text-gray-400">{formatNum(i.qty)} {i.satuan} × estimasi {formatRupiah(i.harga_estimasi)}</p>
                        </div>
                        <Input className="w-36" prefix="Rp" value={realisasi.harga[i.id_item] ? formatNum(Number(realisasi.harga[i.id_item])) : ''}
                            onChange={e => setRealisasi(p => ({ ...p, harga: { ...p.harga, [i.id_item]: e.target.value.replace(/\D/g, '') } }))} />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <FormItem label="Diskon" className="mb-0">
                    <Input prefix="Rp" placeholder="0" value={realisasi.diskon ? formatNum(Number(realisasi.diskon)) : ''}
                        onChange={e => setRealisasi(p => ({ ...p, diskon: e.target.value.replace(/\D/g, '') }))} />
                </FormItem>
                <FormItem label={realisasi.ppn_persen ? `PPN (${formatRupiah(ppnRealisasi)})` : 'PPN'} className="mb-0">
                    <Input suffix="%" placeholder="0" value={realisasi.ppn_persen}
                        onChange={e => setRealisasi(p => ({ ...p, ppn_persen: rapikanPersen(e.target.value) }))} />
                </FormItem>
                <FormItem label="Ongkos Kirim" className="mb-0">
                    <Input prefix="Rp" placeholder="0" value={realisasi.ongkir ? formatNum(Number(realisasi.ongkir)) : ''}
                        onChange={e => setRealisasi(p => ({ ...p, ongkir: e.target.value.replace(/\D/g, '') }))} />
                </FormItem>
            </div>
            {biayaRealisasiSalah && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Diskon tidak boleh melebihi subtotal ({formatRupiah(subtotalRealisasi)}) dan PPN maksimal 100%.</p>}
            {totalRealisasiNol && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Total pembelian tidak boleh Rp 0.</p>}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mt-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Aktual</span>
                <span className="font-bold text-lg tabular-nums">{formatRupiah(totalAktualRealisasi)}</span>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={() => setRealisasiOpen(false)}>Kembali</Button>
                <Button type="button" variant="solid" loading={submitting} disabled={!realisasi.tanggal || !adaNotaRealisasi || overBatasRealisasi || !hargaRealisasiValid || biayaRealisasiSalah || totalAktualRealisasi <= 0} onClick={submitRealisasi}>Simpan</Button>
            </div>
        </Dialog>

        <Dialog isOpen={!!buatCepatUntuk} onRequestClose={() => setBuatCepatUntuk(null)} onClose={() => setBuatCepatUntuk(null)} width={400}>
            <h5 className="font-bold mb-4">Daftarkan ke Master Barang</h5>
            <FormItem label="Nama" asterisk><Input value={buatCepat.nama} onChange={e => setBuatCepat(p => ({ ...p, nama: e.target.value }))} /></FormItem>
            <FormItem label="Satuan" asterisk><Input value={buatCepat.satuan} onChange={e => setBuatCepat(p => ({ ...p, satuan: e.target.value }))} /></FormItem>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={() => setBuatCepatUntuk(null)}>Kembali</Button>
                <Button type="button" variant="solid" disabled={!buatCepat.nama.trim() || !buatCepat.satuan.trim()} onClick={submitBuatCepat}>Daftarkan</Button>
            </div>
        </Dialog>

        <Dialog isOpen={terimaOpen} onRequestClose={() => setTerimaOpen(false)} onClose={() => setTerimaOpen(false)} width={560}>
            <h5 className="font-bold mb-1">{data?.status === 'diterima_sebagian' ? 'Catat Penerimaan Berikutnya' : 'Konfirmasi Penerimaan'}</h5>
            <p className="text-xs text-gray-400 mb-4">Isi jumlah yang datang kali ini. Stok barang bertambah sesuai jumlah ini; jasa tidak menyentuh stok. Kalau belum lengkap, PR berstatus Diterima Sebagian dan penerimaan berikutnya bisa dicatat lagi.</p>
            <FormItem label="Tanggal Diterima" asterisk><DatePicker inputFormat="DD/MM/YYYY" value={dayjs(terima.tanggal).toDate()} onChange={d => setTerima(p => ({ ...p, tanggal: d ? dayjs(d).format('YYYY-MM-DD') : '' }))} /></FormItem>
            <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
                {data?.items.map(i => (
                    <div key={i.id_item} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
                        <div className="text-sm">
                            <p>{i.nama_item}</p>
                            <p className="text-xs text-gray-400">dipesan {formatNum(i.qty)} {i.satuan} · sudah diterima {formatNum(i.qty_diterima ?? 0)} · sisa {formatNum(sisaItem(i))}</p>
                        </div>
                        <Input className="w-24" type="number" min={0} max={sisaItem(i)} disabled={sisaItem(i) === 0}
                            invalid={(Number(terima.qty[i.id_item]) || 0) > sisaItem(i)}
                            value={terima.qty[i.id_item] ?? ''} onChange={e => setTerima(p => ({ ...p, qty: { ...p.qty, [i.id_item]: e.target.value } }))} />
                    </div>
                ))}
            </div>
            {terimaMelebihi && <p className="text-xs text-red-500 dark:text-red-400 mt-2">Jumlah yang diisi melebihi sisa yang belum diterima.</p>}
            {!terimaMelebihi && totalTerima > 0 && !terimaLengkap && <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">{diMuka ? 'Belum lengkap — setelah disimpan PR berstatus Diterima Sebagian. PO ini bayar di muka, jadi pembayarannya tidak menunggu sisanya.' : 'Belum lengkap — setelah disimpan PR berstatus Diterima Sebagian dan pembayaran masih ditahan.'}</p>}
            <FormItem label="Keterangan" className="mt-3"><Input textArea rows={2} maxLength={500} value={terima.keterangan} onChange={e => setTerima(p => ({ ...p, keterangan: e.target.value }))} /></FormItem>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={() => setTerimaOpen(false)}>Kembali</Button>
                <Button type="button" variant="solid" loading={submitting} disabled={!terima.tanggal || totalTerima <= 0 || terimaMelebihi} onClick={submitTerima}>Simpan</Button>
            </div>
        </Dialog>

        <Dialog isOpen={tutupOpen} onRequestClose={() => setTutupOpen(false)} onClose={() => setTutupOpen(false)} width={560}>
            <h5 className="font-bold mb-1">Tutup Sisa Pesanan</h5>
            <p className="text-xs text-gray-400 mb-4">
                {dibayarMenungguBarang
                    ? 'Dipakai bila sisa barang tidak jadi dikirim supplier. PR ini sudah dibayar di muka, jadi langsung Selesai dan selisihnya dicatat sebagai kelebihan bayar untuk diminta kembali ke supplier. Tidak bisa dibatalkan.'
                    : 'Dipakai bila sisa barang tidak jadi dikirim supplier. PR menjadi Diterima dan pembayaran disesuaikan dengan jumlah yang benar-benar diterima. Tidak bisa dibatalkan.'}
            </p>
            <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-1">
                {data?.items.filter(i => sisaItem(i) > 0).map(i => (
                    <div key={i.id_item} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 text-sm">
                        <span>{i.nama_item}</span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">diterima {formatNum(i.qty_diterima ?? 0)} dari {formatNum(i.qty)} {i.satuan} · {formatNum(sisaItem(i))} ditutup</span>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <FormItem label="Nilai Barang Diterima" className="mb-0">
                    <p className="h-12 flex items-center text-sm font-semibold tabular-nums">{formatRupiah(nilaiDiterima)}</p>
                </FormItem>
                <FormItem label="Diskon" className="mb-0">
                    <Input prefix="Rp" placeholder="0" invalid={diskonTutupMelebihi} disabled={tanpaPenerimaan} value={tutup.diskon ? formatNum(Number(tutup.diskon)) : ''}
                        onChange={e => setTutup(p => ({ ...p, diskon: e.target.value.replace(/\D/g, '') }))} />
                </FormItem>
                <FormItem label={data && data.ppn_persen > 0 ? `PPN (${data.ppn_persen}%)` : 'PPN'} className="mb-0">
                    <p className="h-12 flex items-center text-sm tabular-nums">{formatRupiah(ppnTutup)}</p>
                </FormItem>
                <FormItem label="Ongkos Kirim" className="mb-0">
                    <Input prefix="Rp" placeholder="0" disabled={tanpaPenerimaan} value={tutup.ongkir ? formatNum(Number(tutup.ongkir)) : ''}
                        onChange={e => setTutup(p => ({ ...p, ongkir: e.target.value.replace(/\D/g, '') }))} />
                </FormItem>
            </div>
            {diskonTutupMelebihi && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Diskon tidak boleh melebihi nilai barang yang diterima.</p>}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mt-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{dibayarMenungguBarang ? 'Nilai pembelian menjadi' : 'Pembayaran menjadi'}</span>
                <span className="font-bold text-lg tabular-nums">{formatRupiah(totalTutup)}</span>
            </div>
            {dibayarMenungguBarang ? (
                tutupMelebihiTerbayar
                    ? <p className="text-xs text-red-500 dark:text-red-400 mt-1">Melebihi yang sudah dibayar ({formatRupiah(terbayarDiMuka)}) — periksa diskon dan ongkos kirim.</p>
                    : <p className="text-xs text-gray-400 mt-1">Sudah dibayar {formatRupiah(terbayarDiMuka)} · kelebihan bayar <span className="font-semibold text-red-600 dark:text-red-400">{formatRupiah(terbayarDiMuka - totalTutup)}</span> perlu diminta kembali ke supplier.</p>
            ) : (
                <p className="text-xs text-gray-400 mt-1">Sebelumnya {formatRupiah(data?.total_aktual ?? 0)}.</p>
            )}
            <FormItem label="Alasan" asterisk className="mt-3">
                <Input textArea rows={2} maxLength={500} placeholder="Mis. stok supplier habis, sisa tidak dikirim" value={tutup.alasan} onChange={e => setTutup(p => ({ ...p, alasan: e.target.value }))} />
            </FormItem>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={() => setTutupOpen(false)}>Kembali</Button>
                <Button type="button" variant="solid" loading={submitting} disabled={tutup.alasan.trim().length < 3 || diskonTutupMelebihi || (dibayarMenungguBarang ? tutupMelebihiTerbayar : totalTutup <= 0)} onClick={submitTutupSisa}>Tutup Sisa</Button>
            </div>
        </Dialog>

        <Dialog isOpen={ulangOpen} onRequestClose={() => setUlangOpen(false)} onClose={() => setUlangOpen(false)} width={640}>
            <h5 className="font-bold mb-1">{terminUlang ? `Ajukan Ulang Termin ${terminUlang.urutan}: ${terminUlang.nama}` : pengajuanHilang ? 'Buat Pengajuan Pembayaran' : 'Ajukan Ulang Pembayaran'}</h5>
            <p className="text-xs text-gray-400 mb-4">
                {pengajuanHilang
                    ? 'Pengajuan pembayaran baru dibuat dengan nilai di bawah ini, lalu diproses Keuangan seperti biasa.'
                    : 'Pengajuan yang sama diproses ulang dari awal: approval bila nilainya di atas batas, lalu verifikasi Keuangan. Penolakan sebelumnya tetap tercatat di Log Aktivitas.'}
            </p>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
                {alasanTolakUlang && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 mb-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        <p className="text-xs font-semibold uppercase tracking-wide mb-0.5">Alasan ditolak</p>
                        <p className="whitespace-pre-line [overflow-wrap:anywhere]">{alasanTolakUlang}</p>
                    </div>
                )}
                {terminUlang ? (
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mb-4">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Nominal Termin</span>
                        <span className="font-bold text-lg tabular-nums">{formatRupiah(terminUlang.nominal)}</span>
                    </div>
                ) : (
                    <>
                        <FormItem label="Nota Pengganti / Tambahan" asterisk={jumlahNotaTersimpan === 0} extra={jumlahNotaTersimpan > 0 ? <span className="text-xs text-gray-400">{jumlahNotaTersimpan} file sudah tersimpan</span> : undefined}>
                            <Upload accept=".jpg,.jpeg,.png,.webp,.pdf" multiple showList={false} fileList={notaUlang}
                                beforeUpload={baru => {
                                    const daftar = Array.from(baru ?? [])
                                    if (notaUlang.length + daftar.length > 10) return 'Maksimal 10 file'
                                    const kebesaran = daftar.find(f => f.size > 5 * 1024 * 1024)
                                    if (kebesaran) return `File ${kebesaran.name} melebihi 5MB`
                                    return true
                                }}
                                onChange={files => setNotaUlang(files)}>
                                <Button type="button" variant="default" size="sm" icon={<HiOutlinePaperClip />}>Pilih file nota (maks. 10 × 5MB)</Button>
                            </Upload>
                            {notaUlang.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                    {notaUlang.map((file, idx) => (
                                        <div key={`${file.name}-${idx}`} className="relative group">
                                            <LampiranPreview file={file} />
                                            <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                                            <button
                                                type="button"
                                                className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 shadow"
                                                onClick={() => setNotaUlang(prev => prev.filter((_, i) => i !== idx))}
                                            >
                                                <HiOutlineTrash className="text-xs" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </FormItem>
                        <div className="mb-3">
                            <Checkbox checked={ulang.koreksi} onChange={checked => setUlang(p => ({ ...p, koreksi: checked }))}>
                                Koreksi rincian biaya (harga, diskon, PPN, ongkir)
                            </Checkbox>
                        </div>
                        {ulang.koreksi && (
                            <>
                                <div className="flex flex-col gap-2">
                                    {data?.items.map(i => (
                                        <div key={i.id_item} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
                                            <div className="text-sm">
                                                <p className="font-medium">{i.nama_item}</p>
                                                <p className="text-xs text-gray-400">{formatNum(qtyBayar(i))} {i.satuan} × sebelumnya {formatRupiah(i.harga_aktual ?? 0)}</p>
                                            </div>
                                            <Input className="w-36" prefix="Rp" value={ulang.harga[i.id_item] ? formatNum(Number(ulang.harga[i.id_item])) : ''}
                                                onChange={e => setUlang(p => ({ ...p, harga: { ...p.harga, [i.id_item]: e.target.value.replace(/\D/g, '') } }))} />
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                    <FormItem label="Diskon" className="mb-0">
                                        <Input prefix="Rp" placeholder="0" value={ulang.diskon ? formatNum(Number(ulang.diskon)) : ''}
                                            onChange={e => setUlang(p => ({ ...p, diskon: e.target.value.replace(/\D/g, '') }))} />
                                    </FormItem>
                                    <FormItem label={ulang.ppn_persen ? `PPN (${formatRupiah(ppnUlang)})` : 'PPN'} className="mb-0">
                                        <Input suffix="%" placeholder="0" value={ulang.ppn_persen}
                                            onChange={e => setUlang(p => ({ ...p, ppn_persen: rapikanPersen(e.target.value) }))} />
                                    </FormItem>
                                    <FormItem label="Ongkos Kirim" className="mb-0">
                                        <Input prefix="Rp" placeholder="0" value={ulang.ongkir ? formatNum(Number(ulang.ongkir)) : ''}
                                            onChange={e => setUlang(p => ({ ...p, ongkir: e.target.value.replace(/\D/g, '') }))} />
                                    </FormItem>
                                </div>
                                {biayaUlangSalah && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Diskon tidak boleh melebihi subtotal ({formatRupiah(subtotalUlang)}) dan PPN maksimal 100%.</p>}
                                {hargaUlangValid && !biayaUlangSalah && totalUlang <= 0 && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Total pembelian tidak boleh Rp 0.</p>}
                                {overBatasUlang && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Total {formatRupiah(totalUlang)} melebihi batas mandiri {formatRupiah(data?.batas_mandiri ?? 0)} — koreksi harus dilakukan tim Pengadaan.</p>}
                            </>
                        )}
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mt-3">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{ulang.koreksi ? 'Pembayaran menjadi' : 'Nilai pembayaran'}</span>
                            <span className="font-bold text-lg tabular-nums">{formatRupiah(totalUlang)}</span>
                        </div>
                        {ulang.koreksi && <p className="text-xs text-gray-400 mt-1">Sebelumnya {formatRupiah(data?.total_aktual ?? 0)}.</p>}
                    </>
                )}
                <FormItem label={pengajuanHilang ? 'Catatan' : 'Catatan Perbaikan'} asterisk className="mt-3">
                    <Input textArea rows={2} maxLength={500} placeholder={pengajuanHilang ? 'Mis. pengajuan sebelumnya terhapus' : 'Mis. nota diganti yang sudah bertanda tangan, harga disesuaikan nota'} value={ulang.catatan} onChange={e => setUlang(p => ({ ...p, catatan: e.target.value }))} />
                </FormItem>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={() => setUlangOpen(false)}>Kembali</Button>
                <Button type="button" variant="solid" loading={submitting}
                    disabled={ulang.catatan.trim().length < 3 || !adaNotaUlang || !hargaUlangValid || biayaUlangSalah || overBatasUlang || (ulang.koreksi && totalUlang <= 0)}
                    onClick={submitAjukanUlang}>{pengajuanHilang ? 'Buat Pengajuan' : 'Ajukan Ulang'}</Button>
            </div>
        </Dialog>
        </>
    )
}
