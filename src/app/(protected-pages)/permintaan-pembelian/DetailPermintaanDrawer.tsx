'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Dialog, Drawer, FormItem, Input, Spinner, Tag, Tooltip, Upload, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogAktivitasKeuanganDialog, { PENGAJUAN_LABEL, PENGAJUAN_TAG } from '@/components/shared/LogAktivitasKeuanganDialog'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import LampiranPreview from '@/components/shared/LampiranPreview'
import { HiOutlinePencilAlt, HiOutlineTrash, HiOutlinePaperClip, HiOutlineClipboardList, HiOutlineExternalLink, HiOutlinePlus } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import { permintaanPembelianService, type PermintaanPembelian, type PermintaanItem, type TahapBukti, type Termin, type TerminPayload } from '@/services/permintaanPembelian.service'
import { barangService, type Barang } from '@/services/barang.service'
import { supplierService } from '@/services/supplier.service'
import { STATUS_LABEL, STATUS_TAG, JENIS_LABEL, TAHAP_LABEL, TIPE_LABEL, TIPE_TAG, bolehDiubah } from './status'
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
const LABEL = 'text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1'
const VALUE = 'text-sm font-medium text-gray-800 dark:text-gray-200'
const TH = 'py-2 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

export default function DetailPermintaanDrawer({ id, onClose, onRefresh }: { id: string | null; onClose: () => void; onRefresh: () => void }) {
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
    const [lebar, setLebar] = useState(720)
    const [submitting, setSubmitting] = useState(false)
    const [logOpen, setLogOpen] = useState(false)
    const [prosesOpen, setProsesOpen] = useState(false)
    const [hapusOpen, setHapusOpen] = useState(false)
    const [batalOpen, setBatalOpen] = useState(false)
    const [alasanBatal, setAlasanBatal] = useState('')
    const [dibeliOpen, setDibeliOpen] = useState(false)
    const [supplierOptions, setSupplierOptions] = useState<Option[]>([])
    const [barangOptions, setBarangOptions] = useState<Option[]>([])
    const [dibeli, setDibeli] = useState<{ id_supplier: string; tanggal: string; harga: Record<string, string>; barang: Record<string, string> }>({ id_supplier: '', tanggal: dayjs().format('YYYY-MM-DD'), harga: {}, barang: {} })
    const [terminRows, setTerminRows] = useState<TerminRow[]>([])
    const [notaDibeli, setNotaDibeli] = useState<File[]>([])
    const [realisasiOpen, setRealisasiOpen] = useState(false)
    const [realisasi, setRealisasi] = useState<{ id_supplier: string; tanggal: string; harga: Record<string, string> }>({ id_supplier: '', tanggal: dayjs().format('YYYY-MM-DD'), harga: {} })
    const [notaRealisasi, setNotaRealisasi] = useState<File[]>([])
    const [logTermin, setLogTermin] = useState<Termin | null>(null)
    const [terimaOpen, setTerimaOpen] = useState(false)
    const [terima, setTerima] = useState<{ tanggal: string; qty: Record<string, string>; keterangan: string }>({ tanggal: dayjs().format('YYYY-MM-DD'), qty: {}, keterangan: '' })
    const [buatCepatUntuk, setBuatCepatUntuk] = useState<string | null>(null)
    const [buatCepat, setBuatCepat] = useState({ nama: '', satuan: 'pcs' })

    useEffect(() => {
        const sesuaikan = () => setLebar(Math.min(720, window.innerWidth))
        sesuaikan()
        window.addEventListener('resize', sesuaikan)
        return () => window.removeEventListener('resize', sesuaikan)
    }, [])

    const muat = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            setData(await permintaanPembelianService.get(id))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { setData(null); muat() }, [muat])

    const jalankan = async (aksi: () => Promise<unknown>, sukses: string, tutup?: () => void, muatUlang = true) => {
        if (submitting) return
        setSubmitting(true)
        try {
            await aksi()
            toast.push(<Notification type="success" title={sukses} />)
            tutup?.()
            if (muatUlang) await muat()
            onRefresh()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const bukaDibeli = async () => {
        if (!data) return
        const harga: Record<string, string> = {}
        const barang: Record<string, string> = {}
        data.items.forEach(i => { harga[i.id_item] = String(i.harga_aktual ?? i.harga_estimasi); barang[i.id_item] = i.id_barang ?? '' })
        setDibeli({ id_supplier: data.id_supplier ?? '', tanggal: dayjs().format('YYYY-MM-DD'), harga, barang })
        setTerminRows(data.tipe === 'aset' ? [{ nama: '', nominal: '', jatuh_tempo: '' }] : [])
        setNotaDibeli([])
        try {
            const [sup, brg] = await Promise.all([supplierService.list({ limit: 999 }), data.tipe === 'aset' ? Promise.resolve(null) : barangService.list({ limit: 100 })])
            setSupplierOptions(sup.data.map(s => ({ value: s.id_supplier, label: s.nama })))
            if (brg) setBarangOptions(brg.data.map((b: Barang) => ({ value: b.id_barang, label: `${b.kode} · ${b.nama}` })))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        }
        setDibeliOpen(true)
    }

    const bukaRealisasi = async () => {
        if (!data) return
        const harga: Record<string, string> = {}
        data.items.forEach(i => { harga[i.id_item] = String(i.harga_aktual ?? i.harga_estimasi) })
        setRealisasi({ id_supplier: data.id_supplier ?? '', tanggal: dayjs().format('YYYY-MM-DD'), harga })
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
        if (!data) return
        const qty: Record<string, string> = {}
        data.items.forEach(i => { qty[i.id_item] = String(i.qty) })
        setTerima({ tanggal: dayjs().format('YYYY-MM-DD'), qty, keterangan: '' })
        setTerimaOpen(true)
    }

    const submitTerima = () => {
        if (!data) return
        jalankan(() => permintaanPembelianService.terima(data.id_permintaan, {
            tanggal_diterima: terima.tanggal, keterangan: terima.keterangan || undefined,
            items: data.items.map(i => ({ id_item: i.id_item, qty_diterima: Number(terima.qty[i.id_item]) || 0 })),
        }), 'Penerimaan dikonfirmasi', () => setTerimaOpen(false))
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
    const bolehBatal = !!data && (pengadaan ? ['menunggu_approval', 'disetujui', 'diproses'].includes(data.status) : pengaju && ['menunggu_approval', 'disetujui'].includes(data.status))
    const bolehDibeli = !!data && pengadaan && data.status === 'diproses' && !sparepart
    const bolehTerima = !!data && data.status === 'dibeli' && (pengaju || pengadaan) && !sparepart && !aset
    const bolehDaftarUnit = !!data && aset && data.status === 'dibeli'
    const bolehRealisasiSparepart = !!data && sparepart && ['disetujui', 'diproses'].includes(data.status) && (pengadaan || (pengaju && data.boleh_realisasi_mandiri))
    const tahapUpload: TahapBukti | null = !data ? null
        : sparepart ? (['disetujui', 'diproses'].includes(data.status) ? 'pembelian' : bolehDiubah(data.status) ? 'pengajuan' : null)
        : data.status === 'diproses' ? 'pembelian'
        : data.status === 'dibeli' ? (aset ? null : 'penerimaan')
        : bolehDiubah(data.status) ? 'pengajuan'
        : null
    const tampilKartuPs = !!data && sparepart && !!ps && ['diproses', 'diterima', 'selesai'].includes(data.status)
    const daftarTermin = data?.termin ?? []
    const totalAktualDibeli = (data?.items ?? []).reduce((s, i) => s + i.qty * (Number(dibeli.harga[i.id_item]) || 0), 0)
    const totalAktualRealisasi = (data?.items ?? []).reduce((s, i) => s + i.qty * (Number(realisasi.harga[i.id_item]) || 0), 0)
    const overBatasRealisasi = !pengadaan && data?.batas_mandiri != null && totalAktualRealisasi > data.batas_mandiri
    const hargaRealisasiValid = (data?.items ?? []).every(i => realisasi.harga[i.id_item] !== '' && Number(realisasi.harga[i.id_item]) >= 0)
    const totalTermin = terminRows.reduce((s, r) => s + (Number(r.nominal) || 0), 0)
    const sisaTermin = Math.round((totalAktualDibeli - totalTermin) * 100) / 100
    const terminValid = terminRows.length > 0 && terminRows.every(r => r.nama.trim() !== '' && (Number(r.nominal) || 0) > 0) && sisaTermin === 0
    const bukaArmadaBaru = (idItem: string) => data && router.push(`${ROUTES.ARMADA_BARU}?id_permintaan=${data.id_permintaan}&id_item=${idItem}`)

    return (
        <>
        <Drawer isOpen={!!id} width={lebar} onClose={onClose} onRequestClose={onClose} bodyClass="p-0"
            title={
                <div className="flex flex-col">
                    <span className="font-semibold text-base">{data?.judul ?? 'Detail Permintaan'}</span>
                    <span className="text-xs text-gray-500 font-mono">{data?.nomor_permintaan ?? '—'}</span>
                </div>
            }>
            {loading || !data ? (
                <div className="py-16 text-center"><Spinner className="inline-block" size={32} /></div>
            ) : (
                <div className="p-5 flex flex-col gap-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <Tag className={`text-xs font-semibold ${STATUS_TAG[data.status]}`}>{STATUS_LABEL[data.status]}</Tag>
                        {data.tipe !== 'umum' && <Tag className={`text-xs font-semibold ${TIPE_TAG[data.tipe]}`}>{TIPE_LABEL[data.tipe]}</Tag>}
                        <div className="flex-1" />
                        {!aset && <Tooltip title="Log Aktivitas Pembayaran"><Button size="sm" variant="default" icon={<HiOutlineClipboardList />} onClick={() => setLogOpen(true)} /></Tooltip>}
                        {tahapUpload && (pengaju || kelola) && (
                            <Upload accept=".jpg,.jpeg,.png,.webp,.pdf" showList={false} multiple disabled={submitting} onChange={(semua, sebelumnya) => handleUpload(semua.slice(sebelumnya.length), tahapUpload)}>
                                <Tooltip title={`Unggah ${TAHAP_LABEL[tahapUpload]}`}><Button type="button" size="sm" variant="default" icon={<HiOutlinePaperClip />} loading={submitting} /></Tooltip>
                            </Upload>
                        )}
                        {bolehEdit && (
                            <>
                                <Tooltip title="Hapus"><Button size="sm" variant="default" icon={<HiOutlineTrash />} customColorClass={() => 'text-red-500 hover:border-red-300 hover:ring-red-300'} onClick={() => setHapusOpen(true)} /></Tooltip>
                                <Tooltip title="Edit"><Button size="sm" variant="default" icon={<HiOutlinePencilAlt />} onClick={() => router.push(ROUTES.PERMINTAAN_PEMBELIAN_EDIT(data.id_permintaan))} /></Tooltip>
                            </>
                        )}
                        {bolehBatal && <Button size="sm" variant="default" onClick={() => { setAlasanBatal(''); setBatalOpen(true) }}>Batalkan</Button>}
                        {pengadaan && data.status === 'disetujui' && <Button size="sm" variant="solid" onClick={() => setProsesOpen(true)}>Mulai Proses</Button>}
                        {bolehDibeli && <Button size="sm" variant="solid" onClick={bukaDibeli}>Tandai Dibeli</Button>}
                        {bolehRealisasiSparepart && <Button size="sm" variant="solid" onClick={bukaRealisasi}>Catat Realisasi</Button>}
                        {bolehTerima && <Button size="sm" variant="solid" onClick={bukaTerima}>Konfirmasi Penerimaan</Button>}
                    </div>

                    {sparepart && data.batas_mandiri !== null && ['disetujui', 'diproses'].includes(data.status) && (
                        <div className={`rounded-xl border px-4 py-3 text-sm ${data.boleh_realisasi_mandiri ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                            {data.boleh_realisasi_mandiri
                                ? `Nilainya di bawah batas mandiri (${formatRupiah(data.batas_mandiri)}) — pengaju boleh beli sendiri lalu catat realisasi di sini.`
                                : `Di atas batas mandiri (${formatRupiah(data.batas_mandiri)}) — realisasi hanya bisa dicatat oleh tim Pengadaan.`}
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

                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div><p className={LABEL}>Pemohon</p><p className={VALUE}>{data.username_pengaju ?? '—'}</p></div>
                        <div><p className={LABEL}>Departemen</p><p className={VALUE}>{data.nama_departemen ?? '—'}</p></div>
                        <div><p className={LABEL}>Tanggal Permintaan</p><p className={VALUE}>{dayjs(data.tanggal_permintaan).format('DD MMM YYYY')}</p></div>
                        <div><p className={LABEL}>Dibutuhkan</p><p className={VALUE}>{data.tanggal_dibutuhkan ? dayjs(data.tanggal_dibutuhkan).format('DD MMM YYYY') : '—'}</p></div>
                        <div><p className={LABEL}>Supplier</p><p className={VALUE}>{data.nama_supplier ?? '—'}</p></div>
                        <div><p className={LABEL}>Tanggal Pembelian</p><p className={VALUE}>{data.tanggal_pembelian ? dayjs(data.tanggal_pembelian).format('DD MMM YYYY') : '—'}</p></div>
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
                        <div className="col-span-2"><p className={LABEL}>Alasan Permintaan</p><p className="text-sm whitespace-pre-line">{data.alasan}</p></div>
                        {data.alasan_ditolak && <div className="col-span-2"><p className={LABEL}>Alasan Ditolak</p><p className="text-sm text-red-500">{data.alasan_ditolak}</p></div>}
                        {data.alasan_batal && <div className="col-span-2"><p className={LABEL}>Alasan Dibatalkan</p><p className="text-sm text-red-500">{data.alasan_batal}</p></div>}
                    </div>

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
                                            <td className="py-2 px-3"><p className="font-medium">{namaUnit(i)}</p><p className="text-xs text-gray-400">{i.nama_jenis_kendaraan ?? '—'}{i.spesifikasi ? ` · ${i.spesifikasi}` : ''}</p></td>
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
                                            <td className="py-2 px-3"><p className="font-medium">{i.nama_item}</p><p className="text-xs text-gray-400">{i.kode_sparepart ?? i.kode_barang ?? (i.jenis === 'barang' ? 'belum ditautkan ke master' : '')}{i.spesifikasi ? ` · ${i.spesifikasi}` : ''}</p></td>
                                            <td className="py-2 px-3 text-right whitespace-nowrap">{formatNum(i.qty)} {i.satuan}</td>
                                            <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(i.harga_estimasi)}</td>
                                            <td className="py-2 px-3 text-right whitespace-nowrap">{i.harga_aktual !== null ? formatRupiah(i.harga_aktual) : '—'}</td>
                                            <td className="py-2 px-3 text-right">{i.qty_diterima !== null ? formatNum(i.qty_diterima) : '—'}</td>
                                            <td className="py-2 px-3 text-right whitespace-nowrap font-semibold">{formatRupiah(i.subtotal_aktual ?? i.subtotal_estimasi)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {aset && daftarTermin.length > 0 && (
                        <div>
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
                                        </div>
                                        <span className="text-sm font-semibold whitespace-nowrap">{formatRupiah(t.nominal)}</span>
                                        <Tag className={`text-[10px] font-semibold ${TERMIN_TAG[t.status] ?? TERMIN_TAG.menunggu}`}>{TERMIN_LABEL[t.status] ?? t.status}</Tag>
                                        {t.pengajuan && t.status !== 'ditransfer' && (
                                            <Tag className={`text-[10px] font-semibold ${PENGAJUAN_TAG[t.pengajuan.status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'}`}>{PENGAJUAN_LABEL[t.pengajuan.status] ?? t.pengajuan.status}</Tag>
                                        )}
                                        <Tooltip title="Log Aktivitas Termin"><Button size="xs" variant="default" icon={<HiOutlineClipboardList />} onClick={() => setLogTermin(t)} /></Tooltip>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(['pengajuan', 'pembelian', 'penerimaan'] as TahapBukti[]).map(tahap => {
                        const daftar = data.bukti.filter(b => b.tahap === tahap)
                        if (daftar.length === 0) return null
                        return (
                            <div key={tahap}>
                                <p className={`${LABEL} mb-2`}>{TAHAP_LABEL[tahap]} ({daftar.length})</p>
                                <div className="flex flex-wrap gap-2">
                                    {daftar.map(b => (
                                        <div key={b.id_bukti} className="flex items-center gap-1">
                                            <a href={b.url_file} onClick={klik(b.url_file, b.nama_asli, b.nama_asli.replace(/\.[^.]+$/, ''))} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"><HiOutlinePaperClip /> {b.nama_asli}</a>
                                            {(pengaju || kelola) && <span className="text-red-400 cursor-pointer text-xs" onClick={() => jalankan(() => permintaanPembelianService.hapusBukti(data.id_permintaan, b.id_bukti), 'Lampiran dihapus')}>hapus</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </Drawer>

        <LogAktivitasKeuanganDialog isOpen={logOpen && !aset} info={data?.pengajuan_keuangan} judul="Log Aktivitas — Pembayaran PR"
            emptyMessage={sparepart ? 'Pengajuan pembayaran dibuat setelah realisasi Pembelian Sparepart.' : 'Pengajuan pembayaran dibuat setelah Pengadaan menandai Dibeli.'} onClose={() => setLogOpen(false)} />

        <LogAktivitasKeuanganDialog isOpen={!!logTermin} info={logTermin?.pengajuan} judul={logTermin ? `Log Aktivitas — Termin ${logTermin.urutan}: ${logTermin.nama}` : 'Log Aktivitas'}
            emptyMessage="Pengajuan pembayaran termin ini belum tersedia." onClose={() => setLogTermin(null)} />

        <ConfirmDialog isOpen={prosesOpen} type="info" title="Mulai Proses Pengadaan" confirmText="Ya, Proses" cancelText="Batal"
            confirmButtonProps={{ loading: submitting }} onClose={() => setProsesOpen(false)} onCancel={() => setProsesOpen(false)}
            onConfirm={() => data && jalankan(() => permintaanPembelianService.proses(data.id_permintaan), 'Permintaan mulai diproses', () => setProsesOpen(false))}>
            <p>{sparepart ? `Ambil PR ${data?.nomor_permintaan} untuk diproses? Dokumen Pembelian Sparepart akan dibuat otomatis.` : `Ambil PR ${data?.nomor_permintaan} untuk diproses (cari supplier & harga)?`}</p>
        </ConfirmDialog>

        <ConfirmDialog isOpen={hapusOpen} type="danger" title="Hapus Permintaan" confirmText="Ya, Hapus" cancelText="Batal"
            confirmButtonProps={{ loading: submitting }} onClose={() => setHapusOpen(false)} onCancel={() => setHapusOpen(false)}
            onConfirm={() => data && jalankan(() => permintaanPembelianService.remove(data.id_permintaan), 'Permintaan dihapus', () => { setHapusOpen(false); onClose() }, false)}>
            <p>Hapus PR {data?.nomor_permintaan}? Tindakan ini tidak dapat dibatalkan.</p>
        </ConfirmDialog>

        <ConfirmDialog isOpen={batalOpen} type="danger" title="Batalkan Permintaan" confirmText="Ya, Batalkan" cancelText="Kembali"
            confirmButtonProps={{ loading: submitting, disabled: !alasanBatal.trim() }} onClose={() => setBatalOpen(false)} onCancel={() => setBatalOpen(false)}
            onConfirm={() => data && jalankan(() => permintaanPembelianService.batal(data.id_permintaan, alasanBatal.trim()), 'Permintaan dibatalkan', () => setBatalOpen(false))}>
            {sparepart && ps && data?.status === 'diproses' && <p className="text-sm text-amber-600 mb-2">Pembelian Sparepart {ps.nomor_pengajuan} akan ikut dibatalkan (ditolak).</p>}
            <p className="text-sm font-semibold mb-1">Alasan pembatalan <span className="text-red-500">*</span></p>
            <Input textArea rows={3} value={alasanBatal} onChange={e => setAlasanBatal(e.target.value)} />
        </ConfirmDialog>

        <Dialog isOpen={dibeliOpen} onRequestClose={() => setDibeliOpen(false)} onClose={() => setDibeliOpen(false)} width={680}>
            <h5 className="font-bold mb-1">Tandai Dibeli</h5>
            <p className="text-xs text-gray-400 mb-4">{aset ? 'Isi supplier, harga aktual per unit, rincian termin pembayaran, dan unggah nota/PO supplier. Satu pengajuan pengeluaran (kategori Pembelian Aset) dibuat per termin.' : 'Isi supplier, harga aktual, dan unggah nota/PO supplier. Item barang yang belum ada di Master Barang wajib ditautkan/didaftarkan.'}</p>
            <div className="grid grid-cols-2 gap-3">
                <FormItem label="Supplier" asterisk><Select<Option> isSearchable options={supplierOptions} value={supplierOptions.find(o => o.value === dibeli.id_supplier) ?? null} onChange={opt => setDibeli(p => ({ ...p, id_supplier: (opt as Option | null)?.value ?? '' }))} /></FormItem>
                <FormItem label="Tanggal Pembelian" asterisk><DatePicker inputFormat="DD/MM/YYYY" value={dayjs(dibeli.tanggal).toDate()} onChange={d => setDibeli(p => ({ ...p, tanggal: d ? dayjs(d).format('YYYY-MM-DD') : '' }))} /></FormItem>
            </div>
            <FormItem label="Nota / PO Supplier" asterisk={jumlahNotaTersimpan === 0} extra={jumlahNotaTersimpan > 0 ? <span className="text-xs text-gray-400">{jumlahNotaTersimpan} file sudah tersimpan</span> : undefined}>
                <Upload accept=".jpg,.jpeg,.png,.webp,.pdf" multiple showList={false} fileList={notaDibeli}
                    beforeUpload={baru => {
                        const daftar = Array.from(baru ?? [])
                        if (notaDibeli.length + daftar.length > 10) return 'Maksimal 10 file'
                        const kebesaran = daftar.find(f => f.size > 5 * 1024 * 1024)
                        if (kebesaran) return `File ${kebesaran.name} melebihi 5MB`
                        return true
                    }}
                    onChange={files => setNotaDibeli(files)}>
                    <Button type="button" variant="default" size="sm" icon={<HiOutlinePaperClip />}>Pilih file nota / PO (maks. 10 × 5MB)</Button>
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
            <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-1">
                {data?.items.map(i => (
                    <div key={i.id_item} className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                        <p className="font-medium text-sm">{aset ? namaUnit(i) : i.nama_item} <span className="text-xs text-gray-400">× {formatNum(i.qty)} {i.satuan}</span></p>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <FormItem label={aset ? 'Harga Aktual / unit' : 'Harga Aktual / satuan'} className="mb-0"><Input prefix="Rp" value={dibeli.harga[i.id_item] ? formatNum(Number(dibeli.harga[i.id_item])) : ''} onChange={e => setDibeli(p => ({ ...p, harga: { ...p.harga, [i.id_item]: e.target.value.replace(/\D/g, '') } }))} /></FormItem>
                            {i.jenis === 'barang' && (
                                <FormItem label="Master Barang" className="mb-0" extra={<span className="text-xs text-blue-600 cursor-pointer" onClick={() => { setBuatCepatUntuk(i.id_item); setBuatCepat({ nama: i.nama_item, satuan: i.satuan }) }}>+ daftarkan baru</span>}>
                                    <Select<Option> isSearchable options={barangOptions} value={barangOptions.find(o => o.value === dibeli.barang[i.id_item]) ?? null} onChange={opt => setDibeli(p => ({ ...p, barang: { ...p.barang, [i.id_item]: (opt as Option | null)?.value ?? '' } }))} />
                                </FormItem>
                            )}
                        </div>
                    </div>
                ))}
                {aset && (
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
                <Button type="button" variant="plain" onClick={() => setDibeliOpen(false)}>Batal</Button>
                <Button type="button" variant="solid" loading={submitting} disabled={!dibeli.id_supplier || !dibeli.tanggal || !adaNota || (aset && !terminValid)} onClick={submitDibeli}>Simpan</Button>
            </div>
        </Dialog>

        <Dialog isOpen={realisasiOpen} onRequestClose={() => setRealisasiOpen(false)} onClose={() => setRealisasiOpen(false)} width={640}>
            <h5 className="font-bold mb-1">Catat Realisasi</h5>
            <p className="text-xs text-gray-400 mb-4">Isi tanggal pembelian, supplier (opsional), harga aktual per item, dan unggah nota pembelian.</p>
            {overBatasRealisasi && (
                <p className="text-sm text-red-500 mb-3">Total aktual {formatRupiah(totalAktualRealisasi)} melebihi batas mandiri {formatRupiah(data?.batas_mandiri ?? 0)} — realisasi harus dilakukan tim Pengadaan.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
                <FormItem label="Tanggal Pembelian" asterisk><DatePicker inputFormat="DD/MM/YYYY" value={dayjs(realisasi.tanggal).toDate()} onChange={d => setRealisasi(p => ({ ...p, tanggal: d ? dayjs(d).format('YYYY-MM-DD') : '' }))} /></FormItem>
                <FormItem label="Supplier (opsional)"><Select<Option> isSearchable isClearable options={supplierOptions} value={supplierOptions.find(o => o.value === realisasi.id_supplier) ?? null} onChange={opt => setRealisasi(p => ({ ...p, id_supplier: (opt as Option | null)?.value ?? '' }))} /></FormItem>
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
            <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mt-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Aktual</span>
                <span className="font-bold text-lg tabular-nums">{formatRupiah(totalAktualRealisasi)}</span>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={() => setRealisasiOpen(false)}>Batal</Button>
                <Button type="button" variant="solid" loading={submitting} disabled={!realisasi.tanggal || !adaNotaRealisasi || overBatasRealisasi || !hargaRealisasiValid} onClick={submitRealisasi}>Simpan</Button>
            </div>
        </Dialog>

        <Dialog isOpen={!!buatCepatUntuk} onRequestClose={() => setBuatCepatUntuk(null)} onClose={() => setBuatCepatUntuk(null)} width={400}>
            <h5 className="font-bold mb-4">Daftarkan ke Master Barang</h5>
            <FormItem label="Nama" asterisk><Input value={buatCepat.nama} onChange={e => setBuatCepat(p => ({ ...p, nama: e.target.value }))} /></FormItem>
            <FormItem label="Satuan" asterisk><Input value={buatCepat.satuan} onChange={e => setBuatCepat(p => ({ ...p, satuan: e.target.value }))} /></FormItem>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={() => setBuatCepatUntuk(null)}>Batal</Button>
                <Button type="button" variant="solid" disabled={!buatCepat.nama.trim() || !buatCepat.satuan.trim()} onClick={submitBuatCepat}>Daftarkan</Button>
            </div>
        </Dialog>

        <Dialog isOpen={terimaOpen} onRequestClose={() => setTerimaOpen(false)} onClose={() => setTerimaOpen(false)} width={560}>
            <h5 className="font-bold mb-1">Konfirmasi Penerimaan</h5>
            <p className="text-xs text-gray-400 mb-4">Isi qty yang benar-benar diterima. Stok barang bertambah sesuai qty ini; jasa tidak menyentuh stok. Konfirmasi hanya bisa sekali.</p>
            <FormItem label="Tanggal Diterima" asterisk><DatePicker inputFormat="DD/MM/YYYY" value={dayjs(terima.tanggal).toDate()} onChange={d => setTerima(p => ({ ...p, tanggal: d ? dayjs(d).format('YYYY-MM-DD') : '' }))} /></FormItem>
            <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
                {data?.items.map(i => (
                    <div key={i.id_item} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
                        <span className="text-sm">{i.nama_item} <span className="text-xs text-gray-400">(diminta {formatNum(i.qty)} {i.satuan})</span></span>
                        <Input className="w-24" type="number" min={0} max={i.qty} value={terima.qty[i.id_item] ?? ''} onChange={e => setTerima(p => ({ ...p, qty: { ...p.qty, [i.id_item]: e.target.value } }))} />
                    </div>
                ))}
            </div>
            <FormItem label="Keterangan" className="mt-3"><Input textArea rows={2} value={terima.keterangan} onChange={e => setTerima(p => ({ ...p, keterangan: e.target.value }))} /></FormItem>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={() => setTerimaOpen(false)}>Batal</Button>
                <Button type="button" variant="solid" loading={submitting} disabled={!terima.tanggal} onClick={submitTerima}>Konfirmasi</Button>
            </div>
        </Dialog>
        </>
    )
}
