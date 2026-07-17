'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlinePlus, HiOutlineX } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { jenisBbmService, JenisBbm, HargaBbm } from '@/services/jenisBbm.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

const emptyHargaForm = () => ({ harga_per_liter: '', berlaku_mulai: dayjs().format('YYYY-MM-DD') })

export default function JenisBbmDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    // info jenis BBM
    const [data, setData]     = useState<JenisBbm | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<JenisBbm>>({})
    const [errors, setErrors]   = useState<Partial<Record<keyof typeof form, string>>>({})
    const [saving, setSaving]   = useState(false)

    // riwayat harga
    const [riwayat, setRiwayat]         = useState<HargaBbm[]>([])
    const [riwayatLoading, setRiwayatLoading] = useState(false)
    const [showHargaForm, setShowHargaForm] = useState(false)
    const [hargaForm, setHargaForm]     = useState(emptyHargaForm())
    const [hargaErrors, setHargaErrors] = useState<Partial<Record<keyof ReturnType<typeof emptyHargaForm>, string>>>({})
    const [addingHarga, setAddingHarga] = useState(false)

    useEffect(() => {
        jenisBbmService.get(id)
            .then(d => { setData(d); setForm(d) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const fetchRiwayat = useCallback(async () => {
        setRiwayatLoading(true)
        try { setRiwayat(await jenisBbmService.listHarga(id)) }
        catch (err) { toast.push(<Notification type="danger" title={parseApiError(err)} />) }
        finally { setRiwayatLoading(false) }
    }, [id])

    useEffect(() => { fetchRiwayat() }, [fetchRiwayat])

    const refetchInfo = async () => {
        try { const d = await jenisBbmService.get(id); setData(d); setForm(d) }
        catch (err) { toast.push(<Notification type="danger" title={parseApiError(err)} />) }
    }

    // --- handlers info ---
    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.nama_bbm?.trim()) e.nama_bbm = 'Nama BBM wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) return
        setSaving(true)
        try {
            const updated = await jenisBbmService.update(id, {
                nama_bbm: form.nama_bbm,
                aktif:    form.aktif,
            })
            setData(updated); setEditing(false); setErrors({})
            toast.push(<Notification type="success" title="Jenis BBM berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    // --- handlers riwayat harga ---
    const validateHarga = () => {
        const e: Partial<Record<keyof ReturnType<typeof emptyHargaForm>, string>> = {}
        if (!hargaForm.harga_per_liter) e.harga_per_liter = 'Harga wajib diisi'
        if (!hargaForm.berlaku_mulai)   e.berlaku_mulai   = 'Tanggal berlaku wajib diisi'
        setHargaErrors(e)
        return Object.keys(e).length === 0
    }

    const handleAddHarga = async () => {
        if (!validateHarga()) return
        setAddingHarga(true)
        try {
            await jenisBbmService.createHarga(id, {
                harga_per_liter: Number(hargaForm.harga_per_liter) || 0,
                berlaku_mulai:   hargaForm.berlaku_mulai,
            })
            toast.push(<Notification type="success" title="Harga BBM berhasil ditambahkan" />)
            setHargaForm(emptyHargaForm())
            setHargaErrors({})
            setShowHargaForm(false)
            await Promise.all([fetchRiwayat(), refetchInfo()])
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAddingHarga(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Jenis BBM tidak ditemukan.</div>

    const initial = data.nama_bbm?.charAt(0).toUpperCase() ?? 'B'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.JENIS_BBM)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.nama_bbm}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Detail jenis BBM dan riwayat harga</p>
                </div>
            </div>

            {/* Info Jenis BBM */}
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nama_bbm}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {data.harga_per_liter != null ? `${formatRupiah(data.harga_per_liter)}/liter` : 'Belum ada harga'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${data.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {data.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Nama BBM',       value: data.nama_bbm },
                                { label: 'Harga Efektif',  value: data.harga_per_liter != null ? formatRupiah(data.harga_per_liter) : <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
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
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama_bbm?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Jenis BBM</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi jenis BBM di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nama BBM" asterisk invalid={!!errors.nama_bbm} errorMessage={errors.nama_bbm}>
                                <Input value={form.nama_bbm ?? ''} invalid={!!errors.nama_bbm} onChange={e => setForm(p => ({ ...p, nama_bbm: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(data); setErrors({}) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>

            {/* Riwayat Harga */}
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Harga</p>
                        <p className="text-xs text-gray-400 mt-0.5">Diurutkan dari tanggal berlaku terbaru</p>
                    </div>
                    <Button size="sm" variant="solid" icon={<HiOutlinePlus />} onClick={() => setShowHargaForm(v => !v)}>
                        Tambah Harga
                    </Button>
                </div>

                {/* Form inline tambah harga */}
                {showHargaForm && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Harga per Liter (Rp)" asterisk invalid={!!hargaErrors.harga_per_liter} errorMessage={hargaErrors.harga_per_liter}>
                                <Input prefix="Rp" placeholder="0" invalid={!!hargaErrors.harga_per_liter}
                                    value={hargaForm.harga_per_liter ? formatNum(Number(hargaForm.harga_per_liter)) : ''}
                                    onChange={e => setHargaForm(p => ({ ...p, harga_per_liter: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Berlaku Mulai" asterisk invalid={!!hargaErrors.berlaku_mulai} errorMessage={hargaErrors.berlaku_mulai}>
                                <DatePicker
                                    value={hargaForm.berlaku_mulai ? new Date(hargaForm.berlaku_mulai) : null}
                                    onChange={date => setHargaForm(p => ({ ...p, berlaku_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button size="sm" variant="plain" icon={<HiOutlineX />}
                                onClick={() => { setShowHargaForm(false); setHargaForm(emptyHargaForm()); setHargaErrors({}) }}>
                                Batal
                            </Button>
                            <Button size="sm" variant="solid" loading={addingHarga} onClick={handleAddHarga}>
                                Simpan
                            </Button>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </div>
                )}

                {riwayatLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : riwayat.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada riwayat harga tercatat</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Harga</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Berlaku Mulai</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Dibuat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {riwayat.map(h => (
                                    <tr key={h.id_harga_bbm}>
                                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{formatRupiah(h.harga_per_liter)}</td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {dayjs(h.berlaku_mulai).format('DD MMM YYYY')}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500 text-xs whitespace-nowrap">
                                            {dayjs(h.dibuat_pada).format('DD MMM YYYY HH:mm')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
