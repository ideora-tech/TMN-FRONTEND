'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { supirService } from '@/services/supir.service'
import { armadaService, Armada } from '@/services/armada.service'

const JENIS_SIM_OPTIONS = ['A', 'B1', 'B2', 'C', 'D'].map(j => ({ value: j, label: j }))

export default function SupirBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ nama: '', no_sim: '', jenis_sim: 'B2', tgl_kadaluarsa_sim: '', telepon: '', id_armada_default: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})
    const [armadaOptions, setArmadaOptions] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        armadaService.list(1, 100)
            .then(res => setArmadaOptions(res.data
                .filter((a: Armada) => a.aktif !== false)
                .map((a: Armada) => ({ value: a.id_armada, label: `${a.nopol} — ${a.merk ?? ''}`.trim() }))))
            .catch(() => {})
    }, [])

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.nama.trim())   e.nama   = 'Nama wajib diisi'
        if (!form.no_sim.trim()) e.no_sim = 'No SIM wajib diisi'
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
            await supirService.create({
                nama: form.nama,
                no_sim: form.no_sim,
                jenis_sim: form.jenis_sim,
                tgl_kadaluarsa_sim: form.tgl_kadaluarsa_sim || undefined,
                telepon: form.telepon || undefined,
                id_armada_default: form.id_armada_default || undefined,
            })
            toast.push(<Notification type="success" title="Supir berhasil ditambahkan" />)
            router.push(ROUTES.SUPIR)
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
                    <h3 className="font-bold">Tambah Supir Baru</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan supir baru ke sistem</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Nama" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                        <Input placeholder="Nama lengkap supir" value={form.nama} invalid={!!errors.nama}
                            onChange={(e) => setForm(p => ({ ...p, nama: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Telepon">
                        <Input placeholder="Nomor telepon" value={form.telepon}
                            onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                    </FormItem>
                    <FormItem label="No SIM" asterisk invalid={!!errors.no_sim} errorMessage={errors.no_sim}>
                        <Input placeholder="Nomor SIM" value={form.no_sim} invalid={!!errors.no_sim}
                            onChange={(e) => setForm(p => ({ ...p, no_sim: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Jenis SIM">
                        <Select isSearchable={false}
                            value={JENIS_SIM_OPTIONS.find(o => o.value === form.jenis_sim) ?? null}
                            options={JENIS_SIM_OPTIONS}
                            onChange={(option) => option && setForm(p => ({ ...p, jenis_sim: option.value }))} />
                    </FormItem>
                    <FormItem label="Tgl Kadaluarsa SIM">
                        <DatePicker
                            value={form.tgl_kadaluarsa_sim ? new Date(form.tgl_kadaluarsa_sim) : null}
                            onChange={(date) => setForm(p => ({ ...p, tgl_kadaluarsa_sim: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Armada Default">
                        <Select isClearable
                            placeholder="Pilih armada default..."
                            options={armadaOptions}
                            value={armadaOptions.find(o => o.value === form.id_armada_default) ?? null}
                            onChange={(option) => setForm(p => ({ ...p, id_armada_default: option?.value ?? '' }))} />
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
