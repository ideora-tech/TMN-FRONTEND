'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { penugasanService, StatusPenugasan } from '@/services/penugasan.service'
import { projectService, Project } from '@/services/project.service'
import { karyawanService, Karyawan } from '@/services/karyawan.service'
import { armadaService, Armada } from '@/services/armada.service'
import { supirService, Supir } from '@/services/supir.service'

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'aktif',   label: 'Aktif' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'batal',   label: 'Batal' },
]

export default function PenugasanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        id_proyek: '', id_armada: '', id_supir: '', id_karyawan: '', tanggal_tugas: '', status: 'pending' as StatusPenugasan,
    })
    const [proyekOptions, setProyekOptions]     = useState<{ value: string; label: string }[]>([])
    const [karyawanOptions, setKaryawanOptions] = useState<{ value: string; label: string }[]>([])
    const [armadaOptions, setArmadaOptions]     = useState<{ value: string; label: string }[]>([])
    const [supirOptions, setSupirOptions]        = useState<{ value: string; label: string }[]>([])
    const [supirList, setSupirList]              = useState<Supir[]>([])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors]   = useState<Partial<Record<keyof typeof form, string>>>({})

    useEffect(() => {
        Promise.all([
            projectService.list(1),
            karyawanService.list(1),
            armadaService.list(1),
            supirService.list(1),
        ]).then(([proyek, karyawan, armada, supir]) => {
            setProyekOptions(proyek.data.map((p: Project) => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` })))
            setKaryawanOptions(karyawan.data.map((k: Karyawan) => ({ value: k.id_karyawan, label: `${k.nik} — ${k.nama_karyawan}` })))
            setArmadaOptions(armada.data
                .filter((a: Armada) => a.aktif !== false)
                .map((a: Armada) => ({ value: a.id_armada, label: `${a.nopol} — ${a.merk} ${a.model ?? ''}`.trim() })))
            const supirAktif = supir.data.filter((s: Supir) => s.status === 'aktif')
            setSupirOptions(supirAktif.map((s: Supir) => ({ value: s.id_supir, label: `${s.nama} — SIM ${s.jenis_sim} (${s.no_sim})` })))
            setSupirList(supirAktif)
        }).catch(() => {})
    }, [])

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.id_proyek) e.id_proyek = 'Proyek wajib dipilih'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await penugasanService.create({
                id_proyek:     form.id_proyek,
                id_armada:     form.id_armada || undefined,
                id_supir:      form.id_supir || undefined,
                id_karyawan:   form.id_karyawan || undefined,
                tanggal_tugas: form.tanggal_tugas || undefined,
                status:        form.status,
            })
            toast.push(<Notification type="success" title="Penugasan berhasil dibuat" />)
            router.push(ROUTES.PENUGASAN)
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
                    <h3 className="font-bold">Tambah Penugasan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Tugaskan karyawan dan armada ke proyek</p>
                </div>
            </div>

            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <div className="sm:col-span-2">
                        <FormItem label="Proyek" asterisk invalid={!!errors.id_proyek} errorMessage={errors.id_proyek}>
                            <Select
                                placeholder="Pilih proyek..."
                                options={proyekOptions}
                                value={proyekOptions.find(o => o.value === form.id_proyek) ?? null}
                                onChange={(opt) => setForm(p => ({ ...p, id_proyek: opt?.value ?? '' }))}
                                invalid={!!errors.id_proyek}
                            />
                        </FormItem>
                    </div>
                    <FormItem label="Supir">
                        <Select
                            placeholder="Pilih supir..."
                            options={supirOptions}
                            value={supirOptions.find(o => o.value === form.id_supir) ?? null}
                            onChange={(opt) => {
                                const selectedId = opt?.value ?? ''
                                const selected = supirList.find(s => s.id_supir === selectedId)
                                setForm(p => ({
                                    ...p,
                                    id_supir: selectedId,
                                    ...(selected?.id_armada_default ? { id_armada: selected.id_armada_default } : {}),
                                }))
                            }}
                            isClearable
                        />
                    </FormItem>
                    <FormItem label="Armada">
                        <Select
                            placeholder="Pilih armada (status aktif)..."
                            options={armadaOptions}
                            value={armadaOptions.find(o => o.value === form.id_armada) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, id_armada: opt?.value ?? '' }))}
                            isClearable
                        />
                    </FormItem>
                    <FormItem label="Karyawan PIC">
                        <Select
                            placeholder="Pilih karyawan penanggung jawab..."
                            options={karyawanOptions}
                            value={karyawanOptions.find(o => o.value === form.id_karyawan) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, id_karyawan: opt?.value ?? '' }))}
                            isClearable
                        />
                    </FormItem>
                    <FormItem label="Tanggal Tugas">
                        <DatePicker
                            value={form.tanggal_tugas ? new Date(form.tanggal_tugas) : null}
                            onChange={(date) => setForm(p => ({ ...p, tanggal_tugas: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                        />
                    </FormItem>
                    <FormItem label="Status">
                        <Select
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, status: (opt?.value ?? 'pending') as StatusPenugasan }))}
                        />
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
