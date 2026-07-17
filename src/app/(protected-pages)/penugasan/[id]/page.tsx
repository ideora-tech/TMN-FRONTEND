'use client'
import { use, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, Tag, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlinePlus, HiOutlineTrash, HiOutlineX, HiOutlineExternalLink } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { penugasanService, Penugasan, StatusPenugasan } from '@/services/penugasan.service'
import { karyawanService, Karyawan } from '@/services/karyawan.service'
import { armadaService, Armada } from '@/services/armada.service'
import { supirService, Supir } from '@/services/supir.service'
import { jadwalService, Jadwal } from '@/services/jadwal.service'
import { ruteService, Rute } from '@/services/rute.service'
import { kontrakVendorService, KontrakVendor } from '@/services/kontrak-vendor.service'
import { armadaVendorService, ArmadaVendor } from '@/services/armadaVendor.service'
import { supirVendorService, SupirVendor } from '@/services/supirVendor.service'
import { tarifRuteService } from '@/services/tarifRute.service'
import { formatNum, formatRupiah } from '@/utils/formatNumber'

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'aktif',   label: 'Aktif' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'batal',   label: 'Batal' },
]

const STATUS_CLASS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    aktif:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    selesai: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    batal:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

const JADWAL_STATUS_CLASS: Record<string, string> = {
    terjadwal:  'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    berjalan:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:    'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    dibatalkan: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

const MEKANISME_CLASS: Record<string, string> = {
    unit_only:   'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    unit_driver: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    full:        'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
}
const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'Full',
}

function shortId(id?: string | null) {
    return id ? id.slice(0, 8) : '—'
}

export default function PenugasanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router  = useRouter()

    // penugasan
    const [penugasan, setPenugasan] = useState<Penugasan | null>(null)
    const [loading, setLoading]     = useState(true)
    const [editing, setEditing]     = useState(false)
    const [form, setForm]           = useState<Partial<Penugasan>>({})
    const [saving, setSaving]       = useState(false)
    const [karyawanOptions, setKaryawanOptions] = useState<{ value: string; label: string }[]>([])
    const [armadaOptions, setArmadaOptions]     = useState<{ value: string; label: string }[]>([])
    const [armadaList, setArmadaList]           = useState<Armada[]>([])         // simpan objek utuh utk id_jenis_kendaraan
    const [supirOptions, setSupirOptions]        = useState<{ value: string; label: string }[]>([])
    const [supirList, setSupirList]              = useState<Supir[]>([])
    const [idRuteEstimasi, setIdRuteEstimasi]   = useState('')
    // hanya true setelah user benar-benar mengubah armada / rute estimasi — mencegah auto-fill
    // menimpa estimasi_biaya tersimpan saat efek ini terpicu oleh load awal (hidrasi/fetch), bukan aksi user.
    const bolehAutoFill = useRef(false)

    // info sumber vendor (read-only, ditampilkan hanya bila sumber === 'vendor')
    const [kontrakVendorInfo, setKontrakVendorInfo] = useState<KontrakVendor | null>(null)
    const [armadaVendorInfo, setArmadaVendorInfo]   = useState<ArmadaVendor | null>(null)
    const [supirVendorInfo, setSupirVendorInfo]     = useState<SupirVendor | null>(null)

    // jadwal
    const [jadwalList, setJadwalList]     = useState<Jadwal[]>([])
    const [jadwalLoading, setJadwalLoading] = useState(false)
    const [showJadwalForm, setShowJadwalForm] = useState(false)
    const [jadwalForm, setJadwalForm] = useState<{ waktu_berangkat: string; id_rute: string | null; estimasi_tiba: string }>(
        { waktu_berangkat: '', id_rute: null, estimasi_tiba: '' }
    )
    const [jadwalErrors, setJadwalErrors] = useState<Partial<Record<'waktu_berangkat' | 'estimasi_tiba', string>>>({})
    const [ruteOptions, setRuteOptions] = useState<{ value: string; label: string }[]>([])
    const [addingJadwal, setAddingJadwal] = useState(false)
    const [deleteJadwalTarget, setDeleteJadwalTarget] = useState<Jadwal | null>(null)
    const [deletingJadwal, setDeletingJadwal] = useState(false)

    useEffect(() => {
        Promise.all([
            penugasanService.get(id),
            karyawanService.list(1),
            armadaService.list(1),
            supirService.list(1),
            ruteService.list({ limit: 100 }),
        ]).then(async ([p, karyawan, armada, supir, rute]) => {
            setPenugasan(p)
            setForm(p)
            const karyawanOpts = karyawan.data.map((k: Karyawan) => ({ value: k.id_karyawan, label: `${k.nik} — ${k.nama_karyawan}` }))
            const armadaOpts   = armada.data.map((a: Armada) => ({ value: a.id_armada, label: `${a.nopol} — ${a.merk} ${a.model ?? ''}`.trim() }))
            const supirOpts    = supir.data.map((s: Supir) => ({ value: s.id_supir, label: `${s.nama} — SIM ${s.jenis_sim} (${s.no_sim})` }))
            const ruteOpts     = rute.data.map((r: Rute) => ({ value: r.id_rute, label: r.nama_rute }))
            let supirData: Supir[] = supir.data
            let armadaData: Armada[] = armada.data

            if (p.id_karyawan && !karyawanOpts.some(o => o.value === p.id_karyawan)) {
                try {
                    const k = await karyawanService.get(p.id_karyawan)
                    karyawanOpts.unshift({ value: k.id_karyawan, label: `${k.nik} — ${k.nama_karyawan}` })
                } catch { /* karyawan sudah dihapus */ }
            }
            if (p.id_armada && !armadaOpts.some(o => o.value === p.id_armada)) {
                try {
                    const a = await armadaService.get(p.id_armada)
                    armadaOpts.unshift({ value: a.id_armada, label: `${a.nopol} — ${a.merk} ${a.model ?? ''}`.trim() })
                    armadaData = [a, ...armadaData]
                } catch { /* armada sudah dihapus */ }
            }
            if (p.id_supir && !supirOpts.some(o => o.value === p.id_supir)) {
                try {
                    const s = await supirService.get(p.id_supir)
                    supirOpts.unshift({ value: s.id_supir, label: `${s.nama} — SIM ${s.jenis_sim} (${s.no_sim})` })
                    supirData = [s, ...supirData]
                } catch { /* supir sudah dihapus */ }
            }

            setKaryawanOptions(karyawanOpts)
            setArmadaOptions(armadaOpts)
            setArmadaList(armadaData)
            setSupirOptions(supirOpts)
            setSupirList(supirData)
            setRuteOptions(ruteOpts)

            if (p.sumber === 'vendor') {
                if (p.id_kontrak_vendor) kontrakVendorService.get(p.id_kontrak_vendor).then(setKontrakVendorInfo).catch(() => {})
                if (p.id_armada_vendor)  armadaVendorService.get(p.id_armada_vendor).then(setArmadaVendorInfo).catch(() => {})
                if (p.id_supir_vendor)   supirVendorService.get(p.id_supir_vendor).then(setSupirVendorInfo).catch(() => {})
            }
        }).catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const fetchJadwal = useCallback(async () => {
        setJadwalLoading(true)
        try {
            const res = await jadwalService.listByPenugasan(id)
            setJadwalList(res.data)
            // default rute estimasi dari jadwal pertama bila ada — tidak menimpa pilihan manual user
            setIdRuteEstimasi(prev => prev || (res.data[0]?.id_rute ?? ''))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setJadwalLoading(false)
        }
    }, [id])

    useEffect(() => { fetchJadwal() }, [fetchJadwal])

    // Auto-fill estimasi biaya dari BOK saat armada (jenis kendaraan) & rute estimasi terpilih.
    // Hanya jalan saat form.id_armada / idRuteEstimasi / armadaList berubah — nilai manual tidak ditimpa selain itu.
    useEffect(() => {
        if (!bolehAutoFill.current) return
        const armada = armadaList.find(a => a.id_armada === form.id_armada)
        if (!armada?.id_jenis_kendaraan || !idRuteEstimasi) return
        let aktif = true
        tarifRuteService.estimasiBok({ id_rute: idRuteEstimasi, id_jenis_kendaraan: armada.id_jenis_kendaraan })
            .then(est => {
                if (aktif && est) setForm(p => ({ ...p, estimasi_biaya: Math.round(est.harga_pokok) }))
            })
            .catch(() => {})
        return () => { aktif = false }
    }, [form.id_armada, idRuteEstimasi, armadaList])

    const handleSave = async () => {
        setSaving(true)
        try {
            const isVendor = penugasan?.sumber === 'vendor'
            const updated = await penugasanService.update(id, {
                // penugasan vendor: unit & supir dikelola saat pembuatan penugasan vendor,
                // jangan kirim id_armada/id_supir agar nilai existing tidak tersentuh.
                id_armada:     isVendor ? undefined : (form.id_armada ?? null),
                id_supir:      isVendor ? undefined : (form.id_supir ?? null),
                id_karyawan:   form.id_karyawan ?? null,
                tanggal_tugas: form.tanggal_tugas ?? null,
                status:        form.status,
                estimasi_biaya: form.estimasi_biaya ?? null,
            })
            setPenugasan(updated)
            setEditing(false)
            bolehAutoFill.current = false
            toast.push(<Notification type="success" title="Penugasan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const validateJadwal = () => {
        const e: Partial<Record<keyof typeof jadwalForm, string>> = {}
        if (!jadwalForm.waktu_berangkat) e.waktu_berangkat = 'Waktu berangkat wajib diisi'
        setJadwalErrors(e)
        return Object.keys(e).length === 0
    }

    const handleAddJadwal = async () => {
        if (!validateJadwal()) return
        setAddingJadwal(true)
        try {
            await jadwalService.create({
                id_penugasan:   id,
                waktu_berangkat: jadwalForm.waktu_berangkat
                    ? dayjs(jadwalForm.waktu_berangkat).format('YYYY-MM-DD HH:mm:ss')
                    : null,
                id_rute:        jadwalForm.id_rute || null,
                estimasi_tiba:  jadwalForm.estimasi_tiba
                    ? dayjs(jadwalForm.estimasi_tiba).format('YYYY-MM-DD HH:mm:ss')
                    : null,
            })
            toast.push(<Notification type="success" title="Jadwal berhasil ditambahkan" />)
            setJadwalForm({ waktu_berangkat: '', id_rute: null, estimasi_tiba: '' })
            setJadwalErrors({})
            setShowJadwalForm(false)
            fetchJadwal()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAddingJadwal(false)
        }
    }

    const handleDeleteJadwal = async () => {
        if (!deleteJadwalTarget) return
        setDeletingJadwal(true)
        try {
            await jadwalService.delete(deleteJadwalTarget.id_jadwal)
            toast.push(<Notification type="success" title="Jadwal berhasil dihapus" />)
            setDeleteJadwalTarget(null)
            fetchJadwal()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeletingJadwal(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!penugasan) return <div className="p-6 text-red-500">Penugasan tidak ditemukan.</div>

    const karyawanLabel = karyawanOptions.find(o => o.value === penugasan.id_karyawan)?.label ?? penugasan.id_karyawan ?? '—'
    const armadaLabel   = armadaOptions.find(o => o.value === penugasan.id_armada)?.label ?? penugasan.id_armada ?? '—'
    const supirLabel    = supirOptions.find(o => o.value === penugasan.id_supir)?.label ?? penugasan.id_supir ?? '—'

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PENUGASAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Detail Penugasan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan pengelolaan penugasan</p>
                </div>
            </div>

            {/* Info Penugasan */}
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                                    P
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">Penugasan</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {penugasan.tanggal_tugas
                                            ? dayjs(penugasan.tanggal_tugas).format('DD MMM YYYY')
                                            : 'Tanggal belum diset'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Tag className={`text-xs font-semibold ${STATUS_CLASS[penugasan.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {penugasan.status}
                                </Tag>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Tanggal Tugas', value: penugasan.tanggal_tugas ? dayjs(penugasan.tanggal_tugas).format('DD MMM YYYY') : <span className="text-gray-400">—</span> },
                                { label: 'Armada',        value: armadaLabel },
                                { label: 'Supir',         value: supirLabel },
                                { label: 'Karyawan PIC',  value: karyawanLabel },
                                { label: 'Estimasi Biaya', value: penugasan.estimasi_biaya != null ? formatRupiah(penugasan.estimasi_biaya) : <span className="text-gray-400">—</span> },
                                { label: 'Dibuat',        value: dayjs(penugasan.dibuat_pada).format('DD MMM YYYY HH:mm') },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>

                        {penugasan.sumber === 'vendor' && (
                            <>
                                <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                                <div>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Sumber Vendor</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5">
                                        <div>
                                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Kontrak</p>
                                            {kontrakVendorInfo ? (
                                                <Tag className={`text-xs font-semibold ${MEKANISME_CLASS[kontrakVendorInfo.mekanisme] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {MEKANISME_LABEL[kontrakVendorInfo.mekanisme] ?? kontrakVendorInfo.mekanisme}
                                                </Tag>
                                            ) : (
                                                <p className="text-sm font-mono text-gray-600 dark:text-gray-300">{shortId(penugasan.id_kontrak_vendor)}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Armada Vendor</p>
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {armadaVendorInfo ? (
                                                    <>
                                                        <span className="font-mono font-semibold">{armadaVendorInfo.nopol}</span>
                                                        {armadaVendorInfo.nama_vendor && <span className="text-gray-400"> — {armadaVendorInfo.nama_vendor}</span>}
                                                    </>
                                                ) : (
                                                    <span className="font-mono text-xs">{shortId(penugasan.id_armada_vendor)}</span>
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Supir Vendor</p>
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {penugasan.id_supir_vendor ? (
                                                    supirVendorInfo
                                                        ? supirVendorInfo.nama
                                                        : <span className="font-mono text-xs">{shortId(penugasan.id_supir_vendor)}</span>
                                                ) : (
                                                    <span className="text-gray-400">— (pakai supir internal)</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-4">
                                        Detail kontrak/unit/supir vendor dikelola saat pembuatan penugasan vendor.
                                    </p>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                                P
                            </div>
                            <div>
                                <p className="font-semibold text-base">Edit Penugasan</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui data penugasan di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                {penugasan.sumber === 'vendor' ? (
                                    <div className="sm:col-span-2 -mt-1 mb-2">
                                        <p className="text-xs text-gray-400">
                                            Unit &amp; supir penugasan vendor tidak dapat diubah dari halaman ini.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <FormItem label="Supir">
                                            <Select isClearable placeholder="Pilih supir..."
                                                options={supirOptions}
                                                value={supirOptions.find(o => o.value === form.id_supir) ?? null}
                                                onChange={opt => {
                                                    const selectedId = opt?.value ?? null
                                                    const selected = supirList.find(s => s.id_supir === selectedId)
                                                    setForm(p => ({
                                                        ...p,
                                                        id_supir: selectedId,
                                                        ...(selected?.id_armada_default ? { id_armada: selected.id_armada_default } : {}),
                                                    }))
                                                }} />
                                        </FormItem>
                                        <FormItem label="Armada">
                                            <Select isClearable placeholder="Pilih armada..."
                                                options={armadaOptions}
                                                value={armadaOptions.find(o => o.value === form.id_armada) ?? null}
                                                onChange={opt => {
                                                    bolehAutoFill.current = true
                                                    setForm(p => ({ ...p, id_armada: opt?.value ?? null }))
                                                }} />
                                        </FormItem>
                                    </>
                                )}
                                <FormItem label="Karyawan PIC">
                                    <Select isClearable placeholder="Pilih karyawan penanggung jawab..."
                                        options={karyawanOptions}
                                        value={karyawanOptions.find(o => o.value === form.id_karyawan) ?? null}
                                        onChange={opt => setForm(p => ({ ...p, id_karyawan: opt?.value ?? null }))} />
                                </FormItem>
                                <FormItem label="Tanggal Tugas">
                                    <DatePicker
                                        value={form.tanggal_tugas ? new Date(form.tanggal_tugas) : null}
                                        onChange={date => setForm(p => ({ ...p, tanggal_tugas: date ? dayjs(date).format('YYYY-MM-DD') : null }))} />
                                </FormItem>
                                <FormItem label="Status">
                                    <Select isSearchable={false} options={STATUS_OPTIONS}
                                        value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                                        onChange={opt => setForm(p => ({ ...p, status: (opt?.value ?? 'pending') as StatusPenugasan }))} />
                                </FormItem>
                                <FormItem label="Rute (untuk estimasi biaya)">
                                    <Select isClearable isSearchable placeholder="Pilih rute..."
                                        options={ruteOptions}
                                        value={ruteOptions.find(o => o.value === idRuteEstimasi) ?? null}
                                        onChange={opt => {
                                            bolehAutoFill.current = true
                                            setIdRuteEstimasi(opt?.value ?? '')
                                        }} />
                                </FormItem>
                                <FormItem label="Estimasi Biaya" extra="Terisi otomatis dari BOK bila armada & rute dipilih — bisa diubah">
                                    <Input prefix="Rp" placeholder="0"
                                        value={form.estimasi_biaya ? formatNum(Number(form.estimasi_biaya)) : ''}
                                        onChange={e => setForm(p => ({ ...p, estimasi_biaya: e.target.value.replace(/\D/g, '') ? Number(e.target.value.replace(/\D/g, '')) : null }))} />
                                </FormItem>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="plain" onClick={() => { bolehAutoFill.current = false; setEditing(false); setForm(penugasan) }}>Batal</Button>
                                <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                            </div>
                        </form>
                    </>
                )}
            </Card>

            {/* Jadwal Keberangkatan */}
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Jadwal Keberangkatan</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {jadwalList.length} jadwal terdaftar
                        </p>
                    </div>
                    <Button size="sm" variant="solid" icon={<HiOutlinePlus />} onClick={() => setShowJadwalForm(v => !v)}>
                        Tambah Jadwal
                    </Button>
                </div>

                {/* Form tambah jadwal */}
                {showJadwalForm && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Waktu Berangkat" asterisk invalid={!!jadwalErrors.waktu_berangkat} errorMessage={jadwalErrors.waktu_berangkat}>
                                <DatePicker.DateTimepicker
                                    value={jadwalForm.waktu_berangkat ? new Date(jadwalForm.waktu_berangkat) : null}
                                    onChange={date => setJadwalForm(p => ({ ...p, waktu_berangkat: date ? date.toISOString() : '' }))} />
                            </FormItem>
                            <FormItem label="Estimasi Tiba">
                                <DatePicker.DateTimepicker
                                    value={jadwalForm.estimasi_tiba ? new Date(jadwalForm.estimasi_tiba) : null}
                                    onChange={date => setJadwalForm(p => ({ ...p, estimasi_tiba: date ? date.toISOString() : '' }))} />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Rute">
                                    <Select isClearable placeholder="Pilih rute..."
                                        options={ruteOptions}
                                        value={ruteOptions.find(o => o.value === jadwalForm.id_rute) ?? null}
                                        onChange={opt => setJadwalForm(p => ({ ...p, id_rute: opt?.value ?? null }))} />
                                </FormItem>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button size="sm" variant="plain" icon={<HiOutlineX />}
                                onClick={() => { setShowJadwalForm(false); setJadwalForm({ waktu_berangkat: '', id_rute: null, estimasi_tiba: '' }); setJadwalErrors({}) }}>
                                Batal
                            </Button>
                            <Button size="sm" variant="solid" loading={addingJadwal} onClick={handleAddJadwal}>
                                Simpan
                            </Button>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </div>
                )}

                {jadwalLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : jadwalList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada jadwal untuk penugasan ini</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Waktu Berangkat</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Estimasi Tiba</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Rute</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {jadwalList.map(j => (
                                    <tr key={j.id_jadwal}>
                                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {j.tgl_keberangkatan
                                                ? dayjs(j.tgl_keberangkatan).format('DD MMM YYYY HH:mm')
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                                            {j.estimasi_tiba
                                                ? dayjs(j.estimasi_tiba).format('DD MMM YYYY HH:mm')
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                                            {j.rute ?? <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Tag className={`text-xs font-semibold ${JADWAL_STATUS_CLASS[j.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {j.status}
                                            </Tag>
                                        </td>
                                        <td className="py-3 text-right whitespace-nowrap">
                                            <Button size="xs" variant="plain" icon={<HiOutlineExternalLink />} className="mr-1"
                                                onClick={() => router.push(ROUTES.JADWAL_DETAIL(j.id_jadwal))} />
                                            <Button size="xs" variant="plain" icon={<HiOutlineTrash />}
                                                onClick={() => setDeleteJadwalTarget(j)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Confirm Hapus Jadwal */}
            <ConfirmDialog isOpen={!!deleteJadwalTarget} type="danger" title="Hapus Jadwal?"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteJadwalTarget(null)}
                onCancel={() => setDeleteJadwalTarget(null)}
                onConfirm={handleDeleteJadwal}
                confirmButtonProps={{ loading: deletingJadwal }}>
                <p>Jadwal tanggal <strong>
                    {deleteJadwalTarget?.tgl_keberangkatan
                        ? dayjs(deleteJadwalTarget.tgl_keberangkatan).format('DD MMM YYYY HH:mm')
                        : '—'}
                </strong> akan dihapus.</p>
            </ConfirmDialog>
        </div>
    )
}
