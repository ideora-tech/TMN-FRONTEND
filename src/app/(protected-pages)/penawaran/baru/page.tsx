'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import RichTextEditor from '@/components/shared/RichTextEditor'
import dayjs from 'dayjs'
import { HiArrowLeft, HiPlusCircle, HiOutlineTrash, HiOutlineViewList } from 'react-icons/hi'
import PilihRuteDialog, { PilihanItemRute } from '../PilihRuteDialog'
import { penawaranService, TipeHargaPenawaran } from '@/services/penawaran.service'
import { ruteService, Rute, labelRute } from '@/services/rute.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { klienService, Klien } from '@/services/klien.service'
import { ROUTES } from '@/constants/route.constant'
import { TIPE_HARGA_OPTIONS, labelTipeHarga } from '@/constants/tipeHarga.constant'
import { parseApiError } from '@/utils/error.util'
import { kontenKeHtml } from '@/utils/richText'
import { formatNum, formatRupiah } from '@/utils/formatNumber'

interface FormState {
    id_klien: string
    judul: string
    tipe_harga: TipeHargaPenawaran
    nilai_penawaran_str: string
    tanggal_penawaran: string
    jumlah_hari: string
    catatan: string
}

const INIT: FormState = {
    id_klien: '',
    judul: '',
    tipe_harga: 'per_rit',
    nilai_penawaran_str: '',
    tanggal_penawaran: '',
    jumlah_hari: '',
    catatan: '',
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
type TipeHargaOption = { value: TipeHargaPenawaran; label: string }

const ITEM_KOSONG: ItemForm = {
    id_rute: '', id_jenis_kendaraan: '',
    harga_satuan_str: '', jumlah_hari_str: '', estimasi_ritase_str: '1', keterangan: '',
}

export default function PenawaranBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState<FormState>(INIT)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

    const [items, setItems] = useState<ItemForm[]>([])
    const [itemError, setItemError] = useState('')
    const [ruteOptions, setRuteOptions] = useState<Option[]>([])
    const [jenisOptions, setJenisOptions] = useState<Option[]>([])
    const [klienOptions, setKlienOptions] = useState<Option[]>([])
    const [dialogRuteTerbuka, setDialogRuteTerbuka] = useState(false)

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

    const set = (field: keyof FormState, value: string) =>
        setForm(p => ({ ...p, [field]: value }))

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
        const e: Partial<Record<keyof FormState, string>> = {}
        if (!form.judul.trim()) e.judul = 'Judul penawaran wajib diisi'
        if (!form.id_klien) e.id_klien = 'Klien wajib dipilih'
        if (form.jumlah_hari && Number(form.jumlah_hari) < 1) e.jumlah_hari = 'Jumlah hari minimal 1'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate() || !validateItems()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setSaving(true)
        try {
            const created = await penawaranService.create({
                judul: form.judul.trim(),
                id_klien: form.id_klien,
                tipe_harga: form.tipe_harga,
                nilai_penawaran: nilaiOtomatis
                    ? undefined
                    : (form.nilai_penawaran_str
                        ? Number(form.nilai_penawaran_str.replace(/\D/g, ''))
                        : null),
                tanggal_penawaran: form.tanggal_penawaran || null,
                jumlah_hari: form.jumlah_hari ? Number(form.jumlah_hari) : null,
                catatan: form.catatan.trim() || null,
                items: items.length > 0
                    ? items.map(it => ({
                        id_rute: it.id_rute,
                        id_jenis_kendaraan: it.id_jenis_kendaraan,
                        harga_satuan: form.tipe_harga !== 'per_rit' ? undefined : Number(it.harga_satuan_str || 0),
                        jumlah_hari: it.jumlah_hari_str ? Number(it.jumlah_hari_str) : null,
                        estimasi_ritase: Number(it.estimasi_ritase_str || 1),
                        keterangan: it.keterangan.trim() || null,
                    }))
                    : undefined,
            })
            toast.push(<Notification type="success" title={`Penawaran ${created.nomor_penawaran} berhasil dibuat`} />)
            router.push(ROUTES.PENAWARAN_DETAIL(created.id_penawaran))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

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
                    <h4 className="font-bold">Buat Penawaran Baru</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Isi detail penawaran untuk klien — nomor penawaran dibuat otomatis</p>
                </div>
            </div>

            <Card>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Judul Penawaran" asterisk invalid={!!errors.judul} errorMessage={errors.judul}>
                            <Input
                                placeholder="Contoh: Penawaran Jasa Pengiriman Q3 2026"
                                value={form.judul}
                                invalid={!!errors.judul}
                                onChange={e => set('judul', e.target.value)}
                            />
                        </FormItem>
                        <FormItem label="Tipe Harga" asterisk>
                            <Select<TipeHargaOption> isSearchable={false}
                                options={TIPE_HARGA_OPTIONS}
                                value={TIPE_HARGA_OPTIONS.find(o => o.value === form.tipe_harga) ?? null}
                                onChange={opt => setForm(p => ({ ...p, tipe_harga: opt?.value ?? 'per_rit' }))} />
                        </FormItem>
                        <FormItem label="Klien" asterisk invalid={!!errors.id_klien} errorMessage={errors.id_klien}>
                            <Select<Option> isSearchable placeholder="Pilih klien"
                                options={klienOptions}
                                value={klienOptions.find(o => o.value === form.id_klien) ?? null}
                                onChange={opt => set('id_klien', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label={form.tipe_harga === 'per_rit' ? 'Nilai Penawaran' : `Nilai ${labelTipeHarga(form.tipe_harga)}`}
                            extra={nilaiOtomatis ? <span className="text-xs text-gray-400 ml-2">(otomatis dari item rate card)</span> : undefined}>
                            <Input
                                prefix="Rp"
                                placeholder="0"
                                disabled={nilaiOtomatis}
                                value={nilaiOtomatis
                                    ? formatNum(totalItems)
                                    : (form.nilai_penawaran_str
                                        ? formatNum(Number(form.nilai_penawaran_str))
                                        : '')}
                                onChange={e =>
                                    set('nilai_penawaran_str', e.target.value.replace(/\D/g, ''))
                                }
                            />
                        </FormItem>
                        <FormItem label="Tanggal Penawaran">
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={form.tanggal_penawaran ? dayjs(form.tanggal_penawaran).toDate() : null}
                                onChange={date => set('tanggal_penawaran', date ? dayjs(date).format('YYYY-MM-DD') : '')}
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
                                onChange={({ html }) => set('catatan', html === '<p></p>' ? '' : html)}
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
                        <Button type="button" variant="plain" onClick={() => router.push(ROUTES.PENAWARAN)}>
                            Batal
                        </Button>
                        <Button type="submit" variant="solid" loading={saving}>
                            Buat Penawaran
                        </Button>
                    </div>
                </form>
            </Card>

            <PilihRuteDialog
                isOpen={dialogRuteTerbuka}
                onClose={() => setDialogRuteTerbuka(false)}
                onPilih={tambahItemDariDialog}
                onRuteBaru={tambahRuteOption}
            />
        </div>
    )
}
