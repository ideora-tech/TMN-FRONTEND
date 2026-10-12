'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification, Tooltip } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { rekeningPerusahaanService, RekeningPerusahaan, POLA_NOMOR_REKENING } from '@/services/rekening-perusahaan.service'

const UTAMA_OPTIONS = [{ value: 'false', label: 'Bukan rekening utama' }, { value: 'true', label: 'Rekening utama' }]

type FormRekening = { nama_bank: string; nomor_rekening: string; atas_nama_rekening: string; utama: boolean }

const keForm = (d: RekeningPerusahaan): FormRekening => ({
    nama_bank: d.nama_bank,
    nomor_rekening: d.nomor_rekening,
    atas_nama_rekening: d.atas_nama_rekening ?? '',
    utama: d.utama,
})

export default function RekeningPerusahaanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]       = useState<RekeningPerusahaan | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<FormRekening>({ nama_bank: '', nomor_rekening: '', atas_nama_rekening: '', utama: false })
    const [errors, setErrors]   = useState<Partial<Record<keyof FormRekening, string>>>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        rekeningPerusahaanService.get(id)
            .then(d => { setData(d); setForm(keForm(d)) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const validate = () => {
        const e: Partial<Record<keyof FormRekening, string>> = {}
        if (!form.nama_bank.trim()) e.nama_bank = 'Nama bank wajib diisi'
        if (!form.nomor_rekening.trim()) e.nomor_rekening = 'Nomor rekening wajib diisi'
        else if (!POLA_NOMOR_REKENING.test(form.nomor_rekening.trim())) e.nomor_rekening = 'Nomor rekening hanya boleh berisi angka, spasi, titik, atau strip'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (saving) return
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setSaving(true)
        try {
            const updated = await rekeningPerusahaanService.update(id, {
                nama_bank: form.nama_bank.trim(),
                nomor_rekening: form.nomor_rekening.trim(),
                atas_nama_rekening: form.atas_nama_rekening.trim() || null,
                ...(form.utama !== data?.utama ? { utama: form.utama } : {}),
            })
            setData(updated); setForm(keForm(updated)); setEditing(false); setErrors({})
            toast.push(<Notification type="success" title="Rekening berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Rekening tidak ditemukan.</div>

    const initial = data.nama_bank.charAt(0).toUpperCase() || 'R'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.REKENING_PERUSAHAAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.nama_bank}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">No. Rekening: {data.nomor_rekening}</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nama_bank}</p>
                                    <p className="text-sm text-gray-500 mt-1 font-mono">{data.nomor_rekening}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {data.utama && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                                        Rekening Utama
                                    </span>
                                )}
                                <Tooltip title="Edit">
                                    <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)} />
                                </Tooltip>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Nama Bank', value: data.nama_bank },
                                { label: 'No. Rekening', value: <span className="font-mono">{data.nomor_rekening}</span> },
                                { label: 'Atas Nama', value: data.atas_nama_rekening ?? <span className="text-gray-400">—</span> },
                                { label: 'Rekening Utama', value: data.utama ? 'Ya — tercetak di invoice' : 'Bukan' },
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
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama_bank.charAt(0).toUpperCase() || initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Rekening Perusahaan</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi rekening di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nama Bank" asterisk invalid={!!errors.nama_bank} errorMessage={errors.nama_bank}>
                                <Input maxLength={100} value={form.nama_bank} invalid={!!errors.nama_bank}
                                    onChange={e => setForm(p => ({ ...p, nama_bank: e.target.value }))} />
                            </FormItem>
                            <FormItem label="No. Rekening" asterisk invalid={!!errors.nomor_rekening} errorMessage={errors.nomor_rekening}>
                                <Input maxLength={50} value={form.nomor_rekening} invalid={!!errors.nomor_rekening}
                                    onChange={e => setForm(p => ({ ...p, nomor_rekening: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Atas Nama">
                                <Input maxLength={200} value={form.atas_nama_rekening}
                                    onChange={e => setForm(p => ({ ...p, atas_nama_rekening: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Rekening Utama"
                                extra={data.utama ? <span className="text-xs text-gray-400 ml-2">untuk mengganti, jadikan rekening lain sebagai utama</span> : undefined}>
                                <Select isSearchable={false} isDisabled={data.utama} options={UTAMA_OPTIONS}
                                    value={UTAMA_OPTIONS.find(o => o.value === String(form.utama)) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, utama: opt?.value === 'true' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(keForm(data)); setErrors({}) }}>Kembali</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}

                {!editing && (
                    <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Kembali</Button>
                    </div>
                )}
            </Card>
        </div>
    )
}
