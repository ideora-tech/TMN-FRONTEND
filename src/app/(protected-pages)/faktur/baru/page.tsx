'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiPlusCircle, HiTrash, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import { PiReceiptDuotone } from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { fakturService, FakturItem, FakturPajak } from '@/services/faktur.service'
import { klienService, Klien } from '@/services/klien.service'
import { projectService, Project } from '@/services/project.service'

const emptyItem = (): FakturItem => ({ deskripsi: '', qty: 1, harga_satuan: 0, subtotal: 0 })

type PajakRow = { nama: string; persen: string }
const MAKS_PAJAK = 10

export default function FakturBaruPage() {
    const router       = useRouter()
    const searchParams = useSearchParams()

    const initIdKlien  = searchParams.get('id_klien') ?? ''
    const initIdProyek = searchParams.get('id_proyek') ?? ''

    const [form, setForm] = useState({
        nomor_faktur:   '',
        tanggal_faktur: '',
        jatuh_tempo:    '',
        id_klien:       initIdKlien,
        id_proyek:      initIdProyek,
    })
    const [items, setItems] = useState<FakturItem[]>([emptyItem()])
    const [pajak, setPajak] = useState<PajakRow[]>([])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})

    const [klienOptions, setKlienOptions] = useState<{ value: string; label: string }[]>([])
    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string; nama: string }[]>([])

    useEffect(() => {
        klienService.list(1).then(res =>
            setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: `${k.kode_klien} — ${k.nama_klien}` })))
        ).catch(() => {})
    }, [])

    const loadProyek = useCallback(async (idKlien: string) => {
        if (!idKlien) { setProyekOptions([]); return }
        try {
            const res = await projectService.listByKlien(idKlien, 1, 100)
            setProyekOptions(res.data.map((p: Project) => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}`, nama: p.nama_proyek })))
        } catch { setProyekOptions([]) }
    }, [])

    useEffect(() => { loadProyek(form.id_klien) }, [form.id_klien, loadProyek])

    const handleAutoFill = () => {
        const opt = proyekOptions.find(o => o.value === form.id_proyek)
        if (!opt) return
        setItems([{ deskripsi: `Layanan transportasi — ${opt.nama}`, qty: 1, harga_satuan: 0, subtotal: 0 }])
        toast.push(<Notification type="info" title="Item otomatis ditambahkan — isi harga satuan" />)
    }

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.nomor_faktur.trim()) e.nomor_faktur = 'Nomor invoice wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleItemChange = (idx: number, field: keyof FakturItem, value: string) => {
        setItems(prev => {
            const next = [...prev]
            const item = { ...next[idx] }
            if (field === 'qty' || field === 'harga_satuan') {
                (item as Record<string, unknown>)[field] = Number(value)
                item.subtotal = (field === 'qty' ? Number(value) : item.qty) * (field === 'harga_satuan' ? Number(value) : item.harga_satuan)
            } else {
                (item as Record<string, unknown>)[field] = value
            }
            next[idx] = item
            return next
        })
    }

    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0)

    const setPajakRow = (index: number, patch: Partial<PajakRow>) =>
        setPajak(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))

    const tambahPajak = () => setPajak(prev => (prev.length >= MAKS_PAJAK ? prev : [...prev, { nama: '', persen: '' }]))
    const hapusPajak  = (index: number) => setPajak(prev => prev.filter((_, i) => i !== index))

    const namaPajakLower = pajak.map(r => r.nama.trim().toLowerCase())
    const pajakDuplikat = (index: number) => namaPajakLower[index] !== '' && namaPajakLower.filter(x => x === namaPajakLower[index]).length > 1
    const pajakValid = pajak.every((row, i) => {
        const persen = Number(row.persen)
        return row.nama.trim() !== '' && row.persen !== '' && !Number.isNaN(persen) && persen >= 0 && persen <= 100 && !pajakDuplikat(i)
    })

    const nominalPajak = (persen: number) => subtotal * persen / 100
    const totalPajak = pajak.reduce((sum, r) => sum + nominalPajak(Number(r.persen) || 0), 0)
    const total = subtotal + totalPajak

    const handleSubmit = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        if (!pajakValid) {
            toast.push(<Notification type="danger" title="Periksa baris pajak — nama wajib diisi, persen 0–100, dan tidak boleh sama" />)
            return
        }
        setLoading(true)
        try {
            const pajakPayload: FakturPajak[] = pajak.map(r => ({ nama: r.nama.trim(), persen: Number(r.persen) || 0 }))
            await fakturService.create({
                nomor_faktur:   form.nomor_faktur,
                tanggal_faktur: form.tanggal_faktur || undefined,
                jatuh_tempo:    form.jatuh_tempo || undefined,
                id_klien:       form.id_klien || undefined,
                id_proyek:      form.id_proyek || undefined,
                items,
                pajak: pajakPayload.length > 0 ? pajakPayload : undefined,
            })
            toast.push(<Notification type="success" title="Invoice berhasil dibuat" />)
            router.push(ROUTES.FAKTUR)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <button type="button" onClick={() => router.back()}
                    className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors shrink-0">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-subtle text-primary text-2xl shrink-0">
                        <PiReceiptDuotone />
                    </span>
                    <div>
                        <h3 className="font-bold">Buat Invoice</h3>
                        <p className="text-gray-500 text-sm mt-0.5">Buat invoice baru untuk klien</p>
                    </div>
                </div>
            </div>

            <form onSubmit={e => { e.preventDefault(); handleSubmit() }} className="flex flex-col gap-6">
                {/* Header faktur */}
                <Card header={{ content: 'Informasi Invoice' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1 mb-4">
                        <FormItem label="Klien">
                            <Select placeholder="Pilih klien (opsional)..." options={klienOptions}
                                value={klienOptions.find(o => o.value === form.id_klien) ?? null}
                                onChange={opt => setForm(p => ({ ...p, id_klien: opt?.value ?? '', id_proyek: '' }))}
                                isClearable />
                        </FormItem>
                        <FormItem label="Proyek">
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <Select placeholder="Pilih proyek (opsional)..." options={proyekOptions}
                                        value={proyekOptions.find(o => o.value === form.id_proyek) ?? null}
                                        onChange={opt => setForm(p => ({ ...p, id_proyek: opt?.value ?? '' }))}
                                        isDisabled={!form.id_klien}
                                        isClearable />
                                </div>
                                {form.id_proyek && (
                                    <Button type="button" size="sm" variant="default" onClick={handleAutoFill}>
                                        Auto-fill
                                    </Button>
                                )}
                            </div>
                        </FormItem>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-1">
                        <FormItem label="Nomor Invoice" asterisk invalid={!!errors.nomor_faktur} errorMessage={errors.nomor_faktur}>
                            <Input placeholder="INV-001" value={form.nomor_faktur} invalid={!!errors.nomor_faktur}
                                onChange={e => setForm(p => ({ ...p, nomor_faktur: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Tanggal Invoice">
                            <DatePicker
                                value={form.tanggal_faktur ? new Date(form.tanggal_faktur) : null}
                                onChange={date => setForm(p => ({ ...p, tanggal_faktur: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                        </FormItem>
                        <FormItem label="Jatuh Tempo">
                            <DatePicker
                                value={form.jatuh_tempo ? new Date(form.jatuh_tempo) : null}
                                onChange={date => setForm(p => ({ ...p, jatuh_tempo: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                        </FormItem>
                    </div>
                </Card>

                {/* Item faktur */}
                <Card
                    header={{
                        content: 'Item Invoice',
                        extra: (
                            <Button type="button" variant="plain" size="sm" icon={<HiPlusCircle />}
                                onClick={() => setItems(p => [...p, emptyItem()])}>
                                Tambah Item
                            </Button>
                        ),
                    }}
                    bodyClass="p-0"
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr>
                                    <th className="py-2.5 pl-5 pr-3 text-left text-gray-500 font-medium">Deskripsi</th>
                                    <th className="py-2.5 px-3 text-left text-gray-500 font-medium w-20">Qty</th>
                                    <th className="py-2.5 px-3 text-left text-gray-500 font-medium w-36">Harga Satuan</th>
                                    <th className="py-2.5 px-3 text-right text-gray-500 font-medium w-36">Subtotal</th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors">
                                        <td className="py-3 pl-5 pr-3">
                                            <Input size="sm" placeholder="Deskripsi item" value={item.deskripsi}
                                                onChange={e => handleItemChange(idx, 'deskripsi', e.target.value)} />
                                        </td>
                                        <td className="py-3 px-3">
                                            <Input size="sm" type="number" value={item.qty} min={1}
                                                onChange={e => handleItemChange(idx, 'qty', e.target.value)} />
                                        </td>
                                        <td className="py-3 px-3">
                                            <Input size="sm" prefix="Rp" placeholder="0"
                                                value={item.harga_satuan ? formatNum(item.harga_satuan) : ''}
                                                onChange={e => handleItemChange(idx, 'harga_satuan', e.target.value.replace(/\D/g, ''))} />
                                        </td>
                                        <td className="py-3 px-3 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                                        <td className="py-3 pr-4 text-center">
                                            {items.length > 1 && (
                                                <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                                    onClick={() => setItems(p => p.filter((_, i) => i !== idx))}>
                                                    <HiTrash className="text-base" />
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold">Pajak (opsional)</p>
                            <button type="button" onClick={tambahPajak} disabled={pajak.length >= MAKS_PAJAK}
                                className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                                <HiOutlinePlus /> Tambah Pajak
                            </button>
                        </div>
                        {pajak.length === 0 ? (
                            <p className="text-xs text-gray-400">Belum ada pajak — tambahkan bila invoice ini kena PPN atau PPh.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {pajak.map((row, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-12 sm:col-span-7">
                                            <Input placeholder="Nama pajak (mis. PPN)" value={row.nama}
                                                invalid={row.nama.trim() === '' || pajakDuplikat(index)}
                                                onChange={e => setPajakRow(index, { nama: e.target.value })} />
                                        </div>
                                        <div className="col-span-9 sm:col-span-4">
                                            <Input suffix="%" placeholder="0" value={row.persen}
                                                invalid={row.persen === '' || Number(row.persen) < 0 || Number(row.persen) > 100}
                                                onChange={e => setPajakRow(index, { persen: e.target.value.replace(/[^\d.]/g, '') })} />
                                        </div>
                                        <div className="col-span-3 sm:col-span-1 flex justify-end">
                                            <button type="button" onClick={() => hapusPajak(index)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors">
                                                <HiOutlineTrash />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {pajak.some((row, i) => pajakDuplikat(i)) && (
                            <p className="text-red-500 text-xs mt-1">Nama pajak tidak boleh sama dengan baris lain</p>
                        )}
                    </div>

                    <div className="flex justify-end px-5 py-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="w-full max-w-xs flex flex-col gap-1">
                            {pajak.length > 0 && (
                                <>
                                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                        <span>Subtotal</span>
                                        <span className="tabular-nums">{formatRupiah(subtotal)}</span>
                                    </div>
                                    {pajak.map((row, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                            <span>{row.nama.trim() || 'Pajak'} ({Number(row.persen) || 0}%)</span>
                                            <span className="tabular-nums">{formatRupiah(nominalPajak(Number(row.persen) || 0))}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                            <div className="flex items-center justify-between bg-primary-subtle rounded-xl px-4 py-3 mt-1">
                                <span className="font-semibold text-gray-600 dark:text-gray-300">Total</span>
                                <span className="text-lg font-bold text-primary tabular-nums">{formatRupiah(total)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 px-5 pb-5">
                        <Button type="button" variant="plain" onClick={() => router.back()}>Batal</Button>
                        <Button type="submit" variant="solid" loading={loading}>Simpan Invoice</Button>
                    </div>
                </Card>
            </form>
        </div>
    )
}
