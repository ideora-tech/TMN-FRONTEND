'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { jenisKendaraanService } from '@/services/jenis-kendaraan.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function JenisKendaraanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ kode_jenis: '', nama_jenis: '', kapasitas_muatan: '', aktif: true })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.kode_jenis.trim()) e.kode_jenis = 'Kode wajib diisi'
        if (!form.nama_jenis.trim()) e.nama_jenis = 'Nama wajib diisi'
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
            await jenisKendaraanService.create({
                kode_jenis: form.kode_jenis,
                nama_jenis: form.nama_jenis,
                kapasitas_muatan: form.kapasitas_muatan ? Number(form.kapasitas_muatan) : null,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Jenis kendaraan berhasil ditambahkan" />)
            router.push(ROUTES.JENIS_KENDARAAN)
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
                    <h3 className="font-bold">Tambah Jenis Kendaraan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan jenis kendaraan baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Kode Jenis" asterisk invalid={!!errors.kode_jenis} errorMessage={errors.kode_jenis}>
                        <Input placeholder="Kode unik" value={form.kode_jenis} invalid={!!errors.kode_jenis}
                            onChange={e => setForm(p => ({ ...p, kode_jenis: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nama Jenis" asterisk invalid={!!errors.nama_jenis} errorMessage={errors.nama_jenis}>
                        <Input placeholder="Nama jenis kendaraan" value={form.nama_jenis} invalid={!!errors.nama_jenis}
                            onChange={e => setForm(p => ({ ...p, nama_jenis: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Kapasitas Muatan (ton)">
                        <Input type="number" min={0} step="0.01" placeholder="0" value={form.kapasitas_muatan}
                            onChange={e => setForm(p => ({ ...p, kapasitas_muatan: e.target.value }))} />
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
