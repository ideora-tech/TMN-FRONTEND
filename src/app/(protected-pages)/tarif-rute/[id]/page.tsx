'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { HiArrowLeft, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi'
import dayjs from 'dayjs'
import { tarifRuteService, EstimasiBok } from '@/services/tarifRute.service'
import { ruteService, Rute } from '@/services/rute.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { klienService, Klien } from '@/services/klien.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'

interface FormState {
    id_rute: string
    id_jenis_kendaraan: string
    id_klien: string
    harga: string
    estimasi_tol: string
    estimasi_bbm: string
    estimasi_uang_jalan: string
    estimasi_biaya_lain: string
    tanggal_mulai: string
    tanggal_berakhir: string
    keterangan: string
}

type Option = { value: string; label: string }

const INIT: FormState = {
    id_rute: '', id_jenis_kendaraan: '', id_klien: '', harga: '',
    estimasi_tol: '', estimasi_bbm: '', estimasi_uang_jalan: '', estimasi_biaya_lain: '',
    tanggal_mulai: dayjs().format('YYYY-MM-DD'), tanggal_berakhir: '', keterangan: '',
}

export default function TarifRuteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [form, setForm] = useState<FormState>(INIT)
    const [saving, setSaving] = useState(false)
    const [showRincian, setShowRincian] = useState(false)
    const [ruteOptions, setRuteOptions] = useState<Option[]>([])
    const [jenisOptions, setJenisOptions] = useState<Option[]>([])
    const [klienOptions, setKlienOptions] = useState<Option[]>([])
    const [estimasi, setEstimasi] = useState<EstimasiBok | null>(null)
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        ruteService.list({ limit: 100 })
            .then(res => setRuteOptions((res.data ?? []).map((r: Rute) => ({
                value: r.id_rute,
                label: `${r.nama_rute}${r.asal && r.tujuan ? ` (${r.asal} → ${r.tujuan})` : ''}${r.estimasi_jarak_km != null ? ` — ${formatNum(r.estimasi_jarak_km, r.estimasi_jarak_km % 1 ? 1 : 0)} km` : ''}`,
            }))))
            .catch(() => {})
        jenisKendaraanService.list(1)
            .then(res => setJenisOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
        klienService.list(1, 100)
            .then(res => setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: k.nama_klien }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        tarifRuteService.get(id)
            .then(d => {
                setForm({
                    id_rute: d.id_rute,
                    id_jenis_kendaraan: d.id_jenis_kendaraan,
                    id_klien: d.id_klien ?? '',
                    harga: String(Math.round(d.harga)),
                    estimasi_tol: d.estimasi_tol != null ? String(Math.round(d.estimasi_tol)) : '',
                    estimasi_bbm: d.estimasi_bbm != null ? String(Math.round(d.estimasi_bbm)) : '',
                    estimasi_uang_jalan: d.estimasi_uang_jalan != null ? String(Math.round(d.estimasi_uang_jalan)) : '',
                    estimasi_biaya_lain: d.estimasi_biaya_lain != null ? String(Math.round(d.estimasi_biaya_lain)) : '',
                    tanggal_mulai: d.tanggal_mulai,
                    tanggal_berakhir: d.tanggal_berakhir ?? '',
                    keterangan: d.keterangan ?? '',
                })
                if (d.estimasi_tol != null || d.estimasi_bbm != null || d.estimasi_uang_jalan != null || d.estimasi_biaya_lain != null) {
                    setShowRincian(true)
                }
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false))
    }, [id])

    // Panel Estimasi Keuangan (BOK) — murni referensi, tidak memblokir simpan
    useEffect(() => {
        if (!form.id_rute || !form.id_jenis_kendaraan) {
            setEstimasi(null)
            return
        }
        let aktif = true
        tarifRuteService.estimasiBok({
            id_rute: form.id_rute,
            id_jenis_kendaraan: form.id_jenis_kendaraan,
            estimasi_tol: form.estimasi_tol ? Number(form.estimasi_tol) : undefined,
        })
            .then(est => { if (aktif) setEstimasi(est) })
            .catch(() => { if (aktif) setEstimasi(null) })
        return () => { aktif = false }
    }, [form.id_rute, form.id_jenis_kendaraan, form.estimasi_tol])

    const set = (field: keyof FormState, value: string) =>
        setForm(p => ({ ...p, [field]: value }))

    const hargaInput = form.harga ? Number(form.harga) : 0
    const marginAktual = estimasi && estimasi.harga_pokok > 0 && hargaInput > 0
        ? ((hargaInput - estimasi.harga_pokok) / estimasi.harga_pokok) * 100
        : null

    const validate = () => {
        const e: Partial<Record<keyof FormState, string>> = {}
        if (!form.id_rute) e.id_rute = 'Rute wajib diisi'
        if (!form.id_jenis_kendaraan) e.id_jenis_kendaraan = 'Jenis kendaraan wajib diisi'
        if (!form.harga) e.harga = 'Harga wajib diisi'
        if (!form.tanggal_mulai) e.tanggal_mulai = 'Tanggal mulai wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setSaving(true)
        try {
            await tarifRuteService.update(id, {
                id_rute: form.id_rute,
                id_jenis_kendaraan: form.id_jenis_kendaraan,
                id_klien: form.id_klien || null,
                harga: Number(form.harga),
                estimasi_tol: form.estimasi_tol ? Number(form.estimasi_tol) : null,
                estimasi_bbm: form.estimasi_bbm ? Number(form.estimasi_bbm) : null,
                estimasi_uang_jalan: form.estimasi_uang_jalan ? Number(form.estimasi_uang_jalan) : null,
                estimasi_biaya_lain: form.estimasi_biaya_lain ? Number(form.estimasi_biaya_lain) : null,
                tanggal_mulai: form.tanggal_mulai,
                tanggal_berakhir: form.tanggal_berakhir || null,
                keterangan: form.keterangan.trim() || null,
            })
            toast.push(<Notification type="success" title="Tarif berhasil diperbarui" />)
            router.push(ROUTES.TARIF_RUTE)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (notFound) return <div className="p-6 text-red-500">Tarif tidak ditemukan.</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.TARIF_RUTE)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">Ubah Tarif Rute</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Harga jual flat per trip sekali jalan; kosongkan klien untuk harga umum</p>
                </div>
            </div>
            <Card>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Rute" asterisk invalid={!!errors.id_rute} errorMessage={errors.id_rute}>
                            <Select<Option> isSearchable placeholder="Pilih rute..."
                                options={ruteOptions}
                                value={ruteOptions.find(o => o.value === form.id_rute) ?? null}
                                onChange={opt => set('id_rute', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Jenis Kendaraan" asterisk invalid={!!errors.id_jenis_kendaraan} errorMessage={errors.id_jenis_kendaraan}>
                            <Select<Option> isSearchable placeholder="Pilih jenis kendaraan..."
                                options={jenisOptions}
                                value={jenisOptions.find(o => o.value === form.id_jenis_kendaraan) ?? null}
                                onChange={opt => set('id_jenis_kendaraan', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Klien">
                            <Select<Option> isClearable isSearchable placeholder="Harga umum (semua klien)"
                                options={klienOptions}
                                value={klienOptions.find(o => o.value === form.id_klien) ?? null}
                                onChange={opt => set('id_klien', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Harga per Trip" asterisk invalid={!!errors.harga} errorMessage={errors.harga}>
                            <Input prefix="Rp" placeholder="0" invalid={!!errors.harga}
                                value={form.harga ? formatNum(Number(form.harga)) : ''}
                                onChange={e => set('harga', e.target.value.replace(/\D/g, ''))} />
                        </FormItem>
                        <FormItem label="Tanggal Mulai" asterisk invalid={!!errors.tanggal_mulai} errorMessage={errors.tanggal_mulai}>
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={form.tanggal_mulai ? dayjs(form.tanggal_mulai).toDate() : null}
                                onChange={date => set('tanggal_mulai', date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        </FormItem>
                        <FormItem label="Tanggal Berakhir">
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={form.tanggal_berakhir ? dayjs(form.tanggal_berakhir).toDate() : null}
                                onChange={date => set('tanggal_berakhir', date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        </FormItem>
                    </div>

                    <button type="button"
                        className="flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-2"
                        onClick={() => setShowRincian(v => !v)}>
                        {showRincian ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
                        Rincian Estimasi Biaya (opsional)
                    </button>
                    {showRincian && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <FormItem label="Estimasi Tol">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.estimasi_tol ? formatNum(Number(form.estimasi_tol)) : ''}
                                    onChange={e => set('estimasi_tol', e.target.value.replace(/\D/g, ''))} />
                            </FormItem>
                            <FormItem label="Estimasi BBM">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.estimasi_bbm ? formatNum(Number(form.estimasi_bbm)) : ''}
                                    onChange={e => set('estimasi_bbm', e.target.value.replace(/\D/g, ''))} />
                            </FormItem>
                            <FormItem label="Estimasi Uang Jalan">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.estimasi_uang_jalan ? formatNum(Number(form.estimasi_uang_jalan)) : ''}
                                    onChange={e => set('estimasi_uang_jalan', e.target.value.replace(/\D/g, ''))} />
                            </FormItem>
                            <FormItem label="Estimasi Biaya Lain">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.estimasi_biaya_lain ? formatNum(Number(form.estimasi_biaya_lain)) : ''}
                                    onChange={e => set('estimasi_biaya_lain', e.target.value.replace(/\D/g, ''))} />
                            </FormItem>
                        </div>
                    )}

                    {/* Panel Estimasi Keuangan (BOK) */}
                    {form.id_rute && form.id_jenis_kendaraan && (
                        <div className="mt-5 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-4">
                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-3">Estimasi Keuangan (BOK)</p>
                            {estimasi ? (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide">BOK per Km</p>
                                            <p className="text-sm font-semibold">{formatRupiah(estimasi.bok_per_km)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide">Harga Pokok</p>
                                            <p className="text-sm font-semibold">{formatRupiah(estimasi.harga_pokok)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide">Saran Harga (+{formatNum(estimasi.margin_persen_default, 1)}%)</p>
                                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(estimasi.saran_harga)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide">Margin Harga Anda</p>
                                            <p className={`text-sm font-semibold ${
                                                marginAktual === null ? 'text-gray-400'
                                                : marginAktual < 0 ? 'text-red-500'
                                                : marginAktual < estimasi.margin_persen_default ? 'text-amber-500'
                                                : 'text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                                {marginAktual !== null ? `${formatNum(marginAktual, 1)}%` : '—'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <p className="text-xs text-gray-400">
                                            Jarak {formatNum(estimasi.komponen.jarak_km, 1)} km · BBM {formatRupiah(estimasi.komponen.harga_bbm_per_liter)}/L ÷ {formatNum(estimasi.komponen.konsumsi_km_per_liter, 1)} km/L · referensi saja, tidak mengunci harga
                                        </p>
                                        <Button type="button" size="sm" onClick={() => set('harga', String(Math.round(estimasi.saran_harga)))}>
                                            Pakai Saran Harga
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-gray-400">
                                    Estimasi belum tersedia — lengkapi Parameter BOK jenis kendaraan ini, harga BBM, dan estimasi jarak pada rute. Form tetap bisa disimpan.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 mt-3">
                        <FormItem label="Keterangan">
                            <Input textArea rows={3} placeholder="Catatan tambahan (opsional)"
                                value={form.keterangan} onChange={e => set('keterangan', e.target.value)} />
                        </FormItem>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="plain" onClick={() => router.push(ROUTES.TARIF_RUTE)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan Tarif</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
