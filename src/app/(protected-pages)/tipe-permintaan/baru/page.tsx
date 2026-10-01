'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { tipePermintaanService, JenisFormPermintaan, JENIS_FORM_LABEL, JENIS_FORM_HINT } from '@/services/tipe-permintaan.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]
const JENIS_FORM_OPTIONS = (Object.keys(JENIS_FORM_LABEL) as JenisFormPermintaan[]).map(k => ({ value: k, label: JENIS_FORM_LABEL[k] }))

export default function TipePermintaanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState<{ nama_tipe: string; jenis_form: JenisFormPermintaan | ''; aktif: boolean }>({ nama_tipe: '', jenis_form: '', aktif: true })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.nama_tipe.trim()) e.nama_tipe = 'Nama tipe wajib diisi'
        else if (form.nama_tipe.trim().length > 100) e.nama_tipe = 'Nama tipe maksimal 100 karakter'
        if (!form.jenis_form) e.jenis_form = 'Jenis form wajib dipilih'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate() || !form.jenis_form) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setLoading(true)
        try {
            await tipePermintaanService.create({
                nama_tipe: form.nama_tipe.trim(),
                jenis_form: form.jenis_form,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Tipe permintaan berhasil ditambahkan" />)
            router.push(ROUTES.TIPE_PERMINTAAN)
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
                    <h3 className="font-bold">Tambah Tipe Permintaan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan tipe permintaan baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Nama Tipe" asterisk invalid={!!errors.nama_tipe} errorMessage={errors.nama_tipe}>
                        <Input placeholder="Mis. ATK, Ban & Oli, Unit Baru" maxLength={100} value={form.nama_tipe} invalid={!!errors.nama_tipe}
                            onChange={e => setForm(p => ({ ...p, nama_tipe: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Jenis Form" asterisk invalid={!!errors.jenis_form} errorMessage={errors.jenis_form}>
                        <Select isSearchable={false} placeholder="Pilih jenis form" options={JENIS_FORM_OPTIONS}
                            value={JENIS_FORM_OPTIONS.find(o => o.value === form.jenis_form) ?? null}
                            onChange={opt => setForm(p => ({ ...p, jenis_form: (opt?.value as JenisFormPermintaan) ?? '' }))} />
                        {form.jenis_form && <p className="text-xs text-gray-400 mt-1">{JENIS_FORM_HINT[form.jenis_form]}</p>}
                    </FormItem>
                    <FormItem label="Status">
                        <Select isSearchable={false} options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                            onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => router.back()}>Kembali</Button>
                    <Button type="submit" variant="solid" loading={loading}>Simpan</Button>
                </div>
                </form>
            </Card>
        </div>
    )
}
