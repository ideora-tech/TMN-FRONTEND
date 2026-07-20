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
import { jabatanService } from '@/services/jabatan.service'
import { Departemen } from '@/services/departemen.service'
import { Peran } from '@/services/peran.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function JabatanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ kode_jabatan: '', nama_jabatan: '', id_departemen: '', id_peran: '', level: '1', aktif: true })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [departemenOptions, setDepartemenOptions] = useState<{ value: string; label: string }[]>([])
    const [peranOptions, setPeranOptions] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        Promise.all([
            axios.get(API_ENDPOINTS.DEPARTEMEN, { params: { limit: 999 } }),
            axios.get(API_ENDPOINTS.PERAN, { params: { limit: 999 } }),
        ]).then(([dRes, pRes]) => {
            setDepartemenOptions((dRes.data.data as Departemen[]).map(d => ({ value: d.id_departemen, label: d.nama_departemen })))
            setPeranOptions((pRes.data.data as Peran[]).map(p => ({ value: p.id_peran, label: p.nama_peran })))
        }).catch(() => {})
    }, [])

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.kode_jabatan.trim()) e.kode_jabatan = 'Kode wajib diisi'
        if (!form.nama_jabatan.trim()) e.nama_jabatan = 'Nama wajib diisi'
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
            await jabatanService.create({
                kode_jabatan: form.kode_jabatan,
                nama_jabatan: form.nama_jabatan,
                id_departemen: form.id_departemen || null,
                id_peran: form.id_peran || null,
                level: Number(form.level) || 1,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Jabatan berhasil ditambahkan" />)
            router.push(ROUTES.JABATAN)
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
                    <h3 className="font-bold">Tambah Jabatan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan jabatan baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Kode Jabatan" asterisk invalid={!!errors.kode_jabatan} errorMessage={errors.kode_jabatan}>
                        <Input placeholder="Kode unik" value={form.kode_jabatan} invalid={!!errors.kode_jabatan}
                            onChange={e => setForm(p => ({ ...p, kode_jabatan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nama Jabatan" asterisk invalid={!!errors.nama_jabatan} errorMessage={errors.nama_jabatan}>
                        <Input placeholder="Nama jabatan" value={form.nama_jabatan} invalid={!!errors.nama_jabatan}
                            onChange={e => setForm(p => ({ ...p, nama_jabatan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Departemen">
                        <Select isClearable isSearchable placeholder="Pilih departemen..."
                            options={departemenOptions}
                            value={departemenOptions.find(o => o.value === form.id_departemen) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_departemen: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Peran">
                        <Select isClearable isSearchable placeholder="Pilih peran..."
                            options={peranOptions}
                            value={peranOptions.find(o => o.value === form.id_peran) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_peran: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Level">
                        <Input type="number" min={1} placeholder="1" value={form.level}
                            onChange={e => setForm(p => ({ ...p, level: e.target.value }))} />
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
