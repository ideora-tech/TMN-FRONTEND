'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Card, Button, FormItem, Input, DatePicker, Tag, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { penugasanService } from '@/services/penugasan.service'
import { projectService, Project } from '@/services/project.service'
import { kontrakVendorService, KontrakVendor } from '@/services/kontrak-vendor.service'
import { Vendor } from '@/services/vendor.service'
import { armadaVendorService } from '@/services/armadaVendor.service'
import { supirVendorService } from '@/services/supirVendor.service'
import { supirService, Supir } from '@/services/supir.service'

const MEKANISME_CLASS: Record<string, string> = {
    unit_only:   'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    unit_driver: 'bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    full:        'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
}
const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'Full',
}

type Option = { value: string; label: string }

export default function PenugasanVendorBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        id_proyek: '', id_vendor: '', id_kontrak_vendor: '',
        id_armada_vendor: '', id_supir: '', id_supir_vendor: '',
        tanggal_tugas: '', estimasi_biaya: '',
    })
    const [proyekOptions, setProyekOptions] = useState<Option[]>([])
    const [vendorOptions, setVendorOptions] = useState<Option[]>([])
    const [kontrakList, setKontrakList]     = useState<KontrakVendor[]>([])
    const [armadaVendorOptions, setArmadaVendorOptions] = useState<Option[]>([])
    const [supirOptions, setSupirOptions]                = useState<Option[]>([])
    const [supirVendorOptions, setSupirVendorOptions]    = useState<Option[]>([])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors]   = useState<Record<string, string>>({})

    // data master awal — dimuat sekali
    useEffect(() => {
        projectService.list(1).then(res =>
            setProyekOptions(res.data.map((p: Project) => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` })))
        ).catch(() => {})
        axios.get(API_ENDPOINTS.VENDOR, { params: { limit: 100 } }).then(r =>
            setVendorOptions((r.data.data as Vendor[]).map(v => ({ value: v.id_vendor, label: v.nama_vendor })))
        ).catch(() => {})
        supirService.list(1, 100).then(res =>
            setSupirOptions(res.data
                .filter((s: Supir) => s.status === 'aktif')
                .map((s: Supir) => ({ value: s.id_supir, label: `${s.nama} — SIM ${s.jenis_sim} (${s.no_sim})` })))
        ).catch(() => {})
    }, [])

    // armada vendor, supir vendor & kontrak vendor tergantung vendor terpilih — difilter di server
    // (?id_vendor=) supaya tidak menarik seluruh data lalu memfilternya di client.
    useEffect(() => {
        if (!form.id_vendor) {
            setArmadaVendorOptions([])
            setSupirVendorOptions([])
            setKontrakList([])
            return
        }
        kontrakVendorService.list(1, { limit: '100', id_vendor: form.id_vendor }).then(res =>
            setKontrakList(res.data)
        ).catch(() => {})
        armadaVendorService.list(1, 100, form.id_vendor).then(res =>
            setArmadaVendorOptions(res.data
                .filter(a => a.aktif)
                .map(a => ({ value: a.id_armada_vendor, label: `${a.nopol}${a.merk ? ' — ' + a.merk : ''}` })))
        ).catch(() => {})
        supirVendorService.list(1, 100, form.id_vendor).then(res =>
            setSupirVendorOptions(res.data
                .filter(s => s.aktif)
                .map(s => ({ value: s.id_supir_vendor, label: `${s.nama}${s.telepon ? ' — ' + s.telepon : ''}` })))
        ).catch(() => {})
    }, [form.id_vendor])

    // kontrakList sudah difilter server-side untuk id_vendor terpilih; guard di sini menjaga
    // agar tidak menampilkan sisa data basi selama fetch vendor baru masih berlangsung.
    const kontrakOptions = kontrakList
        .filter(k => k.id_vendor === form.id_vendor)
        .map(k => ({ value: k.id_kontrak_vendor, label: `${MEKANISME_LABEL[k.mekanisme] ?? k.mekanisme}${k.nilai_kontrak ? ' — Rp ' + formatNum(k.nilai_kontrak) : ''}` }))

    const selectedKontrak = kontrakList.find(k => k.id_kontrak_vendor === form.id_kontrak_vendor) ?? null
    const mekanisme = selectedKontrak?.mekanisme ?? null

    const handleVendorChange = (opt: Option | null) => {
        setForm(p => ({ ...p, id_vendor: opt?.value ?? '', id_kontrak_vendor: '', id_armada_vendor: '', id_supir: '', id_supir_vendor: '' }))
    }
    const handleKontrakChange = (opt: Option | null) => {
        setForm(p => ({ ...p, id_kontrak_vendor: opt?.value ?? '', id_armada_vendor: '', id_supir: '', id_supir_vendor: '' }))
    }

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.id_proyek) e.id_proyek = 'Proyek wajib dipilih'
        if (!form.id_vendor) e.id_vendor = 'Vendor wajib dipilih'
        if (!form.id_kontrak_vendor) e.id_kontrak_vendor = 'Kontrak wajib dipilih'
        if (!form.id_armada_vendor) e.id_armada_vendor = 'Armada vendor wajib dipilih'
        if (mekanisme === 'unit_only') {
            if (!form.id_supir) e.id_supir = 'Supir internal wajib dipilih'
        } else if (mekanisme) {
            if (!form.id_supir_vendor) e.id_supir_vendor = 'Supir vendor wajib dipilih'
        }
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await penugasanService.create({
                sumber:             'vendor',
                id_proyek:          form.id_proyek,
                id_kontrak_vendor:  form.id_kontrak_vendor,
                id_armada_vendor:   form.id_armada_vendor,
                id_supir:           mekanisme === 'unit_only' ? form.id_supir : null,
                id_supir_vendor:    mekanisme === 'unit_only' ? null : form.id_supir_vendor,
                tanggal_tugas:      form.tanggal_tugas || undefined,
                estimasi_biaya:     form.estimasi_biaya ? Number(form.estimasi_biaya) : undefined,
            })
            toast.push(<Notification type="success" title="Penugasan vendor berhasil dibuat" />)
            router.push(ROUTES.PENUGASAN_VENDOR)
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
                    <h3 className="font-bold">Tambah Penugasan Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Tugaskan unit dan supir dari vendor ke proyek</p>
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
                            onChange={(opt) => setForm(p => ({ ...p, id_proyek: (opt as Option | null)?.value ?? '' }))}
                            invalid={!!errors.id_proyek}
                        />
                    </FormItem>
                    <FormItem label="Vendor" asterisk invalid={!!errors.id_vendor} errorMessage={errors.id_vendor}>
                        <Select
                            placeholder="Pilih vendor..."
                            options={vendorOptions}
                            value={vendorOptions.find(o => o.value === form.id_vendor) ?? null}
                            onChange={(opt) => handleVendorChange(opt as Option | null)}
                            invalid={!!errors.id_vendor}
                        />
                    </FormItem>

                    <div className="sm:col-span-2">
                        <FormItem label="Kontrak Vendor" asterisk invalid={!!errors.id_kontrak_vendor} errorMessage={errors.id_kontrak_vendor}>
                            <Select
                                isDisabled={!form.id_vendor}
                                placeholder={form.id_vendor ? 'Pilih kontrak...' : 'Pilih vendor terlebih dahulu'}
                                options={kontrakOptions}
                                value={kontrakOptions.find(o => o.value === form.id_kontrak_vendor) ?? null}
                                onChange={(opt) => handleKontrakChange(opt as Option | null)}
                                invalid={!!errors.id_kontrak_vendor}
                            />
                        </FormItem>
                    </div>

                    {selectedKontrak && (
                        <div className="sm:col-span-2 -mt-2 mb-3 flex items-center gap-2">
                            <Tag className={MEKANISME_CLASS[selectedKontrak.mekanisme] ?? 'bg-gray-100 text-gray-600'}>
                                {MEKANISME_LABEL[selectedKontrak.mekanisme] ?? selectedKontrak.mekanisme}
                            </Tag>
                            <span className="text-xs text-gray-400">Mekanisme kontrak menentukan pilihan unit &amp; supir di bawah</span>
                        </div>
                    )}

                    {mekanisme && (
                        <>
                            <FormItem label="Armada Vendor" asterisk invalid={!!errors.id_armada_vendor} errorMessage={errors.id_armada_vendor}>
                                <Select
                                    placeholder="Pilih armada vendor (aktif)..."
                                    options={armadaVendorOptions}
                                    value={armadaVendorOptions.find(o => o.value === form.id_armada_vendor) ?? null}
                                    onChange={(opt) => setForm(p => ({ ...p, id_armada_vendor: (opt as Option | null)?.value ?? '' }))}
                                    invalid={!!errors.id_armada_vendor}
                                />
                            </FormItem>

                            {mekanisme === 'unit_only' ? (
                                <FormItem label="Supir (Internal)" asterisk invalid={!!errors.id_supir} errorMessage={errors.id_supir}>
                                    <Select
                                        placeholder="Pilih supir internal..."
                                        options={supirOptions}
                                        value={supirOptions.find(o => o.value === form.id_supir) ?? null}
                                        onChange={(opt) => setForm(p => ({ ...p, id_supir: (opt as Option | null)?.value ?? '' }))}
                                        invalid={!!errors.id_supir}
                                    />
                                </FormItem>
                            ) : (
                                <FormItem label="Supir Vendor" asterisk invalid={!!errors.id_supir_vendor} errorMessage={errors.id_supir_vendor}>
                                    <Select
                                        placeholder="Pilih supir vendor (aktif)..."
                                        options={supirVendorOptions}
                                        value={supirVendorOptions.find(o => o.value === form.id_supir_vendor) ?? null}
                                        onChange={(opt) => setForm(p => ({ ...p, id_supir_vendor: (opt as Option | null)?.value ?? '' }))}
                                        invalid={!!errors.id_supir_vendor}
                                    />
                                </FormItem>
                            )}
                        </>
                    )}

                    <FormItem label="Tanggal Tugas">
                        <DatePicker
                            value={form.tanggal_tugas ? new Date(form.tanggal_tugas) : null}
                            onChange={(date) => setForm(p => ({ ...p, tanggal_tugas: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                        />
                    </FormItem>
                    <FormItem label="Estimasi Biaya">
                        <Input
                            prefix="Rp"
                            placeholder="0"
                            value={form.estimasi_biaya ? formatNum(Number(form.estimasi_biaya)) : ''}
                            onChange={(e) => setForm(p => ({ ...p, estimasi_biaya: e.target.value.replace(/\D/g, '') }))}
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
