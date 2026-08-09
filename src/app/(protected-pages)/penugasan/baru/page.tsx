'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
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
import { tarifRuteService } from '@/services/tarifRute.service'
import { ruteService, Rute } from '@/services/rute.service'
import { cutiService } from '@/services/cuti.service'
import { formatNum } from '@/utils/formatNumber'

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
    const [proyekList, setProyekList]           = useState<Project[]>([])
    const [karyawanOptions, setKaryawanOptions] = useState<{ value: string; label: string }[]>([])
    const [armadaOptions, setArmadaOptions]     = useState<{ value: string; label: string }[]>([])
    const [armadaList, setArmadaList]           = useState<Armada[]>([])         // simpan objek utuh utk id_jenis_kendaraan
    const [supirOptions, setSupirOptions]        = useState<{ value: string; label: string }[]>([])
    const [supirList, setSupirList]              = useState<Supir[]>([])
    const [ruteEstimasiOptions, setRuteEstimasiOptions] = useState<{ value: string; label: string }[]>([])
    const [idRuteEstimasi, setIdRuteEstimasi]   = useState('')
    const [supirCutiSet, setSupirCutiSet]       = useState<Set<string>>(new Set())
    const [estimasiBiayaStr, setEstimasiBiayaStr] = useState('')
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
            setProyekList(proyek.data)
            setKaryawanOptions(karyawan.data.map((k: Karyawan) => ({ value: k.id_karyawan, label: `${k.nik} — ${k.nama_karyawan}` })))
            setArmadaOptions(armada.data
                .filter((a: Armada) => a.aktif !== false)
                .map((a: Armada) => ({ value: a.id_armada, label: `${a.nopol} — ${a.merk} ${a.model ?? ''}`.trim() })))
            setArmadaList(armada.data)
            const supirAktif = supir.data.filter((s: Supir) => s.status === 'aktif')
            setSupirOptions(supirAktif.map((s: Supir) => {
                const simKadaluarsa = s.tgl_kadaluarsa_sim && new Date(s.tgl_kadaluarsa_sim).getTime() < Date.now()
                return {
                    value: s.id_supir,
                    label: `${s.nama} — SIM ${s.jenis_sim} (${s.no_sim ?? '-'})${simKadaluarsa ? ' ⚠ SIM kadaluarsa' : ''}`,
                }
            }))
            setSupirList(supirAktif)
        }).catch(() => {})

        ruteService.list({ limit: 100 })
            .then(res => setRuteEstimasiOptions((res.data ?? []).map((r: Rute) => ({ value: r.id_rute, label: r.nama_rute }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        cutiService.cutiAktif(form.tanggal_tugas || undefined)
            .then(rows => setSupirCutiSet(new Set(rows.map(c => c.id_supir).filter(Boolean) as string[])))
            .catch(() => setSupirCutiSet(new Set()))
    }, [form.tanggal_tugas])

    // Auto-fill estimasi biaya dari uang jalan tarif rute (resolusi tarif klien proyek → tarif umum)
    // saat armada (jenis kendaraan) & rute estimasi terpilih — nilai manual tidak ditimpa selain itu.
    useEffect(() => {
        const armada = armadaList.find(a => a.id_armada === form.id_armada)
        if (!armada?.id_jenis_kendaraan || !idRuteEstimasi) return
        const idKlien = proyekList.find(p => p.id_proyek === form.id_proyek)?.id_klien
        let aktif = true
        tarifRuteService.resolusi({
            id_rute: idRuteEstimasi,
            id_jenis_kendaraan: armada.id_jenis_kendaraan,
            id_klien: idKlien || undefined,
        })
            .then(tarif => {
                if (aktif && tarif) setEstimasiBiayaStr(String(Math.round(tarif.harga)))
            })
            .catch(() => {})
        return () => { aktif = false }
    }, [form.id_armada, form.id_proyek, idRuteEstimasi, armadaList, proyekList])

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.id_proyek) e.id_proyek = 'Proyek wajib dipilih'
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
            await penugasanService.create({
                id_proyek:     form.id_proyek,
                id_armada:     form.id_armada || undefined,
                id_supir:      form.id_supir || undefined,
                id_karyawan:   form.id_karyawan || undefined,
                tanggal_tugas: form.tanggal_tugas || undefined,
                status:        form.status,
                estimasi_biaya: estimasiBiayaStr ? Number(estimasiBiayaStr) : undefined,
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
                        {(() => {
                            const dipilih = supirList.find(s => s.id_supir === form.id_supir)
                            if (!dipilih?.tgl_kadaluarsa_sim) return null
                            const daysLeft = Math.ceil((new Date(dipilih.tgl_kadaluarsa_sim).getTime() - Date.now()) / 86400000)
                            if (daysLeft >= 7) return null
                            return (
                                <p className={`text-xs mt-1 font-medium ${daysLeft < 0 ? 'text-red-500' : 'text-amber-600'}`}>
                                    {daysLeft < 0
                                        ? `⚠ SIM ${dipilih.jenis_sim} supir ini sudah kadaluarsa sejak ${dayjs(dipilih.tgl_kadaluarsa_sim).format('DD MMM YYYY')} — pastikan sudah diperpanjang sebelum jalan.`
                                        : `⚠ SIM ${dipilih.jenis_sim} supir ini akan kadaluarsa dalam ${daysLeft} hari (${dayjs(dipilih.tgl_kadaluarsa_sim).format('DD MMM YYYY')}).`}
                                </p>
                            )
                        })()}
                        {form.id_supir && supirCutiSet.has(form.id_supir) && (
                            <p className="text-xs mt-1 font-medium text-red-500">
                                ⛔ Supir ini sedang cuti (disetujui) pada tanggal {form.tanggal_tugas ? dayjs(form.tanggal_tugas).format('DD MMM YYYY') : 'hari ini'} — trip tidak akan bisa dimulai.
                            </p>
                        )}
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
                    <FormItem label="Rute (untuk uang jalan)">
                        <Select isClearable isSearchable placeholder="Pilih rute..."
                            options={ruteEstimasiOptions}
                            value={ruteEstimasiOptions.find(o => o.value === idRuteEstimasi) ?? null}
                            onChange={opt => setIdRuteEstimasi(opt?.value ?? '')} />
                    </FormItem>
                    <FormItem label="Uang Jalan" extra="Terisi otomatis dari tarif rute bila armada & rute dipilih — bisa diubah">
                        <Input prefix="Rp" placeholder="0"
                            value={estimasiBiayaStr ? formatNum(Number(estimasiBiayaStr)) : ''}
                            onChange={e => setEstimasiBiayaStr(e.target.value.replace(/\D/g, ''))} />
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
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button type="submit" variant="solid" loading={loading}>Simpan</Button>
                </div>
            </form>
            </Card>
        </div>
    )
}
