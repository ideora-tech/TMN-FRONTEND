'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification, Tag, Dialog, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlinePencilAlt, HiPlusCircle, HiOutlineTrash } from 'react-icons/hi'
import { ruteService, Rute, RutePayload } from '@/services/rute.service'
import { lokasiService } from '@/services/lokasi.service'
import { tarifRuteService, TarifRute } from '@/services/tarifRute.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { klienService, Klien } from '@/services/klien.service'
import TarifFields, { TarifFieldsState, EMPTY_TARIF_FIELDS_STATE, tarifFieldsToPayload } from '@/components/shared/TarifFields'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'

type LokasiOption = { value: string; label: string }

type Option = { value: string; label: string }

const statusTarif = (t: TarifRute): 'berlaku' | 'kedaluwarsa' | 'akan_datang' => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
    if (t.tanggal_mulai > today) return 'akan_datang'
    if (t.tanggal_berakhir && t.tanggal_berakhir < today) return 'kedaluwarsa'
    return 'berlaku'
}

const STATUS_TAG: Record<string, { label: string; className: string }> = {
    berlaku:     { label: 'Berlaku',     className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-0' },
    kedaluwarsa: { label: 'Kedaluwarsa', className: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400 border-0' },
    akan_datang: { label: 'Akan Datang', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 border-0' },
}

export default function RuteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]       = useState<Rute | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<RutePayload> & { estimasi_jarak_km_str?: string; estimasi_durasi_menit_str?: string }>({})
    const [saving, setSaving]   = useState(false)
    const [lokasiOptions, setLokasiOptions] = useState<LokasiOption[]>([])
    const [errors, setErrors]   = useState<Partial<Record<keyof RutePayload, string>>>({})
    const [tarifList, setTarifList] = useState<TarifRute[]>([])
    const [tarifLoading, setTarifLoading] = useState(true)
    const [jenisOptions, setJenisOptions] = useState<Option[]>([])
    const [klienOptions, setKlienOptions] = useState<Option[]>([])
    const [showAddTarif, setShowAddTarif] = useState(false)
    const [addTarifForm, setAddTarifForm] = useState<TarifFieldsState>(EMPTY_TARIF_FIELDS_STATE)
    const [addingTarif, setAddingTarif] = useState(false)
    const [editTarifTarget, setEditTarifTarget] = useState<TarifRute | null>(null)
    const [editTarifForm, setEditTarifForm] = useState<TarifFieldsState>(EMPTY_TARIF_FIELDS_STATE)
    const [updatingTarif, setUpdatingTarif] = useState(false)
    const [deleteTarifTarget, setDeleteTarifTarget] = useState<TarifRute | null>(null)
    const [deletingTarif, setDeletingTarif] = useState(false)

    useEffect(() => {
        lokasiService.list(1, 200)
            .then(res => setLokasiOptions(res.data.map(l => ({
                value: l.id_lokasi,
                label: `${l.nama_lokasi}${l.kota && l.kota.trim().toLowerCase() !== l.nama_lokasi.trim().toLowerCase() ? ' — ' + l.kota : ''}`,
            }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
        klienService.list(1, 100)
            .then(res => setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: k.nama_klien }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        ruteService.get(id)
            .then(d => {
                setData(d)
                setForm({
                    ...d,
                    id_lokasi_asal: d.id_lokasi_asal ?? '',
                    id_lokasi_tujuan: d.id_lokasi_tujuan ?? '',
                    estimasi_jarak_km_str: d.estimasi_jarak_km != null ? String(d.estimasi_jarak_km) : '',
                    estimasi_durasi_menit_str: d.estimasi_durasi_menit != null ? String(d.estimasi_durasi_menit) : '',
                })
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const fetchTarif = () => {
        setTarifLoading(true)
        tarifRuteService.list({ id_rute: id, limit: 100 })
            .then(res => setTarifList(res.data ?? []))
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setTarifLoading(false))
    }

    useEffect(() => { fetchTarif() }, [id])

    const openAddTarif = () => {
        setAddTarifForm(EMPTY_TARIF_FIELDS_STATE)
        setShowAddTarif(true)
    }

    const handleAddTarif = async () => {
        if (!addTarifForm.id_jenis_kendaraan || !addTarifForm.harga) return
        setAddingTarif(true)
        try {
            await tarifRuteService.create(tarifFieldsToPayload(addTarifForm, id))
            toast.push(<Notification type="success" title="Tarif berhasil ditambahkan" />)
            setShowAddTarif(false)
            fetchTarif()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAddingTarif(false)
        }
    }

    const openEditTarif = (t: TarifRute) => {
        setEditTarifTarget(t)
        setEditTarifForm({
            id_jenis_kendaraan: t.id_jenis_kendaraan,
            id_klien: t.id_klien ?? '',
            harga: String(Math.round(t.harga)),
            tanggal_mulai: t.tanggal_mulai,
            tanggal_berakhir: t.tanggal_berakhir ?? '',
            estimasi_tol: t.estimasi_tol != null ? String(Math.round(t.estimasi_tol)) : '',
            estimasi_bbm: t.estimasi_bbm != null ? String(Math.round(t.estimasi_bbm)) : '',
            estimasi_uang_jalan: t.estimasi_uang_jalan != null ? String(Math.round(t.estimasi_uang_jalan)) : '',
            estimasi_biaya_lain: t.estimasi_biaya_lain != null ? String(Math.round(t.estimasi_biaya_lain)) : '',
            keterangan: t.keterangan ?? '',
        })
    }

    const handleEditTarif = async () => {
        if (!editTarifTarget) return
        setUpdatingTarif(true)
        try {
            await tarifRuteService.update(editTarifTarget.id_tarif_rute, tarifFieldsToPayload(editTarifForm, id))
            toast.push(<Notification type="success" title="Tarif berhasil diperbarui" />)
            setEditTarifTarget(null)
            fetchTarif()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdatingTarif(false)
        }
    }

    const handleDeleteTarif = async () => {
        if (!deleteTarifTarget) return
        setDeletingTarif(true)
        try {
            await tarifRuteService.delete(deleteTarifTarget.id_tarif_rute)
            toast.push(<Notification type="success" title="Tarif berhasil dihapus" />)
            setDeleteTarifTarget(null)
            fetchTarif()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeletingTarif(false)
        }
    }

    const validate = () => {
        const e: Partial<Record<keyof RutePayload, string>> = {}
        if (!form.kode_rute?.trim()) e.kode_rute = 'Kode rute wajib diisi'
        if (!form.nama_rute?.trim()) e.nama_rute = 'Nama rute wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setSaving(true)
        try {
            const updated = await ruteService.update(id, {
                kode_rute: form.kode_rute,
                nama_rute: form.nama_rute,
                id_lokasi_asal: form.id_lokasi_asal || null,
                id_lokasi_tujuan: form.id_lokasi_tujuan || null,
                estimasi_jarak_km: form.estimasi_jarak_km_str ? parseFloat(form.estimasi_jarak_km_str) : null,
                estimasi_durasi_menit: form.estimasi_durasi_menit_str ? parseInt(form.estimasi_durasi_menit_str) : null,
                keterangan: form.keterangan || null,
                aktif: form.aktif,
            })
            setData(updated)
            setForm({
                ...updated,
                id_lokasi_asal: updated.id_lokasi_asal ?? '',
                id_lokasi_tujuan: updated.id_lokasi_tujuan ?? '',
                estimasi_jarak_km_str: updated.estimasi_jarak_km != null ? String(updated.estimasi_jarak_km) : '',
                estimasi_durasi_menit_str: updated.estimasi_durasi_menit != null ? String(updated.estimasi_durasi_menit) : '',
            })
            setEditing(false)
            setErrors({})
            toast.push(<Notification type="success" title="Rute berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Rute tidak ditemukan.</div>

    const initial = data.nama_rute.charAt(0).toUpperCase()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.RUTE)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">{data.nama_rute}</h4>
                    <p className="text-gray-500 text-sm mt-0.5">{data.kode_rute}</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nama_rute}</p>
                                    <p className="text-sm text-gray-500 mt-1">{data.kode_rute}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {data.aktif
                                    ? <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-0">Aktif</Tag>
                                    : <Tag className="bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400 border-0">Nonaktif</Tag>
                                }
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Kode Rute', value: data.kode_rute },
                                { label: 'Nama Rute', value: data.nama_rute },
                                { label: 'Asal',      value: data.asal ?? <span className="text-gray-400">—</span> },
                                { label: 'Tujuan',    value: data.tujuan ?? <span className="text-gray-400">—</span> },
                                {
                                    label: 'Estimasi Jarak',
                                    value: data.estimasi_jarak_km != null
                                        ? `${formatNum(data.estimasi_jarak_km)} km`
                                        : <span className="text-gray-400">—</span>
                                },
                                {
                                    label: 'Estimasi Durasi',
                                    value: data.estimasi_durasi_menit != null
                                        ? `${data.estimasi_durasi_menit} menit`
                                        : <span className="text-gray-400">—</span>
                                },
                                { label: 'Keterangan', value: data.keterangan ?? <span className="text-gray-400">—</span> },
                            ] as { label: string; value: React.ReactNode }[]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                                {initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Rute</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi rute di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                <FormItem label="Kode Rute" asterisk invalid={!!errors.kode_rute} errorMessage={errors.kode_rute}>
                                    <Input value={form.kode_rute ?? ''} invalid={!!errors.kode_rute} onChange={e => setForm(p => ({ ...p, kode_rute: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Nama Rute" asterisk invalid={!!errors.nama_rute} errorMessage={errors.nama_rute}>
                                    <Input value={form.nama_rute ?? ''} invalid={!!errors.nama_rute} onChange={e => setForm(p => ({ ...p, nama_rute: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Asal">
                                    <Select<LokasiOption> isClearable isSearchable placeholder="Pilih lokasi asal..."
                                        options={lokasiOptions}
                                        value={lokasiOptions.find(o => o.value === form.id_lokasi_asal) ?? null}
                                        onChange={opt => setForm(p => ({ ...p, id_lokasi_asal: opt?.value ?? '' }))} />
                                    {!form.id_lokasi_asal && data.asal && (
                                        <p className="text-xs text-gray-400 mt-1">Teks lama: {data.asal}</p>
                                    )}
                                </FormItem>
                                <FormItem label="Tujuan">
                                    <Select<LokasiOption> isClearable isSearchable placeholder="Pilih lokasi tujuan..."
                                        options={lokasiOptions}
                                        value={lokasiOptions.find(o => o.value === form.id_lokasi_tujuan) ?? null}
                                        onChange={opt => setForm(p => ({ ...p, id_lokasi_tujuan: opt?.value ?? '' }))} />
                                    {!form.id_lokasi_tujuan && data.tujuan && (
                                        <p className="text-xs text-gray-400 mt-1">Teks lama: {data.tujuan}</p>
                                    )}
                                </FormItem>
                                <FormItem label="Estimasi Jarak (km)">
                                    <Input type="number" step="0.01" min="0" value={form.estimasi_jarak_km_str ?? ''} onChange={e => setForm(p => ({ ...p, estimasi_jarak_km_str: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Estimasi Durasi (menit)">
                                    <Input type="number" min="0" value={form.estimasi_durasi_menit_str ?? ''} onChange={e => setForm(p => ({ ...p, estimasi_durasi_menit_str: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Keterangan" className="sm:col-span-2">
                                    <textarea
                                        rows={3}
                                        value={form.keterangan ?? ''}
                                        onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                    />
                                </FormItem>
                            </div>
                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button type="button" variant="plain" onClick={() => {
                                    setEditing(false)
                                    setForm({
                                        ...data,
                                        id_lokasi_asal: data.id_lokasi_asal ?? '',
                                        id_lokasi_tujuan: data.id_lokasi_tujuan ?? '',
                                        estimasi_jarak_km_str: data.estimasi_jarak_km != null ? String(data.estimasi_jarak_km) : '',
                                        estimasi_durasi_menit_str: data.estimasi_durasi_menit != null ? String(data.estimasi_durasi_menit) : '',
                                    })
                                    setErrors({})
                                }}>Batal</Button>
                                <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                            </div>
                        </form>
                    </>
                )}
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tarif</p>
                        <p className="text-xs text-gray-400 mt-0.5">{tarifList.length} tarif terdaftar</p>
                    </div>
                    <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={openAddTarif}>
                        Tambah Tarif
                    </Button>
                </div>

                {showAddTarif && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <TarifFields value={addTarifForm} onChange={setAddTarifForm}
                            jenisOptions={jenisOptions} klienOptions={klienOptions} idRute={id} />
                        <div className="flex justify-end gap-2 mt-4">
                            <Button size="sm" variant="plain" onClick={() => setShowAddTarif(false)}>Batal</Button>
                            <Button size="sm" variant="solid" loading={addingTarif}
                                disabled={!addTarifForm.id_jenis_kendaraan || !addTarifForm.harga}
                                onClick={handleAddTarif}>Simpan</Button>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </div>
                )}

                {tarifLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : tarifList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada tarif untuk rute ini</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Jenis Kendaraan</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Klien</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Harga</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Periode</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {tarifList.map(t => {
                                    const s = STATUS_TAG[statusTarif(t)]
                                    return (
                                        <tr key={t.id_tarif_rute}>
                                            <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{t.nama_jenis ?? '—'}</td>
                                            <td className="py-3 pr-4">
                                                {t.id_klien
                                                    ? t.nama_klien
                                                    : <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300 border-0">Umum</Tag>}
                                            </td>
                                            <td className="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">{formatRupiah(t.harga)}</td>
                                            <td className="py-3 pr-4 text-sm">{t.tanggal_mulai} — {t.tanggal_berakhir ?? '∞'}</td>
                                            <td className="py-3 pr-4"><Tag className={s.className}>{s.label}</Tag></td>
                                            <td className="py-3 text-right whitespace-nowrap">
                                                <Button size="xs" variant="plain" icon={<HiOutlinePencilAlt />} className="mr-1"
                                                    onClick={() => openEditTarif(t)} />
                                                <Button size="xs" variant="plain" icon={<HiOutlineTrash />}
                                                    onClick={() => setDeleteTarifTarget(t)} />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Dialog isOpen={!!editTarifTarget} onRequestClose={() => setEditTarifTarget(null)} width={560}>
                <h5 className="text-base font-semibold mb-5">Edit Tarif</h5>
                <TarifFields value={editTarifForm} onChange={setEditTarifForm}
                    jenisOptions={jenisOptions} klienOptions={klienOptions} idRute={id} />
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={() => setEditTarifTarget(null)}>Batal</Button>
                    <Button variant="solid" loading={updatingTarif} onClick={handleEditTarif}>Simpan</Button>
                </div>
            </Dialog>

            <ConfirmDialog isOpen={!!deleteTarifTarget} type="danger" title="Hapus Tarif"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteTarifTarget(null)}
                onCancel={() => setDeleteTarifTarget(null)}
                onConfirm={handleDeleteTarif}
                confirmButtonProps={{ loading: deletingTarif }}>
                <p>Tarif ini akan dihapus secara permanen. Lanjutkan?</p>
            </ConfirmDialog>
        </div>
    )
}