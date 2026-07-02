'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { supirService } from '@/services/supir.service'

const JENIS_SIM_OPTIONS = ['A', 'B1', 'B2', 'C', 'D'].map(j => ({ value: j, label: j }))

export default function SupirBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ nama: '', no_sim: '', jenis_sim: 'B2', tgl_kadaluarsa_sim: '', telepon: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.nama.trim())   e.nama   = 'Nama wajib diisi'
        if (!form.no_sim.trim()) e.no_sim = 'No SIM wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await supirService.create({
                nama: form.nama,
                no_sim: form.no_sim,
                jenis_sim: form.jenis_sim,
                tgl_kadaluarsa_sim: form.tgl_kadaluarsa_sim || undefined,
                telepon: form.telepon || undefined,
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
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Tambah Supir Baru</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan supir baru ke sistem</p>
                </div>
            </div>
            <Card>
                <div className="flex flex-col gap-1">
                    <FormItem label="Nama" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                        <Input placeholder="Nama lengkap supir" value={form.nama} invalid={!!errors.nama} onChange={(e) => setForm(p => ({ ...p, nama: e.target.value }))} />
                    </FormItem>
                    <FormItem label="No SIM" asterisk invalid={!!errors.no_sim} errorMessage={errors.no_sim}>
                        <Input placeholder="Nomor SIM" value={form.no_sim} invalid={!!errors.no_sim} onChange={(e) => setForm(p => ({ ...p, no_sim: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Jenis SIM">
                        <Select
                            isSearchable={false}
                            value={JENIS_SIM_OPTIONS.find(o => o.value === form.jenis_sim) ?? null}
                            options={JENIS_SIM_OPTIONS}
                            onChange={(option) => option && setForm(p => ({ ...p, jenis_sim: option.value }))}
                        />
                    </FormItem>
                    <FormItem label="Tgl Kadaluarsa SIM">
                        <DatePicker
                            value={form.tgl_kadaluarsa_sim ? new Date(form.tgl_kadaluarsa_sim) : null}
                            onChange={(date) => setForm(p => ({ ...p, tgl_kadaluarsa_sim: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                        />
                    </FormItem>
                    <FormItem label="Telepon">
                        <Input placeholder="Nomor telepon" value={form.telepon} onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button variant="solid" loading={loading} onClick={handleSubmit}>Simpan</Button>
                </div>
            </Card>
        </div>
    )
}
