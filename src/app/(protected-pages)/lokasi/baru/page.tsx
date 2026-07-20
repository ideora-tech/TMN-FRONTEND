'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { lokasiService } from '@/services/lokasi.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function LokasiBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ nama_lokasi: '', alamat: '', kota: '', aktif: true })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.nama_lokasi.trim()) e.nama_lokasi = 'Nama lokasi wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setLoading(true)
        try {
            await lokasiService.create({
                nama_lokasi: form.nama_lokasi,
                alamat: form.alamat || null,
                kota: form.kota || null,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Lokasi berhasil ditambahkan" />)
            router.push(ROUTES.LOKASI)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Tambah Lokasi</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan lokasi rute baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Nama Lokasi" asterisk invalid={!!errors.nama_lokasi} errorMessage={errors.nama_lokasi}>
                        <Input placeholder="Nama lokasi" value={form.nama_lokasi} invalid={!!errors.nama_lokasi}
                            onChange={e => setForm(p => ({ ...p, nama_lokasi: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Kota">
                        <Input placeholder="Nama kota" value={form.kota}
                            onChange={e => setForm(p => ({ ...p, kota: e.target.value }))} />
                    </FormItem>
                    <div className="sm:col-span-2">
                        <FormItem label="Alamat">
                            <textarea rows={2} value={form.alamat}
                                onChange={e => setForm(p => ({ ...p, alamat: e.target.value }))}
                                placeholder="Alamat lengkap lokasi"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
                        </FormItem>
                    </div>
                    <FormItem label="Status">
                        <Select isSearchable={false} options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                            onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button type="submit" variant="solid" loading={loading}>Simpan</Button>
                </div>
                </form>
            </Card>
        </div>
    )
}
