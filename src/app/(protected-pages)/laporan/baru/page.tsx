'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Select, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { laporanService } from '@/services/laporan.service'
import { projectService, Project } from '@/services/project.service'

export default function LaporanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ id_proyek: '', ringkasan: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})
    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        projectService.list(1)
            .then((res) => setProyekOptions(res.data.map((p: Project) => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` }))))
            .catch(() => {})
    }, [])

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.id_proyek.trim()) e.id_proyek = 'ID Proyek wajib diisi'
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
            await laporanService.create({ id_proyek: form.id_proyek, ringkasan: form.ringkasan || undefined })
            toast.push(<Notification type="success" title="Laporan berhasil dibuat" />)
            router.push(ROUTES.LAPORAN)
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
                    <h3 className="font-bold">Buat Laporan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Buat laporan baru untuk proyek</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Proyek" asterisk invalid={!!errors.id_proyek} errorMessage={errors.id_proyek}>
                        <Select
                            placeholder="Pilih proyek..."
                            options={proyekOptions}
                            value={proyekOptions.find(o => o.value === form.id_proyek) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, id_proyek: opt?.value ?? '' }))}
                            invalid={!!errors.id_proyek}
                        />
                    </FormItem>
                    <div className="sm:col-span-2">
                        <FormItem label="Ringkasan">
                            <textarea rows={4} value={form.ringkasan}
                                onChange={(e) => setForm(p => ({ ...p, ringkasan: e.target.value }))}
                                placeholder="Ringkasan laporan..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
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
