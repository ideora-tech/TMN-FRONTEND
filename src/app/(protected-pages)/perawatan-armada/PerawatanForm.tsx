'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { perawatanArmadaService, PerawatanArmada, StatusPerawatan, PerawatanSparepartInput } from '@/services/perawatanArmada.service'
import { jenisPerawatanService } from '@/services/jenisPerawatan.service'
import { sparepartService, Sparepart } from '@/services/sparepart.service'
import { armadaService, Armada } from '@/services/armada.service'
import { intervalPerawatanService } from '@/services/intervalPerawatan.service'
import { paketPerawatanSparepartService } from '@/services/paketPerawatanSparepart.service'

type Option = { value: string; label: string }

const STATUS_OPTIONS: { value: StatusPerawatan; label: string }[] = [
    { value: 'terjadwal',    label: 'Terjadwal' },
    { value: 'dalam_proses', label: 'Dalam Proses' },
    { value: 'selesai',      label: 'Selesai' },
]

type ItemRow = { id_sparepart: string; qty: string; harga: string }

type FormState = {
    id_armada: string
    id_jenis_perawatan: string | null
    tanggal: string
    biaya: string
    km_odometer: string
    status: StatusPerawatan
    jadwal_servis_berikutnya: string
    keterangan: string
}

const emptyForm = (): FormState => ({
    id_armada: '', id_jenis_perawatan: null, tanggal: '', biaya: '', km_odometer: '',
    status: 'selesai', jadwal_servis_berikutnya: '', keterangan: '',
})

export default function PerawatanForm({ editId, editArmadaId }: { editId?: string; editArmadaId?: string }) {
    const router = useRouter()
    const isEdit = !!editId

    const [form, setForm]   = useState<FormState>(emptyForm())
    const [items, setItems] = useState<ItemRow[]>([])
    const [loading, setLoading] = useState(isEdit)
    const [saving, setSaving]   = useState(false)

    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])
    const [armadaList, setArmadaList] = useState<Armada[]>([])
    const [jenisOptions, setJenisOptions]   = useState<Option[]>([])
    const [sparepartList, setSparepartList] = useState<Sparepart[]>([])

    useEffect(() => {
        Promise.all([
            armadaService.list(1, 100),
            jenisPerawatanService.list(1, 100),
            sparepartService.list({ page: 1, limit: 100 }),
        ]).then(([armada, jenis, sp]) => {
            setArmadaOptions(armada.data.map((a: Armada) => ({ value: a.id_armada, label: a.nopol })))
            setArmadaList(armada.data)
            setJenisOptions(jenis.data.filter(j => j.aktif).map(j => ({ value: j.id_jenis_perawatan, label: j.nama })))
            setSparepartList(sp.data.filter(s => s.aktif))
        }).catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
    }, [])

    useEffect(() => {
        if (!isEdit || !editId || !editArmadaId) return
        perawatanArmadaService.get(editArmadaId, editId)
            .then((p: PerawatanArmada) => {
                setForm({
                    id_armada: p.id_armada,
                    id_jenis_perawatan: p.id_jenis_perawatan,
                    tanggal: p.tanggal,
                    biaya: String(p.biaya ?? ''),
                    km_odometer: p.km_odometer != null ? String(p.km_odometer) : '',
                    status: p.status,
                    jadwal_servis_berikutnya: p.jadwal_servis_berikutnya ?? '',
                    keterangan: p.keterangan ?? '',
                })
                setItems((p.sparepart ?? []).map(it => ({
                    id_sparepart: it.id_sparepart,
                    qty: String(it.qty),
                    harga: String(it.harga),
                })))
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [isEdit, editId, editArmadaId])

    // Auto-fill Jadwal Servis Berikutnya dari interval — hanya saat CREATE (isEdit=false),
    // supaya tidak menimpa jadwal yang sudah tersimpan saat user membuka form edit.
    useEffect(() => {
        if (isEdit) return
        const armada = armadaList.find(a => a.id_armada === form.id_armada)
        if (!armada?.id_jenis_kendaraan || !form.id_jenis_perawatan || !form.tanggal) return

        let aktif = true
        intervalPerawatanService.resolusi({
            id_jenis_perawatan: form.id_jenis_perawatan,
            id_jenis_kendaraan: armada.id_jenis_kendaraan,
        })
            .then(res => {
                if (aktif && res) {
                    const jadwal = dayjs(form.tanggal).add(res.interval_hari, 'day').format('YYYY-MM-DD')
                    setForm(p => ({ ...p, jadwal_servis_berikutnya: jadwal }))
                }
            })
            .catch(() => {})
        return () => { aktif = false }
    }, [isEdit, form.id_armada, form.id_jenis_perawatan, form.tanggal, armadaList])

    // Auto-fill daftar sparepart dari paket standar — hanya saat CREATE dan list masih kosong,
    // supaya tidak menimpa part yang sudah ditambah manual.
    useEffect(() => {
        if (isEdit || items.length > 0) return
        const armada = armadaList.find(a => a.id_armada === form.id_armada)
        if (!armada?.id_jenis_kendaraan || !form.id_jenis_perawatan) return

        let aktif = true
        paketPerawatanSparepartService.resolusi({
            id_jenis_perawatan: form.id_jenis_perawatan,
            id_jenis_kendaraan: armada.id_jenis_kendaraan,
        })
            .then(res => {
                if (aktif && res.length > 0) {
                    setItems(res.map(r => ({
                        id_sparepart: r.id_sparepart,
                        qty: String(r.qty_standar),
                        harga: String(r.harga_standar),
                    })))
                }
            })
            .catch(() => {})
        return () => { aktif = false }
    }, [isEdit, form.id_armada, form.id_jenis_perawatan, armadaList, items.length])

    const sparepartOptions: Option[] = sparepartList.map(s => ({
        value: s.id_sparepart,
        label: `${s.nama} (stok: ${formatNum(s.stok)} ${s.satuan})`,
    }))

    const addItem = () => setItems(p => [...p, { id_sparepart: '', qty: '1', harga: '' }])
    const removeItem = (idx: number) => setItems(p => p.filter((_, i) => i !== idx))
    const updateItem = (idx: number, field: keyof ItemRow, value: string) => {
        setItems(p => {
            const next = [...p]
            next[idx] = { ...next[idx], [field]: value }
            return next
        })
    }
    const pilihSparepart = (idx: number, idSparepart: string) => {
        const sp = sparepartList.find(s => s.id_sparepart === idSparepart)
        setItems(p => {
            const next = [...p]
            next[idx] = {
                ...next[idx],
                id_sparepart: idSparepart,
                harga: next[idx].harga || (sp ? String(sp.harga_standar) : ''),
            }
            return next
        })
    }

    const totalSparepart = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.harga) || 0), 0)

    const canSubmit = !!form.id_armada && !!form.tanggal && !!form.id_jenis_perawatan
        && items.every(it => it.id_sparepart && Number(it.qty) > 0)

    const handleSubmit = async () => {
        if (!canSubmit) return
        setSaving(true)
        try {
            const payload = {
                tanggal: form.tanggal,
                id_jenis_perawatan: form.id_jenis_perawatan,
                biaya: Number(form.biaya) || 0,
                km_odometer: form.km_odometer ? Number(form.km_odometer) : null,
                status: form.status,
                jadwal_servis_berikutnya: form.jadwal_servis_berikutnya || null,
                keterangan: form.keterangan || null,
                sparepart: items.map((it): PerawatanSparepartInput => ({
                    id_sparepart: it.id_sparepart,
                    qty: Number(it.qty),
                    harga: Number(it.harga) || 0,
                })),
            }
            if (isEdit && editId && editArmadaId) {
                await perawatanArmadaService.update(editArmadaId, editId, payload)
                toast.push(<Notification type="success" title="Perawatan berhasil diperbarui" />)
            } else {
                await perawatanArmadaService.create(form.id_armada, payload)
                toast.push(<Notification type="success" title="Perawatan berhasil dicatat" />)
            }
            router.push(ROUTES.PERAWATAN_ARMADA)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PERAWATAN_ARMADA)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{isEdit ? 'Edit Perawatan' : 'Catat Perawatan'}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{isEdit ? 'Perbarui data perawatan armada' : 'Catat perawatan armada baru'}</p>
                </div>
            </div>

            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Armada" asterisk>
                            <Select placeholder="Pilih armada..."
                                isDisabled={isEdit}
                                options={armadaOptions}
                                value={armadaOptions.find(o => o.value === form.id_armada) ?? null}
                                onChange={opt => setForm(p => ({ ...p, id_armada: (opt as Option | null)?.value ?? '' }))} />
                        </FormItem>
                        <FormItem label="Jenis Perawatan" asterisk>
                            <Select placeholder="Pilih jenis perawatan..."
                                options={jenisOptions}
                                value={jenisOptions.find(o => o.value === form.id_jenis_perawatan) ?? null}
                                onChange={opt => setForm(p => ({ ...p, id_jenis_perawatan: (opt as Option | null)?.value ?? null }))} />
                        </FormItem>
                        <FormItem label="Tanggal" asterisk>
                            <DatePicker
                                value={form.tanggal ? new Date(form.tanggal) : null}
                                onChange={date => setForm(p => ({ ...p, tanggal: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                        </FormItem>
                        <FormItem label="Biaya Jasa (Rp)">
                            <Input prefix="Rp" placeholder="0"
                                value={form.biaya ? formatNum(Number(form.biaya)) : ''}
                                onChange={e => setForm(p => ({ ...p, biaya: e.target.value.replace(/\D/g, '') }))} />
                        </FormItem>
                        <FormItem label="KM Odometer">
                            <Input suffix="km" placeholder="0" value={form.km_odometer}
                                onChange={e => setForm(p => ({ ...p, km_odometer: e.target.value.replace(/\D/g, '') }))} />
                        </FormItem>
                        <FormItem label="Status">
                            <Select isSearchable={false}
                                options={STATUS_OPTIONS}
                                value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                                onChange={opt => opt && setForm(p => ({ ...p, status: (opt as { value: StatusPerawatan }).value }))} />
                        </FormItem>
                        <FormItem label="Jadwal Servis Berikutnya">
                            <DatePicker
                                value={form.jadwal_servis_berikutnya ? new Date(form.jadwal_servis_berikutnya) : null}
                                onChange={date => setForm(p => ({ ...p, jadwal_servis_berikutnya: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Keterangan">
                                <Input textArea placeholder="Keterangan tambahan..." value={form.keterangan}
                                    onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                            </FormItem>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Spare Part Diganti</p>
                            <Button type="button" size="sm" variant="plain" icon={<HiOutlinePlus />} onClick={addItem}>Tambah Part</Button>
                        </div>
                        {items.length === 0 ? (
                            <p className="text-gray-400 text-xs py-2">Belum ada spare part ditambahkan.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {items.map((it, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <div className="flex-1 min-w-0">
                                            <Select placeholder="Pilih spare part..."
                                                options={sparepartOptions}
                                                value={sparepartOptions.find(o => o.value === it.id_sparepart) ?? null}
                                                onChange={opt => pilihSparepart(idx, (opt as Option | null)?.value ?? '')} />
                                        </div>
                                        <Input className="w-full sm:w-24" type="number" min={1} placeholder="Qty"
                                            value={it.qty}
                                            onChange={e => updateItem(idx, 'qty', e.target.value.replace(/\D/g, ''))} />
                                        <Input className="w-full sm:w-40" prefix="Rp" placeholder="Harga/unit"
                                            value={it.harga ? formatNum(Number(it.harga)) : ''}
                                            onChange={e => updateItem(idx, 'harga', e.target.value.replace(/\D/g, ''))} />
                                        <div className="w-full sm:w-32 text-right text-sm font-medium whitespace-nowrap self-center">
                                            {formatRupiah((Number(it.qty) || 0) * (Number(it.harga) || 0))}
                                        </div>
                                        <span
                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors flex-shrink-0 self-center"
                                            onClick={() => removeItem(idx)}>
                                            <HiOutlineTrash className="text-base" />
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-sm">Total Spare Part: <span className="font-bold">{formatRupiah(totalSparepart)}</span></p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => router.push(ROUTES.PERAWATAN_ARMADA)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving} disabled={!canSubmit}>Simpan</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
