'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { judulPermintaanService } from '@/services/judul-permintaan.service'
import { tipePermintaanService, TipePermintaan, JENIS_FORM_LABEL } from '@/services/tipe-permintaan.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function JudulPermintaanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ nama_judul: '', id_tipe_permintaan: '', aktif: true })
    const [tipeList, setTipeList] = useState<TipePermintaan[]>([])
    const [tipeLoading, setTipeLoading] = useState(true)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        tipePermintaanService.opsiAktif()
            .then(setTipeList)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setTipeLoading(false))
    }, [])

    const tipeOptions = tipeList.map(t => ({ value: t.id_tipe_permintaan, label: t.nama_tipe }))
    const tipeTerpilih = tipeList.find(t => t.id_tipe_permintaan === form.id_tipe_permintaan)

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.nama_judul.trim()) e.nama_judul = 'Judul permintaan wajib diisi'
        else if (form.nama_judul.trim().length > 150) e.nama_judul = 'Judul permintaan maksimal 150 karakter'
        if (!form.id_tipe_permintaan) e.id_tipe_permintaan = 'Tipe wajib dipilih'
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
            await judulPermintaanService.create({
                nama_judul: form.nama_judul.trim(),
                id_tipe_permintaan: form.id_tipe_permintaan,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Judul permintaan berhasil ditambahkan" />)
            router.push(ROUTES.JUDUL_PERMINTAAN)
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
                    <h3 className="font-bold">Tambah Judul Permintaan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan judul permintaan baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Judul Permintaan" asterisk invalid={!!errors.nama_judul} errorMessage={errors.nama_judul}>
                        <Input placeholder="Mis. Pembelian Ban Truk" maxLength={150} value={form.nama_judul} invalid={!!errors.nama_judul}
                            onChange={e => setForm(p => ({ ...p, nama_judul: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Tipe" asterisk invalid={!!errors.id_tipe_permintaan} errorMessage={errors.id_tipe_permintaan}>
                        <Select isSearchable={false} isLoading={tipeLoading} placeholder={tipeLoading ? 'Memuat tipe...' : 'Pilih tipe'}
                            noOptionsMessage={() => 'Belum ada tipe permintaan — tambahkan di Data Master › Tipe Permintaan'}
                            options={tipeOptions}
                            value={tipeOptions.find(o => o.value === form.id_tipe_permintaan) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_tipe_permintaan: opt?.value ?? '' }))} />
                        {tipeTerpilih && <p className="text-xs text-gray-400 mt-1">Jenis form: {JENIS_FORM_LABEL[tipeTerpilih.jenis_form]}</p>}
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
