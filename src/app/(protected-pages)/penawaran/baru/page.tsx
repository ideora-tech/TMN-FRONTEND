'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { HiArrowLeft, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import { penawaranService } from '@/services/penawaran.service'
import { tarifRuteService } from '@/services/tarifRute.service'
import { ruteService, Rute } from '@/services/rute.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { klienService, Klien } from '@/services/klien.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'

interface FormState {
    id_klien:           string
    nomor_penawaran:    string
    judul:              string
    nilai_penawaran_str: string
    tanggal_penawaran:  string
    tanggal_berlaku:    string
    catatan:            string
}

const INIT: FormState = {
    id_klien:           '',
    nomor_penawaran:    '',
    judul:              '',
    nilai_penawaran_str: '',
    tanggal_penawaran:  '',
    tanggal_berlaku:    '',
    catatan:            '',
}

interface ItemForm {
    id_rute:              string
    id_jenis_kendaraan:   string
    id_tarif_rute:        string | null
    harga_satuan_str:     string
    estimasi_ritase_str:  string
    keterangan:           string
}

type Option = { value: string; label: string }

const ITEM_KOSONG: ItemForm = {
    id_rute: '', id_jenis_kendaraan: '', id_tarif_rute: null,
    harga_satuan_str: '', estimasi_ritase_str: '1', keterangan: '',
}

export default function PenawaranBaruPage() {
    const router = useRouter()
    const [form, setForm]     = useState<FormState>(INIT)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

    const [items, setItems] = useState<ItemForm[]>([])
    const [itemError, setItemError] = useState('')
    const [ruteOptions, setRuteOptions] = useState<Option[]>([])
    const [jenisOptions, setJenisOptions] = useState<Option[]>([])
    const [klienOptions, setKlienOptions] = useState<Option[]>([])

    useEffect(() => {
        ruteService.list({ limit: 100 })
            .then(res => setRuteOptions((res.data ?? []).map((r: Rute) => ({ value: r.id_rute, label: r.nama_rute }))))
            .catch(() => {})
        jenisKendaraanService.list(1)
            .then(res => setJenisOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
        klienService.list(1, 100)
            .then(res => setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: k.nama_klien }))))
            .catch(() => {})
    }, [])

    const set = (field: keyof FormState, value: string) =>
        setForm(p => ({ ...p, [field]: value }))

    const totalItems = items.reduce(
        (sum, it) => sum + Number(it.harga_satuan_str || 0) * Number(it.estimasi_ritase_str || 1), 0)

    const updateItem = (index: number, patch: Partial<ItemForm>) => {
        setItems(prev => {
            const next = [...prev]
            next[index] = { ...next[index], ...patch }
            return next
        })
    }

    // Auto-fill harga: kontrak klien menang, fallback harga umum; tetap bisa diedit manual.
    // Guard stale response: id_rute/id_jenis_kendaraan dicapture saat pemanggilan; hasil hanya
    // diterapkan bila baris pada index tsb (dibaca via functional setItems) masih punya
    // kombinasi rute+jenis yang sama saat resolusi selesai — mencegah overwrite oleh respons basi
    // ketika user re-pilih rute/jenis dengan cepat.
    const autoFillHarga = async (index: number, idRute: string, idJenis: string) => {
        if (!idRute || !idJenis) return
        try {
            const tarif = await tarifRuteService.resolusi({
                id_rute: idRute,
                id_jenis_kendaraan: idJenis,
                id_klien: form.id_klien || undefined,
                tanggal: form.tanggal_penawaran || undefined,
            })
            if (!tarif) return
            setItems(prev => {
                const row = prev[index]
                if (!row || row.id_rute !== idRute || row.id_jenis_kendaraan !== idJenis) return prev
                const next = [...prev]
                next[index] = {
                    ...row,
                    id_tarif_rute: tarif.id_tarif_rute,
                    harga_satuan_str: String(Math.round(tarif.harga)),
                }
                return next
            })
        } catch { /* tarif tidak ketemu → isi manual */ }
    }

    const setItemRute = (index: number, value: string) => {
        updateItem(index, { id_rute: value })
        autoFillHarga(index, value, items[index].id_jenis_kendaraan)
    }

    const setItemJenis = (index: number, value: string) => {
        updateItem(index, { id_jenis_kendaraan: value })
        autoFillHarga(index, items[index].id_rute, value)
    }

    const validateItems = () => {
        if (items.length === 0) return true
        const invalid = items.some(it => !it.id_rute || !it.id_jenis_kendaraan || !it.harga_satuan_str)
        setItemError(invalid ? 'Setiap item wajib punya rute, jenis kendaraan, dan harga' : '')
        return !invalid
    }

    const validate = () => {
        const e: Partial<Record<keyof FormState, string>> = {}
        if (!form.nomor_penawaran.trim()) e.nomor_penawaran = 'Nomor penawaran wajib diisi'
        if (!form.judul.trim())           e.judul           = 'Judul penawaran wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate() || !validateItems()) return
        setSaving(true)
        try {
            await penawaranService.create({
                nomor_penawaran:   form.nomor_penawaran.trim(),
                judul:             form.judul.trim(),
                id_klien:          form.id_klien || null,
                nilai_penawaran:   items.length > 0
                    ? undefined
                    : (form.nilai_penawaran_str
                        ? Number(form.nilai_penawaran_str.replace(/\D/g, ''))
                        : null),
                tanggal_penawaran: form.tanggal_penawaran || null,
                tanggal_berlaku:   form.tanggal_berlaku || null,
                catatan:           form.catatan.trim() || null,
                items: items.length > 0
                    ? items.map(it => ({
                        id_rute: it.id_rute,
                        id_jenis_kendaraan: it.id_jenis_kendaraan,
                        id_tarif_rute: it.id_tarif_rute,
                        harga_satuan: Number(it.harga_satuan_str || 0),
                        estimasi_ritase: Number(it.estimasi_ritase_str || 1),
                        keterangan: it.keterangan.trim() || null,
                    }))
                    : undefined,
            })
            toast.push(<Notification type="success" title="Penawaran berhasil dibuat" />)
            router.push(ROUTES.PENAWARAN)
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
                    <p className="text-sm text-gray-500 mt-0.5">Isi detail penawaran untuk klien</p>
                </div>
            </div>

            <Card>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Nomor Penawaran" asterisk invalid={!!errors.nomor_penawaran} errorMessage={errors.nomor_penawaran}>
                            <Input
                                placeholder="Contoh: PNW-2026-001"
                                value={form.nomor_penawaran}
                                invalid={!!errors.nomor_penawaran}
                                onChange={e => set('nomor_penawaran', e.target.value)}
                            />
                        </FormItem>
                        <FormItem label="Judul Penawaran" asterisk invalid={!!errors.judul} errorMessage={errors.judul}>
                            <Input
                                placeholder="Contoh: Penawaran Jasa Pengiriman Q3 2026"
                                value={form.judul}
                                invalid={!!errors.judul}
                                onChange={e => set('judul', e.target.value)}
                            />
                        </FormItem>
                        <FormItem label="Klien">
                            <Select<Option> isClearable isSearchable placeholder="Pilih klien (opsional)"
                                options={klienOptions}
                                value={klienOptions.find(o => o.value === form.id_klien) ?? null}
                                onChange={opt => set('id_klien', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Nilai Penawaran" extra={items.length > 0 ? 'Otomatis dari item rate card' : undefined}>
                            <Input
                                prefix="Rp"
                                placeholder="0"
                                disabled={items.length > 0}
                                value={items.length > 0
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
                        <FormItem label="Berlaku Hingga">
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={form.tanggal_berlaku ? dayjs(form.tanggal_berlaku).toDate() : null}
                                onChange={date => set('tanggal_berlaku', date ? dayjs(date).format('YYYY-MM-DD') : '')}
                            />
                        </FormItem>
                        <FormItem label="Catatan" className="sm:col-span-2">
                            <textarea
                                rows={3}
                                placeholder="Catatan tambahan untuk penawaran ini (opsional)"
                                value={form.catatan}
                                onChange={e => set('catatan', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                            />
                        </FormItem>
                    </div>

                    <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">Item Rute (Rate Card)</p>
                                <p className="text-xs text-gray-400 mt-0.5">Harga terisi otomatis dari master tarif (kontrak klien menang atas harga umum) — tetap bisa diubah</p>
                            </div>
                            <Button type="button" size="sm" icon={<HiOutlinePlus />}
                                onClick={() => setItems(prev => [...prev, { ...ITEM_KOSONG }])}>
                                Tambah Item
                            </Button>
                        </div>
                        {itemError && <p className="text-red-500 text-sm mb-2">{itemError}</p>}
                        {items.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-50 dark:bg-blue-500/10">
                                        <tr className="text-left text-gray-600 dark:text-gray-300">
                                            <th className="px-3 py-2 font-semibold min-w-[200px]">Rute</th>
                                            <th className="px-3 py-2 font-semibold min-w-[150px]">Jenis Kendaraan</th>
                                            <th className="px-3 py-2 font-semibold min-w-[150px]">Harga Satuan</th>
                                            <th className="px-3 py-2 font-semibold w-24">Ritase</th>
                                            <th className="px-3 py-2 font-semibold text-right min-w-[120px]">Subtotal</th>
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
                                                        onChange={opt => setItemRute(i, opt?.value ?? '')} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Select<Option> isSearchable placeholder="Pilih jenis..."
                                                        options={jenisOptions}
                                                        value={jenisOptions.find(o => o.value === it.id_jenis_kendaraan) ?? null}
                                                        onChange={opt => setItemJenis(i, opt?.value ?? '')} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Input prefix="Rp" placeholder="0"
                                                        value={it.harga_satuan_str ? formatNum(Number(it.harga_satuan_str)) : ''}
                                                        onChange={e => updateItem(i, {
                                                            harga_satuan_str: e.target.value.replace(/\D/g, ''),
                                                        })} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Input type="number" min="1"
                                                        value={it.estimasi_ritase_str}
                                                        onChange={e => updateItem(i, { estimasi_ritase_str: e.target.value })} />
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold whitespace-nowrap pt-4">
                                                    {formatRupiah(Number(it.harga_satuan_str || 0) * Number(it.estimasi_ritase_str || 1))}
                                                </td>
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
                                <div className="flex justify-end mt-3">
                                    <p className="text-sm">Total Nilai Penawaran:{' '}
                                        <span className="font-bold text-base">{formatRupiah(totalItems)}</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="plain" onClick={() => router.push(ROUTES.PENAWARAN)}>
                            Batal
                        </Button>
                        <Button type="submit" variant="solid" loading={saving}>
                            Buat Penawaran
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}