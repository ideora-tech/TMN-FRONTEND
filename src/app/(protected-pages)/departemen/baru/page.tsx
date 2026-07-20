'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { departemenService, Departemen } from '@/services/departemen.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function DepartemenBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ kode_departemen: '', nama_departemen: '', id_departemen_induk: '', aktif: true })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [indukOptions, setIndukOptions] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        axios.get(API_ENDPOINTS.DEPARTEMEN, { params: { limit: 999 } })
            .then(r => setIndukOptions((r.data.data as Departemen[]).map(d => ({ value: d.id_departemen, label: d.nama_departemen }))))
            .catch(() => {})
    }, [])

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.kode_departemen.trim()) e.kode_departemen = 'Kode wajib diisi'
        if (!form.nama_departemen.trim()) e.nama_departemen = 'Nama wajib diisi'
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
            await departemenService.create({
                kode_departemen: form.kode_departemen,
                nama_departemen: form.nama_departemen,
                id_departemen_induk: form.id_departemen_induk || null,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Departemen berhasil ditambahkan" />)
            router.push(ROUTES.DEPARTEMEN)
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
                    <h3 className="font-bold">Tambah Departemen</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan departemen baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Kode Departemen" asterisk invalid={!!errors.kode_departemen} errorMessage={errors.kode_departemen}>
                        <Input placeholder="Kode unik" value={form.kode_departemen} invalid={!!errors.kode_departemen}
                            onChange={e => setForm(p => ({ ...p, kode_departemen: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nama Departemen" asterisk invalid={!!errors.nama_departemen} errorMessage={errors.nama_departemen}>
                        <Input placeholder="Nama departemen" value={form.nama_departemen} invalid={!!errors.nama_departemen}
                            onChange={e => setForm(p => ({ ...p, nama_departemen: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Departemen Induk">
                        <Select isClearable isSearchable placeholder="Pilih induk (opsional)..."
                            options={indukOptions}
                            value={indukOptions.find(o => o.value === form.id_departemen_induk) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_departemen_induk: opt?.value ?? '' }))} />
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
