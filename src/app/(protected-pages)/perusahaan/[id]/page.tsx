'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Select, toast, Notification } from '@/components/ui'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { perusahaanService, Perusahaan } from '@/services/perusahaan.service'

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function PerusahaanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [perusahaan, setPerusahaan] = useState<Perusahaan | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Perusahaan>>({})
    const [saving, setSaving]   = useState(false)
    const [errors, setErrors]   = useState<Partial<Record<keyof Perusahaan, string>>>({})

    useEffect(() => {
        perusahaanService.get(id)
            .then(p => { setPerusahaan(p); setForm(p) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const validate = () => {
        const e: Partial<Record<keyof Perusahaan, string>> = {}
        if (!form.nama?.trim()) e.nama = 'Nama perusahaan wajib diisi'
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
            const updated = await perusahaanService.update(id, {
                nama:    form.nama,
                email:   form.email || null,
                telepon: form.telepon || null,
                alamat:  form.alamat || null,
                nama_bank:          form.nama_bank || null,
                atas_nama_rekening: form.atas_nama_rekening || null,
                nomor_rekening:     form.nomor_rekening || null,
                aktif:   form.aktif,
            })
            setPerusahaan(updated)
            setEditing(false)
            setErrors({})
            toast.push(<Notification type="success" title="Data perusahaan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!perusahaan) return <div className="p-6 text-red-500">Perusahaan tidak ditemukan.</div>

    const initial = perusahaan.nama?.charAt(0).toUpperCase() ?? 'P'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PERUSAHAAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{perusahaan.nama}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan pengelolaan data perusahaan</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{perusahaan.nama}</p>
                                    <p className="text-sm text-gray-500 mt-1">{perusahaan.email ?? 'Tidak ada email'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${perusahaan.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {perusahaan.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Nama Perusahaan', value: perusahaan.nama },
                                { label: 'Email',           value: perusahaan.email ?? <span className="text-gray-400">—</span> },
                                { label: 'Telepon',         value: perusahaan.telepon ?? <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                        {perusahaan.alamat && (
                            <div className="mt-5">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Alamat</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line">{perusahaan.alamat}</p>
                            </div>
                        )}
                        {(perusahaan.nama_bank || perusahaan.atas_nama_rekening || perusahaan.nomor_rekening) && (
                            <div className="mt-5">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Rekening Bank (untuk invoice)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-3">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-0.5">Nama Bank</p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{perusahaan.nama_bank ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-0.5">Nama Rekening</p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{perusahaan.atas_nama_rekening ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-0.5">No. Rekening</p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{perusahaan.nomor_rekening ?? '—'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Perusahaan</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi perusahaan di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <div className="sm:col-span-2">
                                <FormItem label="Nama Perusahaan" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                                    <Input value={form.nama ?? ''} invalid={!!errors.nama} onChange={(e) => setForm(p => ({ ...p, nama: e.target.value }))} />
                                </FormItem>
                            </div>
                            <FormItem label="Email">
                                <Input type="email" value={form.email ?? ''} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Telepon">
                                <Input value={form.telepon ?? ''} onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                                    onChange={(opt) => setForm(p => ({ ...p, aktif: opt?.value === '1' }))} />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Alamat">
                                    <textarea rows={3} value={form.alamat ?? ''}
                                        onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
                                </FormItem>
                            </div>
                            <div className="sm:col-span-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Rekening Bank (untuk invoice)</p>
                            </div>
                            <FormItem label="Nama Bank">
                                <Input value={form.nama_bank ?? ''} onChange={(e) => setForm(p => ({ ...p, nama_bank: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nama Rekening">
                                <Input value={form.atas_nama_rekening ?? ''} onChange={(e) => setForm(p => ({ ...p, atas_nama_rekening: e.target.value }))} />
                            </FormItem>
                            <FormItem label="No. Rekening">
                                <Input value={form.nomor_rekening ?? ''} onChange={(e) => setForm(p => ({ ...p, nomor_rekening: e.target.value }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(perusahaan); setErrors({}) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    )
}