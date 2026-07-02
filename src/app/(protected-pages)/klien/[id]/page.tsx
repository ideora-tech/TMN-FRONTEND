'use client'
import { useEffect, useState } from 'react'
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

export default function KlienDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [klien, setKlien]     = useState<Klien | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Klien>>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        klienService.get(params.id)
            .then(k => { setKlien(k); setForm(k) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [params.id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await klienService.update(params.id, form)
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

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.KLIEN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{klien.nama_klien}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan pengelolaan data klien</p>
                </div>
            </div>

            <Card>
                <div className="flex justify-end mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${klien.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                        {klien.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                </div>

                {!editing ? (
                    <>
                        <div className="flex flex-col gap-0">
                            {[
                                { label: 'Kode Klien', value: klien.kode_klien },
                                { label: 'Nama Klien', value: klien.nama_klien },
                                { label: 'Email',      value: klien.email ?? '-' },
                                { label: 'Telepon',    value: klien.telepon ?? '-' },
                                { label: 'Alamat',     value: klien.alamat ?? '-' },
                                { label: 'Kontak PIC', value: klien.kontak_pic ?? '-' },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between py-2 border-b last:border-b-0">
                                    <span className="text-gray-500">{label}</span>
                                    <span className="font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-6">
                            <Button
                                variant="solid"
                                customColorClass={() => 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-500'}
                                icon={<HiOutlinePencilAlt />}
                                onClick={() => setEditing(true)}
                            >
                                Edit
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col gap-1">
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
                            <FormItem label="Alamat">
                                <textarea
                                    rows={3}
                                    value={form.alamat ?? ''}
                                    onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                                />
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
                        </div>
                        <div className="flex gap-2 mt-6">
                            <Button
                                variant="solid"
                                customColorClass={() => 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-500'}
                                loading={saving}
                                onClick={handleSave}
                            >
                                Simpan
                            </Button>
                            <Button variant="plain" onClick={() => { setEditing(false); setForm(klien) }}>Batal</Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    )
}
