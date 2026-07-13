'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, Select, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { projectService } from '@/services/project.service'
import { klienService, Klien } from '@/services/klien.service'

const STATUS_OPTIONS = [
    { value: 'draft',   label: 'Draft' },
    { value: 'aktif',   label: 'Aktif' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'batal',   label: 'Batal' },
]

export default function ProjectBaruPage() {
    const router       = useRouter()
    const searchParams = useSearchParams()
    const [form, setForm] = useState({
        id_klien:          searchParams.get('id_klien') ?? '',
        kode_proyek:       '',
        nama_proyek:       searchParams.get('nama_proyek') ?? '',
        tanggal_mulai:     '',
        tanggal_selesai:   '',
        status:            'draft',
        keterangan:        '',
    })
    const fromPenawaran = searchParams.get('id_penawaran')
    const [klienOptions, setKlienOptions] = useState<{ value: string; label: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})

    useEffect(() => {
        klienService.list(1).then(res =>
            setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: `${k.kode_klien} — ${k.nama_klien}` })))
        ).catch(() => {})
    }, [])

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.id_klien)           e.id_klien    = 'Klien wajib dipilih'
        if (!form.kode_proyek.trim()) e.kode_proyek = 'Kode proyek wajib diisi'
        if (!form.nama_proyek.trim()) e.nama_proyek = 'Nama proyek wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await projectService.create({
                id_klien: form.id_klien, kode_proyek: form.kode_proyek, nama_proyek: form.nama_proyek,
                tanggal_mulai: form.tanggal_mulai || undefined, tanggal_selesai: form.tanggal_selesai || undefined,
                status: form.status || undefined, keterangan: form.keterangan || undefined,
            })
            toast.push(<Notification type="success" title="Proyek berhasil ditambahkan" />)
            router.push(ROUTES.PROYEK)
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
                    <h3 className="font-bold">Tambah Proyek Baru</h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {fromPenawaran ? 'Proyek dari penawaran yang disetujui' : 'Daftarkan proyek baru ke sistem'}
                    </p>
                </div>
            </div>
            <Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <div className="sm:col-span-2">
                        <FormItem label="Klien" asterisk invalid={!!errors.id_klien} errorMessage={errors.id_klien}>
                            <Select placeholder="Cari atau pilih klien..." options={klienOptions}
                                value={klienOptions.find(o => o.value === form.id_klien) ?? null}
                                onChange={(opt) => setForm(p => ({ ...p, id_klien: opt?.value ?? '' }))}
                                invalid={!!errors.id_klien} />
                        </FormItem>
                    </div>
                    <FormItem label="Kode Proyek" asterisk invalid={!!errors.kode_proyek} errorMessage={errors.kode_proyek}>
                        <Input placeholder="Contoh: PRY-2024-001" value={form.kode_proyek} invalid={!!errors.kode_proyek}
                            onChange={(e) => setForm(p => ({ ...p, kode_proyek: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nama Proyek" asterisk invalid={!!errors.nama_proyek} errorMessage={errors.nama_proyek}>
                        <Input placeholder="Nama proyek" value={form.nama_proyek} invalid={!!errors.nama_proyek}
                            onChange={(e) => setForm(p => ({ ...p, nama_proyek: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Tanggal Mulai">
                        <DatePicker value={form.tanggal_mulai ? new Date(form.tanggal_mulai) : null}
                            onChange={(date) => setForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Tanggal Selesai">
                        <DatePicker value={form.tanggal_selesai ? new Date(form.tanggal_selesai) : null}
                            onChange={(date) => setForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Status">
                        <Select options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, status: opt?.value ?? 'draft' }))} />
                    </FormItem>
                    <div className="sm:col-span-2">
                        <FormItem label="Keterangan">
                            <textarea rows={3} value={form.keterangan}
                                onChange={(e) => setForm(p => ({ ...p, keterangan: e.target.value }))}
                                placeholder="Keterangan tambahan (opsional)"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
                        </FormItem>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button variant="solid" loading={loading} onClick={handleSubmit}>Simpan</Button>
                </div>
            </Card>
        </div>
    )
}
