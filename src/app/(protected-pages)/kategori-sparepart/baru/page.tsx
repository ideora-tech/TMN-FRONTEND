'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { kategoriSparepartService } from '@/services/kategoriSparepart.service'

export default function KategoriSparepartBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ nama: '', keterangan: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.nama.trim()) e.nama = 'Nama kategori wajib diisi'
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
            await kategoriSparepartService.create({
                nama: form.nama,
                keterangan: form.keterangan.trim() ? form.keterangan.trim() : null,
            })
            toast.push(<Notification type="success" title="Kategori sparepart berhasil ditambahkan" />)
            router.push(ROUTES.KATEGORI_SPAREPART)
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
                    <h3 className="font-bold">Tambah Kategori Sparepart</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan kategori spare part baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Nama Kategori" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                        <Input placeholder="Contoh: Oli & Pelumas, Filter" value={form.nama} invalid={!!errors.nama}
                            onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
                    </FormItem>
                    <div className="sm:col-span-2">
                        <FormItem label="Keterangan">
                            <Input textArea rows={3} placeholder="Keterangan tambahan (opsional)" value={form.keterangan}
                                onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                        </FormItem>
                    </div>
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
