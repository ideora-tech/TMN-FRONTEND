'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, Select, toast, Notification } from '@/components/ui'
import { HiArrowLeft, HiPlusCircle, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { projectService } from '@/services/project.service'
import { klienService, Klien } from '@/services/klien.service'
import { penawaranService, Penawaran } from '@/services/penawaran.service'
import { formatRupiah } from '@/utils/formatNumber'
import { ruteService, Rute } from '@/services/rute.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { ProyekRutePayload } from '@/services/proyekRute.service'
import RuteTarifFields, { RuteTarifState, EMPTY_RUTE_TARIF_STATE, resolveTarifId, hargaPenawaranEfektif, RuteOption } from '@/components/shared/RuteTarifFields'

const STATUS_OPTIONS = [
    { value: 'draft',   label: 'Draft' },
    { value: 'aktif',   label: 'Aktif' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'batal',   label: 'Batal' },
]

type StagedRute = {
    tarif: RuteTarifState
    keterangan: string
    namaRute: string
    namaJenis: string
}

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
    const [previewPenawaran, setPreviewPenawaran] = useState<Penawaran | null>(null)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})

    // Rute Proyek manual (hanya saat proyek dibuat manual, bukan dari penawaran)
    const [ruteOptionsMaster, setRuteOptionsMaster] = useState<RuteOption[]>([])
    const [jenisOptionsMaster, setJenisOptionsMaster] = useState<{ value: string; label: string }[]>([])
    const [showManualRuteForm, setShowManualRuteForm] = useState(false)
    const [manualRuteTarif, setManualRuteTarif] = useState<RuteTarifState>(EMPTY_RUTE_TARIF_STATE)
    const [manualRuteKeterangan, setManualRuteKeterangan] = useState('')
    const [manualRuteList, setManualRuteList] = useState<StagedRute[]>([])

    useEffect(() => {
        klienService.list(1).then(res =>
            setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: `${k.kode_klien} — ${k.nama_klien}` })))
        ).catch(() => {})
    }, [])

    useEffect(() => {
        if (!fromPenawaran) return
        penawaranService.get(fromPenawaran)
            .then(p => setPreviewPenawaran(p))
            .catch(() => {})
    }, [fromPenawaran])

    useEffect(() => {
        if (fromPenawaran) return
        ruteService.list({ limit: 100 })
            .then(res => setRuteOptionsMaster((res.data ?? []).map((r: Rute) => ({
                value: r.id_rute,
                label: r.nama_rute,
                asal: r.asal,
                tujuan: r.tujuan,
                estimasi_jarak_km: r.estimasi_jarak_km,
                estimasi_durasi_menit: r.estimasi_durasi_menit,
            }))))
            .catch(() => {})
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisOptionsMaster(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
    }, [fromPenawaran])

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.id_klien)           e.id_klien    = 'Klien wajib dipilih'
        if (!form.kode_proyek.trim()) e.kode_proyek = 'Kode proyek wajib diisi'
        if (!form.nama_proyek.trim()) e.nama_proyek = 'Nama proyek wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const openAddManualRute = () => {
        setManualRuteTarif(EMPTY_RUTE_TARIF_STATE)
        setManualRuteKeterangan('')
        setShowManualRuteForm(true)
    }

    const tambahKeDaftarRute = () => {
        if (!manualRuteTarif.id_rute || !manualRuteTarif.id_jenis_kendaraan) return
        setManualRuteList(prev => [...prev, {
            tarif: manualRuteTarif,
            keterangan: manualRuteKeterangan,
            namaRute: ruteOptionsMaster.find(o => o.value === manualRuteTarif.id_rute)?.label ?? 'Rute',
            namaJenis: jenisOptionsMaster.find(o => o.value === manualRuteTarif.id_jenis_kendaraan)?.label ?? '',
        }])
        setShowManualRuteForm(false)
    }

    const hapusDariDaftarRute = (index: number) =>
        setManualRuteList(prev => prev.filter((_, i) => i !== index))

    const handleSubmit = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setLoading(true)
        try {
            const rute: ProyekRutePayload[] = []
            for (const staged of manualRuteList) {
                const idTarifRute = await resolveTarifId(staged.tarif, form.id_klien)
                rute.push({
                    id_rute: staged.tarif.id_rute,
                    id_jenis_kendaraan: staged.tarif.id_jenis_kendaraan,
                    id_tarif_rute: idTarifRute ?? undefined,
                    harga_penawaran: hargaPenawaranEfektif(staged.tarif) ? Number(hargaPenawaranEfektif(staged.tarif)) : undefined,
                    keterangan: staged.keterangan || undefined,
                })
            }

            await projectService.create({
                id_klien: form.id_klien, kode_proyek: form.kode_proyek, nama_proyek: form.nama_proyek,
                tanggal_mulai: form.tanggal_mulai || undefined, tanggal_selesai: form.tanggal_selesai || undefined,
                status: form.status || undefined, keterangan: form.keterangan || undefined,
                id_penawaran: fromPenawaran || undefined,
                rute: rute.length > 0 ? rute : undefined,
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
            {previewPenawaran && previewPenawaran.items && previewPenawaran.items.length > 0 && (
                <Card className="border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                        Rute yang akan disalin ke proyek ini
                    </p>
                    <ul className="space-y-1">
                        {previewPenawaran.items.map(item => (
                            <li key={item.id_penawaran_item} className="text-sm text-emerald-700 dark:text-emerald-400">
                                {item.nama_rute ?? item.kode_rute ?? 'Rute'}
                                {item.nama_jenis ? ` — ${item.nama_jenis}` : ''}
                                {item.harga_satuan ? ` (${formatRupiah(item.harga_satuan)})` : ''}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
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

                {!fromPenawaran && (
                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Rute Proyek (opsional)</p>
                                <p className="text-xs text-gray-400 mt-0.5">{manualRuteList.length} rute akan ditambahkan</p>
                            </div>
                            <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                disabled={!form.id_klien}
                                onClick={openAddManualRute}>
                                Tambah Rute
                            </Button>
                        </div>
                        {!form.id_klien && <p className="text-xs text-amber-500 mt-1">Pilih klien dulu sebelum menambah rute</p>}

                        {showManualRuteForm && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <RuteTarifFields value={manualRuteTarif} onChange={setManualRuteTarif}
                                    ruteOptions={ruteOptionsMaster} jenisOptions={jenisOptionsMaster} idKlien={form.id_klien} />
                                <div className="mt-3">
                                    <FormItem label="Keterangan">
                                        <Input textArea placeholder="Keterangan tambahan..." value={manualRuteKeterangan}
                                            onChange={e => setManualRuteKeterangan(e.target.value)} />
                                    </FormItem>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button type="button" size="sm" variant="plain" onClick={() => setShowManualRuteForm(false)}>Batal</Button>
                                    <Button type="button" size="sm" variant="solid"
                                        disabled={!manualRuteTarif.id_rute || !manualRuteTarif.id_jenis_kendaraan}
                                        onClick={tambahKeDaftarRute}>Tambah ke daftar</Button>
                                </div>
                            </div>
                        )}

                        {manualRuteList.length > 0 && (
                            <div className="overflow-x-auto mt-4">
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-50 dark:bg-blue-500/10">
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Rute</th>
                                            <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Jenis Kendaraan</th>
                                            <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Harga Penawaran</th>
                                            <th className="py-2.5" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {manualRuteList.map((staged, i) => (
                                            <tr key={i}>
                                                <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{staged.namaRute}</td>
                                                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{staged.namaJenis}</td>
                                                <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                                                    {hargaPenawaranEfektif(staged.tarif) ? formatRupiah(Number(hargaPenawaranEfektif(staged.tarif))) : '—'}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <Button size="xs" variant="plain" icon={<HiOutlineTrash />}
                                                        onClick={() => hapusDariDaftarRute(i)} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button type="submit" variant="solid" loading={loading}>Simpan</Button>
                </div>
                </form>
            </Card>
        </div>
    )
}
