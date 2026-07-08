'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Select, toast, Notification } from '@/components/ui'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { klienService, Klien } from '@/services/klien.service'

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function KlienDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [klien, setKlien]     = useState<Klien | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Klien>>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        klienService.get(id)
            .then(k => { setKlien(k); setForm(k) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await klienService.update(id, form)
            setKlien(updated)
            setEditing(false)
            toast.push(<Notification type="success" title="Data klien berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!klien)  return <div className="p-6 text-red-500">Klien tidak ditemukan.</div>

    const initial = klien.nama_klien?.charAt(0).toUpperCase() ?? 'K'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.KLIEN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{klien.nama_klien}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kode: {klien.kode_klien}</p>
                </div>
            </div>

            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{klien.nama_klien}</p>
                                    <p className="text-sm text-gray-500 mt-1">Kode: {klien.kode_klien}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${klien.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {klien.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Kode Klien',  value: klien.kode_klien },
                                { label: 'Nama Klien',  value: klien.nama_klien },
                                { label: 'Email',       value: klien.email ?? <span className="text-gray-400">—</span> },
                                { label: 'Telepon',     value: klien.telepon ?? <span className="text-gray-400">—</span> },
                                { label: 'Kontak PIC',  value: klien.kontak_pic ?? <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                        {klien.alamat && (
                            <div className="mt-5">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Alamat</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line">{klien.alamat}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama_klien?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Klien</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi klien di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Kode Klien">
                                <Input value={form.kode_klien ?? ''} onChange={(e) => setForm(p => ({ ...p, kode_klien: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nama Klien">
                                <Input value={form.nama_klien ?? ''} onChange={(e) => setForm(p => ({ ...p, nama_klien: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Email">
                                <Input type="email" value={form.email ?? ''} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Telepon">
                                <Input value={form.telepon ?? ''} onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Kontak PIC">
                                <Input value={form.kontak_pic ?? ''} onChange={(e) => setForm(p => ({ ...p, kontak_pic: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select
                                    options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                                    onChange={(opt) => setForm(p => ({ ...p, aktif: opt?.value === '1' }))}
                                />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Alamat">
                                    <textarea
                                        rows={3}
                                        value={form.alamat ?? ''}
                                        onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                                    />
                                </FormItem>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(klien) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    )
}