'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Select, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { modulService } from '@/services/modul.service'

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function ModulBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ kode_modul: '', nama_modul: '', urutan: '1', aktif: true })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors]   = useState<Partial<Record<keyof typeof form, string>>>({})

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.kode_modul.trim()) e.kode_modul = 'Kode modul wajib diisi'
        if (!form.nama_modul.trim()) e.nama_modul = 'Nama modul wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await modulService.create({
                kode_modul: form.kode_modul,
                nama_modul: form.nama_modul,
                urutan:     Number(form.urutan) || 1,
                aktif:      form.aktif,
            })
            toast.push(<Notification type="success" title="Modul berhasil ditambahkan" />)
            router.push(ROUTES.MODUL)
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
                    <h3 className="font-bold">Tambah Modul</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Tambah modul sistem baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Kode Modul" asterisk invalid={!!errors.kode_modul} errorMessage={errors.kode_modul}>
                        <Input placeholder="Contoh: HR, FLEET, FIN" value={form.kode_modul} invalid={!!errors.kode_modul}
                            onChange={(e) => setForm(p => ({ ...p, kode_modul: e.target.value.toUpperCase() }))} />
                    </FormItem>
                    <FormItem label="Nama Modul" asterisk invalid={!!errors.nama_modul} errorMessage={errors.nama_modul}>
                        <Input placeholder="Nama modul" value={form.nama_modul} invalid={!!errors.nama_modul}
                            onChange={(e) => setForm(p => ({ ...p, nama_modul: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Urutan">
                        <Input type="number" min={1} value={form.urutan}
                            onChange={(e) => setForm(p => ({ ...p, urutan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Status">
                        <Select isSearchable={false} options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, aktif: opt?.value === '1' }))} />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button type="submit" variant="solid" loading={loading}>Simpan</Button>
                </div>
            </form>
            </Card>
        </div>
    )
}
