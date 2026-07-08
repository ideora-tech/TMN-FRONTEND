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
import { penggunaService } from '@/services/pengguna.service'
import { Peran } from '@/services/peran.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function PenggunaBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ username: '', email: '', kata_sandi: '', kode_peran: '', aktif: true })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [peranOptions, setPeranOptions] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        axios.get(API_ENDPOINTS.PERAN, { params: { limit: 999 } })
            .then(r => setPeranOptions((r.data.data as Peran[]).map(p => ({ value: p.kode_peran, label: p.nama_peran }))))
            .catch(() => {})
    }, [])

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.username.trim()) e.username = 'Username wajib diisi'
        if (!form.email.trim()) e.email = 'Email wajib diisi'
        if (!form.kata_sandi.trim()) e.kata_sandi = 'Kata sandi wajib diisi'
        else if (form.kata_sandi.length < 6) e.kata_sandi = 'Kata sandi minimal 6 karakter'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await penggunaService.create({
                id_perusahaan: null,
                id_karyawan: null,
                username: form.username,
                email: form.email,
                kata_sandi: form.kata_sandi,
                kode_peran: form.kode_peran || null,
                aktif: form.aktif,
                harus_ganti_password: false,
            })
            toast.push(<Notification type="success" title="Pengguna berhasil ditambahkan" />)
            router.push(ROUTES.PENGGUNA)
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
                    <h3 className="font-bold">Tambah Pengguna</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Buat akun pengguna baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Username" asterisk invalid={!!errors.username} errorMessage={errors.username}>
                        <Input placeholder="Username login" value={form.username} invalid={!!errors.username}
                            onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Email" asterisk invalid={!!errors.email} errorMessage={errors.email}>
                        <Input type="email" placeholder="email@tmn.com" value={form.email} invalid={!!errors.email}
                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Kata Sandi" asterisk invalid={!!errors.kata_sandi} errorMessage={errors.kata_sandi}>
                        <Input type="password" placeholder="Min. 6 karakter" value={form.kata_sandi} invalid={!!errors.kata_sandi}
                            onChange={e => setForm(p => ({ ...p, kata_sandi: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Peran">
                        <Select isClearable isSearchable placeholder="Pilih peran..."
                            options={peranOptions}
                            value={peranOptions.find(o => o.value === form.kode_peran) ?? null}
                            onChange={opt => setForm(p => ({ ...p, kode_peran: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Status">
                        <Select isSearchable={false} options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                            onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
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
