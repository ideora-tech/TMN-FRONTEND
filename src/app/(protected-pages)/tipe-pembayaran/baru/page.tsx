'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { tipePembayaranService } from '@/services/tipe-pembayaran.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function TipePembayaranBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ kode_tipe: '', nama_tipe: '', aktif: true })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.kode_tipe.trim()) e.kode_tipe = 'Kode wajib diisi'
        if (!form.nama_tipe.trim()) e.nama_tipe = 'Nama wajib diisi'
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
            await tipePembayaranService.create({
                kode_tipe: form.kode_tipe,
                nama_tipe: form.nama_tipe,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Tipe pembayaran berhasil ditambahkan" />)
            router.push(ROUTES.TIPE_PEMBAYARAN)
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
                    <h3 className="font-bold">Tambah Tipe Pembayaran</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan tipe pembayaran baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Kode Tipe" asterisk invalid={!!errors.kode_tipe} errorMessage={errors.kode_tipe}>
                        <Input placeholder="Kode unik, mis. termin_3x" value={form.kode_tipe} invalid={!!errors.kode_tipe}
                            onChange={e => setForm(p => ({ ...p, kode_tipe: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nama Tipe" asterisk invalid={!!errors.nama_tipe} errorMessage={errors.nama_tipe}>
                        <Input placeholder="Nama tampilan, mis. Termin 3x" value={form.nama_tipe} invalid={!!errors.nama_tipe}
                            onChange={e => setForm(p => ({ ...p, nama_tipe: e.target.value }))} />
                    </FormItem>
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
