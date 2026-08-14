'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Dialog, FormItem, Input, DatePicker, Upload, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePlus, HiOutlineTrash, HiOutlinePaperClip } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { perawatanArmadaService, PerawatanArmada, StatusPerawatan, PerawatanSparepartInput, BuktiPerawatan } from '@/services/perawatanArmada.service'
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
    status: 'dalam_proses', jadwal_servis_berikutnya: '', keterangan: '',
})

const MAX_BUKTI = 10
const MAX_UKURAN_BUKTI = 5 * 1024 * 1024
const BUKTI_ACCEPT = '.jpg,.jpeg,.png,.webp'

function FotoBuktiBaru({ file, onRemove }: { file: File; onRemove: () => void }) {
    const [src, setSrc] = useState('')
    useEffect(() => {
        const url = URL.createObjectURL(file)
        setSrc(url)
        return () => URL.revokeObjectURL(url)
    }, [file])

    return (
        <div className="relative">
            {src && (
                <img src={src} alt={file.name}
                    className="w-full h-24 object-cover rounded-lg border border-dashed border-blue-300 dark:border-blue-500/40" />
            )}
            <p className="text-xs text-gray-400 truncate mt-1">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>
            <span
                className="absolute top-1 right-1 cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 shadow transition-colors"
                onClick={onRemove}>
                <HiOutlineTrash className="text-sm" />
            </span>
        </div>
    )
}

export default function PerawatanForm({ editId, editArmadaId }: { editId?: string; editArmadaId?: string }) {
    const router = useRouter()
    const isEdit = !!editId

    const [form, setForm]   = useState<FormState>(emptyForm())
    const [items, setItems] = useState<ItemRow[]>([])
    const [loading, setLoading] = useState(isEdit)
    const [saving, setSaving]   = useState(false)

    const [buktiBaru, setBuktiBaru] = useState<File[]>([])
    const [buktiLama, setBuktiLama] = useState<BuktiPerawatan[]>([])
    const [buktiHapus, setBuktiHapus] = useState<BuktiPerawatan | null>(null)
    const [menghapusBukti, setMenghapusBukti] = useState(false)

    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])
    const [armadaList, setArmadaList] = useState<Armada[]>([])
    const [jenisOptions, setJenisOptions]   = useState<Option[]>([])
    const [sparepartList, setSparepartList] = useState<Sparepart[]>([])
    // true setelah user mengedit sparepart manual — auto-fill paket berhenti mengikuti dropdown
    const sparepartLocked = useRef(false)

    useEffect(() => {
        Promise.all([
            armadaService.list(1, 100),
            jenisPerawatanService.list(1, 100),
            sparepartService.list({ page: 1, limit: 100 }),
        ]).then(([armada, jenis, sp]) => {
            setArmadaOptions(armada.data.map((a: Armada) => ({
                value: a.id_armada,
                label: a.nama_jenis ? `${a.nopol} — ${a.nama_jenis}` : a.nopol,
            })))
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
                setBuktiLama(p.bukti ?? [])
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
                if (aktif && res && res.interval_hari != null) {
                    const jadwal = dayjs(form.tanggal).add(res.interval_hari, 'day').format('YYYY-MM-DD')
                    setForm(p => ({ ...p, jadwal_servis_berikutnya: jadwal }))
                }
            })
            .catch(() => {})
        return () => { aktif = false }
    }, [isEdit, form.id_armada, form.id_jenis_perawatan, form.tanggal, armadaList])

    // Auto-fill daftar sparepart dari paket standar — hanya saat CREATE dan selama user belum
    // mengedit sparepart manual (sparepartLocked). Sengaja TERUS mengikuti tiap kali dropdown
    // Jenis Perawatan berganti (bukan cuma sekali saat kosong), supaya ganti jenis perawatan
    // beberapa kali tetap menampilkan paket yang sesuai — bukan sisa paket jenis sebelumnya.
    useEffect(() => {
        if (isEdit || sparepartLocked.current) return
        const armada = armadaList.find(a => a.id_armada === form.id_armada)
        if (!armada?.id_jenis_kendaraan || !form.id_jenis_perawatan) return

        let aktif = true
        paketPerawatanSparepartService.resolusi({
            id_jenis_perawatan: form.id_jenis_perawatan,
            id_jenis_kendaraan: armada.id_jenis_kendaraan,
        })
            .then(res => {
                if (aktif) {
                    setItems(res.map(r => ({
                        id_sparepart: r.id_sparepart,
                        qty: String(r.qty_standar),
                        harga: String(r.harga_standar),
                    })))
                }
            })
            .catch(() => {})
        return () => { aktif = false }
    }, [isEdit, form.id_armada, form.id_jenis_perawatan, armadaList])

    const sparepartOptions: Option[] = sparepartList.map(s => ({
        value: s.id_sparepart,
        label: `${s.nama} (stok: ${formatNum(s.stok)} ${s.satuan})`,
    }))

    const addItem = () => { sparepartLocked.current = true; setItems(p => [...p, { id_sparepart: '', qty: '1', harga: '' }]) }
    const removeItem = (idx: number) => { sparepartLocked.current = true; setItems(p => p.filter((_, i) => i !== idx)) }
    const updateItem = (idx: number, field: keyof ItemRow, value: string) => {
        sparepartLocked.current = true
        setItems(p => {
            const next = [...p]
            next[idx] = { ...next[idx], [field]: value }
            return next
        })
    }
    const pilihSparepart = (idx: number, idSparepart: string) => {
        sparepartLocked.current = true
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

    const validasiBukti = (files: File[]): File[] => {
        const valid = files.filter(f => {
            if (!f.type.startsWith('image/')) {
                toast.push(<Notification type="danger" title={`${f.name} bukan file foto`} />)
                return false
            }
            if (f.size > MAX_UKURAN_BUKTI) {
                toast.push(<Notification type="danger" title={`${f.name} melebihi 5 MB`} />)
                return false
            }
            return true
        })
        const sisa = MAX_BUKTI - buktiLama.length
        if (valid.length > sisa) {
            toast.push(<Notification type="danger" title={`Maksimal ${MAX_BUKTI} file bukti per perawatan`} />)
            return valid.slice(0, Math.max(sisa, 0))
        }
        return valid
    }

    const hapusBuktiLama = async () => {
        if (!buktiHapus || !editId || !editArmadaId) return
        setMenghapusBukti(true)
        try {
            await perawatanArmadaService.hapusBukti(editArmadaId, editId, buktiHapus.id_bukti)
            setBuktiLama(p => p.filter(b => b.id_bukti !== buktiHapus.id_bukti))
            toast.push(<Notification type="success" title="Bukti berhasil dihapus" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenghapusBukti(false)
            setBuktiHapus(null)
        }
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
            let idPerawatan: string
            let idArmadaTujuan: string
            if (isEdit && editId && editArmadaId) {
                await perawatanArmadaService.update(editArmadaId, editId, payload)
                idPerawatan = editId
                idArmadaTujuan = editArmadaId
                toast.push(<Notification type="success" title="Perawatan berhasil diperbarui" />)
            } else {
                const created = await perawatanArmadaService.create(form.id_armada, payload)
                idPerawatan = created.id_perawatan
                idArmadaTujuan = form.id_armada
                toast.push(<Notification type="success" title="Perawatan berhasil dicatat" />)
            }
            if (buktiBaru.length > 0) {
                try {
                    await perawatanArmadaService.uploadBukti(idArmadaTujuan, idPerawatan, buktiBaru)
                } catch (err) {
                    toast.push(<Notification type="warning" title={`Perawatan tersimpan, tapi upload bukti gagal: ${parseApiError(err)}. Buka Edit untuk unggah ulang.`} />)
                }
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
                        <FormItem label="Armada" asterisk className="sm:col-span-2">
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
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Bukti / Lampiran</p>
                            <Upload multiple accept={BUKTI_ACCEPT} showList={false} fileList={buktiBaru}
                                onChange={files => setBuktiBaru(validasiBukti(files))}>
                                <Button type="button" size="sm" variant="plain" icon={<HiOutlinePaperClip />}>Pilih Foto</Button>
                            </Upload>
                        </div>
                        <p className="text-xs text-gray-400 -mt-2 mb-2">Foto kerusakan / nota bengkel — JPG, PNG, WEBP · maks. 5 MB per foto · maks. {MAX_BUKTI} foto</p>
                        {buktiLama.length === 0 && buktiBaru.length === 0 ? (
                            <p className="text-gray-400 text-xs py-2">Belum ada foto bukti dilampirkan.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                                {buktiLama.map(b => (
                                    <div key={b.id_bukti} className="relative">
                                        <a href={b.url_file} target="_blank" rel="noopener noreferrer" title={`Buka ${b.nama_asli}`}>
                                            <img src={b.url_file} alt={b.nama_asli}
                                                className="w-full h-24 object-cover rounded-lg border border-gray-100 dark:border-gray-700" />
                                        </a>
                                        <p className="text-xs text-gray-400 truncate mt-1">{b.nama_asli}</p>
                                        {isEdit && (
                                            <span
                                                className="absolute top-1 right-1 cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 shadow transition-colors"
                                                onClick={() => setBuktiHapus(b)}>
                                                <HiOutlineTrash className="text-sm" />
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {buktiBaru.map((f, idx) => (
                                    <FotoBuktiBaru key={`${f.name}-${f.size}-${idx}`} file={f}
                                        onRemove={() => setBuktiBaru(p => p.filter((_, i) => i !== idx))} />
                                ))}
                            </div>
                        )}
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

            <Dialog isOpen={!!buktiHapus} onClose={() => setBuktiHapus(null)} onRequestClose={() => setBuktiHapus(null)}>
                <h5 className="mb-4">Hapus Bukti</h5>
                <p>Hapus file <span className="font-semibold">{buktiHapus?.nama_asli}</span> dari perawatan ini?</p>
                <div className="text-right mt-6 flex justify-end gap-2">
                    <Button type="button" variant="plain" onClick={() => setBuktiHapus(null)}>Batal</Button>
                    <Button type="button" variant="solid" customColorClass={() => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500'} loading={menghapusBukti} onClick={hapusBuktiLama}>Hapus</Button>
                </div>
            </Dialog>
        </div>
    )
}
