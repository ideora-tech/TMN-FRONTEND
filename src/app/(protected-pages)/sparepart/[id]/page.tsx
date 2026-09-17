'use client'
import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, Button, Dialog, FormItem, Input, Tag, Tooltip, toast, Notification, Spinner, Pagination } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlinePencilAlt, HiPlusCircle, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { sparepartService, Sparepart, SparepartMutasi, RiwayatHargaSparepart, SATUAN_SPAREPART_OPTIONS, SatuanSparepart } from '@/services/sparepart.service'
import { kategoriSparepartService, KategoriSparepart } from '@/services/kategoriSparepart.service'
import { FotoSparepartCard } from '../FotoSparepart'

const MUTASI_CLASS: Record<string, string> = {
    masuk:       'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    keluar:      'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
    penyesuaian: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
}

const SUMBER_HARGA: Record<string, { label: string; className: string }> = {
    manual:  { label: 'Manual',       className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
    import:  { label: 'Import Excel', className: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' },
    migrasi: { label: 'Data awal',    className: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300' },
}

const TAG_NAIK  = 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400'
const TAG_TURUN = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
const TAG_ABU   = 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'

const RIWAYAT_HARGA_PAGE_SIZE = 20

const formatPersen = (p: number) => `${Math.abs(p).toFixed(1).replace(/\.0$/, '').replace('.', ',')}%`

type SatuanOption = { value: SatuanSparepart; label: string }

const TAHUN_SEKARANG = new Date().getFullYear()
const tahunValid = (t: string) => /^\d{4}$/.test(t) && Number(t) >= 1900 && Number(t) <= TAHUN_SEKARANG + 1
const satuanDariData = (s: string): SatuanSparepart | null =>
    SATUAN_SPAREPART_OPTIONS.some(o => o.value === s) ? (s as SatuanSparepart) : null

type FormState = {
    kode: string
    nama: string
    serial_number: string
    merek: string
    tahun: string
    id_kategori_sparepart: string
    satuan: SatuanSparepart | null
    harga_standar: string
    keterangan_harga: string
    aktif: boolean
}

const formDariSparepart = (sp: Sparepart): FormState => ({
    kode: sp.kode,
    nama: sp.nama,
    serial_number: sp.serial_number ?? '',
    merek: sp.merek ?? '',
    tahun: sp.tahun != null ? String(sp.tahun) : '',
    id_kategori_sparepart: sp.id_kategori_sparepart ?? '',
    satuan: satuanDariData(sp.satuan),
    harga_standar: String(sp.harga_standar),
    keterangan_harga: '',
    aktif: sp.aktif,
})

export default function SparepartDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [sparepart, setSparepart] = useState<Sparepart | null>(null)
    const [loading, setLoading]     = useState(true)
    const [editing, setEditing]     = useState(false)
    const [form, setForm]           = useState<FormState>({ kode: '', nama: '', serial_number: '', merek: '', tahun: '', id_kategori_sparepart: '', satuan: null, harga_standar: '', keterangan_harga: '', aktif: true })
    const [errors, setErrors]       = useState<Record<string, string>>({})
    const [kategoriOptions, setKategoriOptions] = useState<{ value: string; label: string }[]>([])
    const [saving, setSaving]       = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting]     = useState(false)

    const [mutasi, setMutasi]             = useState<SparepartMutasi[]>([])
    const [mutasiLoading, setMutasiLoading] = useState(false)

    const [riwayatHarga, setRiwayatHarga]               = useState<RiwayatHargaSparepart[]>([])
    const [riwayatHargaLoading, setRiwayatHargaLoading] = useState(false)
    const [riwayatHargaPage, setRiwayatHargaPage]       = useState(1)
    const [riwayatHargaTotal, setRiwayatHargaTotal]     = useState(0)

    const [stokOpen, setStokOpen]   = useState(false)
    const [stokForm, setStokForm]   = useState({ qty: '', keterangan: '' })
    const [stokSubmitted, setStokSubmitted] = useState(false)
    const [stokSaving, setStokSaving] = useState(false)

    const fetchSparepart = useCallback(async () => {
        try {
            const sp = await sparepartService.get(id)
            setSparepart(sp)
            setForm(formDariSparepart(sp))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [id])

    const fetchMutasi = useCallback(async () => {
        setMutasiLoading(true)
        try {
            const res = await sparepartService.listMutasi(id, 1, 20)
            setMutasi(res.data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMutasiLoading(false)
        }
    }, [id])

    useEffect(() => {
        kategoriSparepartService.list(1, 100)
            .then(res => setKategoriOptions(res.data.filter(k => k.aktif).map((k: KategoriSparepart) => ({ value: k.id_kategori_sparepart, label: k.nama }))))
            .catch(() => {})
    }, [])

    const fetchRiwayatHarga = useCallback(async () => {
        setRiwayatHargaLoading(true)
        try {
            const res = await sparepartService.listRiwayatHarga(id, riwayatHargaPage, RIWAYAT_HARGA_PAGE_SIZE)
            setRiwayatHarga(res.data)
            setRiwayatHargaTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setRiwayatHargaLoading(false)
        }
    }, [id, riwayatHargaPage])

    useEffect(() => { fetchSparepart() }, [fetchSparepart])
    useEffect(() => { fetchMutasi() }, [fetchMutasi])
    useEffect(() => { fetchRiwayatHarga() }, [fetchRiwayatHarga])

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.nama.trim()) e.nama = 'Nama wajib diisi'
        if (!form.serial_number.trim()) e.serial_number = 'Serial number wajib diisi'
        if (form.tahun && !tahunValid(form.tahun)) e.tahun = 'Tahun tidak valid'
        if (!form.satuan) e.satuan = 'Pilih satuan'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const hargaFormBerubah = sparepart != null && (Number(form.harga_standar) || 0) !== Number(sparepart.harga_standar)

    const handleSave = async () => {
        if (!validate() || !form.satuan) return
        setSaving(true)
        try {
            const updated = await sparepartService.update(id, {
                kode: form.kode,
                nama: form.nama,
                serial_number: form.serial_number.trim(),
                merek: form.merek.trim() || null,
                tahun: form.tahun ? Number(form.tahun) : null,
                id_kategori_sparepart: form.id_kategori_sparepart || null,
                satuan: form.satuan,
                harga_standar: Number(form.harga_standar) || 0,
                ...(hargaFormBerubah ? { keterangan_harga: form.keterangan_harga.trim() || null } : {}),
                aktif: form.aktif,
            })
            setSparepart(updated)
            setForm(formDariSparepart(updated))
            setEditing(false)
            setErrors({})
            toast.push(<Notification type="success" title="Spare part berhasil diperbarui" />)
            if (hargaFormBerubah) {
                if (riwayatHargaPage === 1) fetchRiwayatHarga()
                else setRiwayatHargaPage(1)
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await sparepartService.delete(id)
            toast.push(<Notification type="success" title="Spare part berhasil dihapus" />)
            router.push(ROUTES.SPAREPART)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteOpen(false)
            setDeleting(false)
        }
    }

    const handlePenyesuaianStok = async () => {
        setStokSubmitted(true)
        const qty = Number(stokForm.qty)
        if (!qty || !stokForm.keterangan.trim()) return
        setStokSaving(true)
        try {
            const updated = await sparepartService.penyesuaianStok(id, {
                jenis: 'penyesuaian',
                qty,
                keterangan: stokForm.keterangan.trim(),
            })
            setSparepart(updated)
            setStokOpen(false)
            setStokForm({ qty: '', keterangan: '' })
            setStokSubmitted(false)
            toast.push(<Notification type="success" title="Penyesuaian stok tersimpan" />)
            fetchMutasi()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setStokSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!sparepart) return <div className="p-6 text-red-500">Spare part tidak ditemukan.</div>

    const hargaBeli = sparepart.harga_beli_terakhir ?? null
    const hargaStandarAngka = Number(sparepart.harga_standar) || 0
    const selisihBeliPersen = hargaBeli && hargaStandarAngka > 0 && Number(hargaBeli.harga) !== hargaStandarAngka
        ? ((Number(hargaBeli.harga) - hargaStandarAngka) / hargaStandarAngka) * 100
        : null

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.SPAREPART)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{sparepart.nama}</h3>
                    <p className="text-gray-500 text-sm mt-0.5 font-mono">{sparepart.kode}</p>
                </div>
            </div>

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Informasi Spare Part</p>
                    <div className="flex gap-2">
                        {!editing && (
                            <>
                                <Tooltip title="Hapus">
                                    <Button size="sm" variant="default" icon={<HiOutlineTrash />}
                                        customColorClass={() => 'text-red-500 hover:border-red-300 hover:ring-red-300'}
                                        onClick={() => setDeleteOpen(true)} />
                                </Tooltip>
                                <Tooltip title="Edit">
                                    <Button size="sm" variant="solid" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)} />
                                </Tooltip>
                                <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={() => { setStokForm({ qty: '', keterangan: '' }); setStokSubmitted(false); setStokOpen(true) }}>Penyesuaian Stok</Button>
                            </>
                        )}
                    </div>
                </div>

                {!editing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                        {([
                            { label: 'Kode',          value: <span className="font-mono">{sparepart.kode}</span> },
                            { label: 'Nama',          value: sparepart.nama },
                            { label: 'Serial Number', value: sparepart.serial_number ? <span className="font-mono">{sparepart.serial_number}</span> : <span className="text-gray-400">—</span> },
                            { label: 'Merek',         value: sparepart.merek || <span className="text-gray-400">—</span> },
                            { label: 'Tahun',         value: sparepart.tahun != null ? sparepart.tahun : <span className="text-gray-400">—</span> },
                            { label: 'Kategori', value: sparepart.nama_kategori_sparepart ?? <span className="text-gray-400">—</span> },
                            { label: 'Satuan',        value: sparepart.satuan },
                            { label: 'Harga Standar', value: formatRupiah(sparepart.harga_standar) },
                            {
                                label: 'Harga Beli Terakhir',
                                value: hargaBeli ? (
                                    <>
                                        <span className="inline-flex items-center gap-2 flex-wrap">
                                            {formatRupiah(hargaBeli.harga)}
                                            {selisihBeliPersen != null && (
                                                <Tag className={`text-xs font-semibold ${selisihBeliPersen > 0
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                                    : TAG_TURUN}`}>
                                                    {selisihBeliPersen > 0 ? 'lebih mahal' : 'lebih murah'} {formatPersen(selisihBeliPersen)}
                                                </Tag>
                                            )}
                                        </span>
                                        <span className="block text-xs text-gray-400 font-normal mt-0.5">
                                            {dayjs(hargaBeli.tanggal).format('DD MMM YYYY')}
                                            {hargaBeli.nomor_pengajuan && (
                                                <>
                                                    {' · '}
                                                    {hargaBeli.id_pembelian ? (
                                                        <Link href={ROUTES.PEMBELIAN_SPAREPART_DETAIL(hargaBeli.id_pembelian)}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="text-blue-500 hover:underline font-mono">
                                                            {hargaBeli.nomor_pengajuan}
                                                        </Link>
                                                    ) : (
                                                        <span className="font-mono">{hargaBeli.nomor_pengajuan}</span>
                                                    )}
                                                </>
                                            )}
                                            {hargaBeli.nama_supplier && <>{' · '}{hargaBeli.nama_supplier}</>}
                                        </span>
                                    </>
                                ) : <span className="text-gray-400">—</span>,
                            },
                            {
                                label: 'Stok Saat Ini',
                                value: (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        sparepart.stok <= 0 ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                                        : sparepart.stok < 5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                    }`}>
                                        {formatNum(sparepart.stok)} {sparepart.satuan}
                                    </span>
                                ),
                            },
                            {
                                label: 'Status',
                                value: (
                                    <Tag className={sparepart.aktif
                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                        : 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400'}>
                                        {sparepart.aktif ? 'Aktif' : 'Nonaktif'}
                                    </Tag>
                                ),
                            },
                        ]).map(({ label, value }) => (
                            <div key={label}>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Kode">
                                <Input value={form.kode} disabled />
                            </FormItem>
                            <FormItem label="Nama" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                                <Input value={form.nama} invalid={!!errors.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Serial Number" asterisk invalid={!!errors.serial_number} errorMessage={errors.serial_number}>
                                <Input placeholder="Nomor seri / part number" value={form.serial_number} invalid={!!errors.serial_number}
                                    onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Merek">
                                <Input placeholder="Merek spare part" value={form.merek}
                                    onChange={e => setForm(p => ({ ...p, merek: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Tahun" invalid={!!errors.tahun} errorMessage={errors.tahun}>
                                <Input placeholder={String(TAHUN_SEKARANG)} inputMode="numeric" maxLength={4}
                                    value={form.tahun} invalid={!!errors.tahun}
                                    onChange={e => setForm(p => ({ ...p, tahun: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
                            </FormItem>
                            <FormItem label="Kategori">
                                <Select isSearchable isClearable placeholder="Pilih kategori (opsional)..."
                                    options={kategoriOptions}
                                    value={kategoriOptions.find(o => o.value === form.id_kategori_sparepart) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, id_kategori_sparepart: (opt as { value: string } | null)?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Satuan" asterisk invalid={!!errors.satuan} errorMessage={errors.satuan}>
                                <Select<SatuanOption> isSearchable={false} placeholder="Pilih satuan..."
                                    options={SATUAN_SPAREPART_OPTIONS}
                                    value={SATUAN_SPAREPART_OPTIONS.find(o => o.value === form.satuan) ?? null}
                                    onChange={opt => opt && setForm(p => ({ ...p, satuan: (opt as SatuanOption).value }))} />
                            </FormItem>
                            <FormItem label="Harga Standar (Rp)">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.harga_standar ? formatNum(Number(form.harga_standar)) : ''}
                                    onChange={e => setForm(p => ({ ...p, harga_standar: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            {hargaFormBerubah && (
                                <FormItem label="Alasan Perubahan Harga (opsional)">
                                    <Input maxLength={200} placeholder="Contoh: Penyesuaian harga supplier baru"
                                        value={form.keterangan_harga}
                                        onChange={e => setForm(p => ({ ...p, keterangan_harga: e.target.value }))} />
                                </FormItem>
                            )}
                            <FormItem label="Status">
                                <Select isSearchable={false}
                                    options={[{ value: true, label: 'Aktif' }, { value: false, label: 'Nonaktif' }]}
                                    value={{ value: form.aktif, label: form.aktif ? 'Aktif' : 'Nonaktif' }}
                                    onChange={opt => opt && setForm(p => ({ ...p, aktif: (opt as { value: boolean }).value }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setErrors({}); setForm(formDariSparepart(sparepart)) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                    </form>
                )}
            </Card>

            <FotoSparepartCard sparepart={sparepart} onChange={setSparepart} />

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Harga Standar</p>
                    <div className="flex items-center gap-3">
                        {riwayatHargaLoading && <Spinner size={20} />}
                        <p className="text-sm text-gray-500">
                            Harga standar saat ini:{' '}
                            <span className="font-bold text-gray-800 dark:text-gray-100">{formatRupiah(sparepart.harga_standar)}</span>
                        </p>
                    </div>
                </div>
                {riwayatHarga.length === 0 && !riwayatHargaLoading ? (
                    <p className="text-gray-400 text-sm py-4 text-center">Belum ada riwayat harga</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Tanggal</th>
                                    <th className="py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Harga Lama</th>
                                    <th className="py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Harga Baru</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Perubahan</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Sumber</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Keterangan</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Oleh</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {riwayatHarga.map(r => {
                                    const selisih = r.harga_lama == null ? null : (r.selisih ?? Number(r.harga_baru) - Number(r.harga_lama))
                                    const sumber = SUMBER_HARGA[r.sumber] ?? { label: r.sumber, className: TAG_ABU }
                                    return (
                                        <tr key={r.id_riwayat}>
                                            <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">{dayjs(r.tanggal).format('DD MMM YYYY HH:mm')}</td>
                                            <td className="py-3 pr-4 text-right whitespace-nowrap">{r.harga_lama != null ? formatRupiah(r.harga_lama) : <span className="text-gray-400">—</span>}</td>
                                            <td className="py-3 pr-4 text-right whitespace-nowrap font-semibold">{formatRupiah(r.harga_baru)}</td>
                                            <td className="py-3 pr-4 whitespace-nowrap">
                                                {selisih == null ? (
                                                    <Tag className={`text-xs font-semibold ${TAG_ABU}`}>Harga awal</Tag>
                                                ) : selisih === 0 ? (
                                                    <Tag className={`text-xs font-semibold ${TAG_ABU}`}>Tidak berubah</Tag>
                                                ) : (
                                                    <Tag className={`text-xs font-semibold ${selisih > 0 ? TAG_NAIK : TAG_TURUN}`}>
                                                        {selisih > 0 ? '+' : '-'}{formatRupiah(Math.abs(selisih))}
                                                        {r.persen != null && ` (${selisih > 0 ? '+' : '-'}${formatPersen(r.persen)})`}
                                                    </Tag>
                                                )}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <Tag className={`text-xs font-semibold ${sumber.className}`}>{sumber.label}</Tag>
                                            </td>
                                            <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 max-w-[240px] truncate">{r.keterangan || <span className="text-gray-400">—</span>}</td>
                                            <td className="py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.dibuat_oleh_nama || <span className="text-gray-400">—</span>}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {!riwayatHargaLoading && riwayatHargaTotal > RIWAYAT_HARGA_PAGE_SIZE && (
                    <div className="flex justify-end mt-4">
                        <Pagination
                            currentPage={riwayatHargaPage}
                            total={riwayatHargaTotal}
                            pageSize={RIWAYAT_HARGA_PAGE_SIZE}
                            onChange={setRiwayatHargaPage}
                        />
                    </div>
                )}
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Mutasi Stok (20 terakhir)</p>
                    <div className="flex items-center gap-3">
                        {mutasiLoading && <Spinner size={20} />}
                        <p className="text-sm text-gray-500">
                            Total stok saat ini:{' '}
                            <span className="font-bold text-gray-800 dark:text-gray-100">
                                {formatNum(sparepart.stok)} {sparepart.satuan}
                            </span>
                        </p>
                    </div>
                </div>
                {mutasi.length === 0 && !mutasiLoading ? (
                    <p className="text-gray-400 text-sm py-4 text-center">Belum ada mutasi stok</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Tanggal</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Jenis</th>
                                    <th className="py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Qty</th>
                                    <th className="py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Harga</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {mutasi.map(m => (
                                    <tr key={m.id_mutasi}>
                                        <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">{dayjs(m.tanggal).format('DD MMM YYYY')}</td>
                                        <td className="py-3 pr-4">
                                            <Tag className={`text-xs font-semibold ${MUTASI_CLASS[m.jenis] ?? 'bg-gray-100 text-gray-600'}`}>{m.jenis}</Tag>
                                        </td>
                                        <td className={`py-3 pr-4 text-right font-mono text-xs font-semibold ${
                                            m.jenis === 'keluar' || m.qty < 0 ? 'text-red-500' : 'text-emerald-600'
                                        }`}>{m.jenis === 'keluar' || m.qty < 0 ? '-' : '+'}{formatNum(Math.abs(m.qty))}</td>
                                        <td className="py-3 pr-4 text-right whitespace-nowrap">{m.harga != null ? formatRupiah(m.harga) : <span className="text-gray-400">—</span>}</td>
                                        <td className="py-3 text-gray-600 dark:text-gray-400 max-w-[240px] truncate">
                                            {m.id_pembelian ? (
                                                <Link href={ROUTES.PEMBELIAN_SPAREPART_DETAIL(m.id_pembelian)}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="text-blue-500 hover:underline">
                                                    {m.keterangan}
                                                </Link>
                                            ) : (
                                                m.keterangan ?? <span className="text-gray-400">—</span>
                                            )}
                                            {m.dibuat_pada && (
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    dicatat {dayjs(m.dibuat_pada).format('DD MMM YYYY HH:mm')}
                                                    {m.dibuat_oleh_nama ? ` oleh ${m.dibuat_oleh_nama}` : ''}
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
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

            <Dialog isOpen={stokOpen} onRequestClose={() => setStokOpen(false)} onClose={() => setStokOpen(false)} width={480}>
                <h5 className="text-base font-semibold mb-2">Penyesuaian Stok</h5>
                <p className="text-xs text-gray-500 mb-5">
                    Hanya untuk koreksi stock opname, saldo awal, atau retur.
                    Barang masuk dari pembelian tercatat otomatis saat realisasi di menu Pembelian Sparepart.
                </p>
                <form onSubmit={e => { e.preventDefault(); handlePenyesuaianStok() }}>
                    <FormItem label="Qty Koreksi (+/-)" asterisk
                        invalid={stokSubmitted && !Number(stokForm.qty)}
                        errorMessage="Qty wajib diisi dan tidak boleh 0">
                        <Input type="number" placeholder="Contoh: -3 atau 5"
                            value={stokForm.qty}
                            onChange={e => setStokForm(p => ({ ...p, qty: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Keterangan / Alasan" asterisk
                        invalid={stokSubmitted && !stokForm.keterangan.trim()}
                        errorMessage="Keterangan wajib diisi">
                        <Input textArea placeholder="Contoh: Koreksi stock opname Juli / saldo awal gudang" value={stokForm.keterangan}
                            onChange={e => setStokForm(p => ({ ...p, keterangan: e.target.value }))} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setStokOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={stokSaving}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={deleteOpen} type="danger" title="Hapus Spare Part"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteOpen(false)} onCancel={() => setDeleteOpen(false)}
                onConfirm={handleDelete} confirmButtonProps={{ loading: deleting }}>
                <p>Hapus spare part <strong>{sparepart.nama}</strong>? Riwayat mutasi dan pemakaian servis lama tetap tersimpan.</p>
            </ConfirmDialog>
        </div>
    )
}
