'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiArrowLeft, HiPlusCircle, HiOutlineViewList, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { TIPE_HARGA_OPTIONS, tipeHargaNilaiTetap } from '@/constants/tipeHarga.constant'
import { projectService, TipeHargaProyek } from '@/services/project.service'
import { klienService, Klien } from '@/services/klien.service'
import { penawaranService, Penawaran } from '@/services/penawaran.service'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ruteService, Rute, labelRute } from '@/services/rute.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { ProyekRutePayload } from '@/services/proyekRute.service'
import { komponenUangJalanService, KomponenUangJalan } from '@/services/komponenUangJalan.service'
import { proyekUnitService, type OpsiUnitProyek } from '@/services/proyekUnit.service'
import PilihUnitProyekDialog, { SUMBER_UNIT_TAG, MAKS_UNIT_PROYEK, kunciUnit, kePayloadUnit, ringkasUnit } from '../PilihUnitProyekDialog'
import RuteTarifRows from '@/components/shared/RuteTarifRows'
import PilihRuteDialog, { PilihanItemRute } from '../../penawaran/PilihRuteDialog'
import {
    RuteTarifState, EMPTY_RUTE_TARIF_STATE, RuteOption,
    ruteTarifValid, toProyekRutePayload,
} from '@/components/shared/RuteTarifFields'

const STATUS_OPTIONS = [
    { value: 'draft',   label: 'Draft' },
    { value: 'aktif',   label: 'Aktif' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'batal',   label: 'Batal' },
]

export default function ProjectBaruPage() {
    const router       = useRouter()
    const searchParams = useSearchParams()
    const [form, setForm] = useState({
        id_klien:          searchParams.get('id_klien') ?? '',
        nama_proyek:       searchParams.get('nama_proyek') ?? '',
        tanggal_mulai:     '',
        tanggal_selesai:   '',
        tipe_harga:        'per_rit' as TipeHargaProyek,
        harga_penawaran:   '',
        harga_proyek:      '',
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
    const [manualRuteRows, setManualRuteRows] = useState<RuteTarifState[]>([])
    const [ruteRowsError, setRuteRowsError] = useState('')
    const [dialogRuteTerbuka, setDialogRuteTerbuka] = useState(false)
    const [hargaDiketikManual, setHargaDiketikManual] = useState({ penawaran: false, proyek: false })
    const [komponenOpsi, setKomponenOpsi] = useState<KomponenUangJalan[]>([])
    const [unitDipilih, setUnitDipilih] = useState<OpsiUnitProyek[]>([])
    const [dialogUnitTerbuka, setDialogUnitTerbuka] = useState(false)
    const muatOpsiUnit = useCallback(() => proyekUnitService.opsiProyekBaru(), [])

    useEffect(() => {
        komponenUangJalanService.opsi().then(setKomponenOpsi)
            .catch(err => toast.push(<Notification type="danger" title={`Komponen uang jalan gagal dimuat: ${parseApiError(err)}`} />))
        klienService.list(1).then(res =>
            setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: `${k.kode_klien} — ${k.nama_klien}` })))
        ).catch(() => {})
    }, [])

    useEffect(() => {
        if (!fromPenawaran) return
        penawaranService.get(fromPenawaran)
            .then(p => {
                setPreviewPenawaran(p)
                setForm(prev => ({ ...prev, harga_penawaran: p.nilai_penawaran != null ? String(p.nilai_penawaran) : '' }))
            })
            .catch(() => {})
    }, [fromPenawaran])

    const muatRuteOptions = () =>
        ruteService.list({ limit: 100 })
            .then(res => setRuteOptionsMaster((res.data ?? []).map((r: Rute) => ({
                value: r.id_rute,
                label: labelRute(r),
                asal: r.asal,
                tujuan: r.tujuan,
                estimasi_jarak_km: r.estimasi_jarak_km,
                estimasi_durasi_menit: r.estimasi_durasi_menit,
            }))))
            .catch(() => {})

    useEffect(() => {
        if (fromPenawaran) return
        muatRuteOptions()
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisOptionsMaster(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
    }, [fromPenawaran])

    useEffect(() => {
        if (fromPenawaran) return
        const total = manualRuteRows.reduce((sum, r) => sum + (Number(r.harga_penawaran) || 0) * (Number(r.estimasi_ritase) || 1), 0)
        const nilai = total > 0 ? String(total) : ''
        setForm(p => ({
            ...p,
            harga_penawaran: hargaDiketikManual.penawaran ? p.harga_penawaran : nilai,
            harga_proyek:    hargaDiketikManual.proyek    ? p.harga_proyek    : nilai,
        }))
    }, [manualRuteRows, fromPenawaran, hargaDiketikManual])

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.id_klien)           e.id_klien    = 'Klien wajib dipilih'
        if (!form.nama_proyek.trim()) e.nama_proyek = 'Nama proyek wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const tambahBarisRute = () =>
        setManualRuteRows(prev => [...prev, { ...EMPTY_RUTE_TARIF_STATE }])

    const updateRuteRow = (index: number, patch: Partial<RuteTarifState>) => {
        setManualRuteRows(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row))
        if (ruteRowsError) setRuteRowsError('')
    }

    const hapusBarisRute = (index: number) =>
        setManualRuteRows(prev => prev.filter((_, i) => i !== index))

    const tambahRuteDariDialog = (pilihan: PilihanItemRute) =>
        setManualRuteRows(prev => [...prev, { ...EMPTY_RUTE_TARIF_STATE, id_rute: pilihan.id_rute }])

    const validateManualRuteRows = () => {
        if (manualRuteRows.length === 0) return true
        const invalid = manualRuteRows.some(row => !ruteTarifValid(row))
        setRuteRowsError(invalid ? 'Setiap baris rute wajib memilih rute' : '')
        return !invalid
    }

    const handleSubmit = async () => {
        if (!validate() || !validateManualRuteRows()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setLoading(true)
        try {
            const rute: ProyekRutePayload[] = manualRuteRows.map(row => toProyekRutePayload(row))

            await projectService.create({
                id_klien: form.id_klien, nama_proyek: form.nama_proyek,
                tanggal_mulai: form.tanggal_mulai || undefined, tanggal_selesai: form.tanggal_selesai || undefined,
                tipe_harga: form.tipe_harga,
                harga_penawaran: form.harga_penawaran ? Number(form.harga_penawaran) : undefined,
                harga_proyek: form.harga_proyek ? Number(form.harga_proyek) : undefined,
                status: form.status || undefined, keterangan: form.keterangan || undefined,
                id_penawaran: fromPenawaran || undefined,
                rute: rute.length > 0 ? rute : undefined,
                unit: unitDipilih.length > 0 ? unitDipilih.map(kePayloadUnit) : undefined,
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
                    <FormItem label="Nama Proyek" asterisk invalid={!!errors.nama_proyek} errorMessage={errors.nama_proyek}>
                        <Input placeholder="Nama proyek" value={form.nama_proyek} invalid={!!errors.nama_proyek}
                            onChange={(e) => setForm(p => ({ ...p, nama_proyek: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Tipe Harga" asterisk>
                        <Select isSearchable={false} options={TIPE_HARGA_OPTIONS}
                            value={TIPE_HARGA_OPTIONS.find(o => o.value === form.tipe_harga) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, tipe_harga: (opt?.value ?? 'per_rit') as TipeHargaProyek }))} />
                    </FormItem>
                    <FormItem label="Tanggal Mulai">
                        <DatePicker value={form.tanggal_mulai ? new Date(form.tanggal_mulai) : null}
                            onChange={(date) => setForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Tanggal Selesai">
                        <DatePicker value={form.tanggal_selesai ? new Date(form.tanggal_selesai) : null}
                            onChange={(date) => setForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem
                        label={fromPenawaran
                            ? (tipeHargaNilaiTetap(form.tipe_harga) ? 'Nilai Kontrak' : 'Harga Penawaran')
                            : (tipeHargaNilaiTetap(form.tipe_harga) ? 'Nilai Kontrak (opsional)' : 'Harga Penawaran (opsional)')}
                        extra={fromPenawaran ? <span className="text-xs text-gray-400">Mengikuti nilai penawaran — ubah lewat penawaran revisi</span> : undefined}
                    >
                        <Input prefix="Rp" placeholder="0" readOnly={!!fromPenawaran}
                            value={form.harga_penawaran ? formatNum(Number(form.harga_penawaran)) : ''}
                            onChange={(e) => {
                                if (fromPenawaran) return
                                const v = e.target.value.replace(/\D/g, '')
                                setHargaDiketikManual(m => ({ ...m, penawaran: v !== '' }))
                                setForm(p => ({ ...p, harga_penawaran: v }))
                            }} />
                    </FormItem>
                    {/* <FormItem label="Harga Proyek (opsional)">
                        <Input prefix="Rp" placeholder="0"
                            value={form.harga_proyek ? formatNum(Number(form.harga_proyek)) : ''}
                            onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '')
                                setHargaDiketikManual(m => ({ ...m, proyek: v !== '' }))
                                setForm(p => ({ ...p, harga_proyek: v }))
                            }} />
                    </FormItem> */}
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
                                <p className="text-xs text-gray-400 mt-0.5">{manualRuteRows.length} rute akan ditambahkan</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button type="button" size="sm" variant="default" icon={<HiOutlineViewList />}
                                    disabled={!form.id_klien}
                                    onClick={() => setDialogRuteTerbuka(true)}>
                                    Daftar Rute
                                </Button>
                                <Tooltip title={form.id_klien ? '' : 'Pilih klien dulu sebelum menambah rute'}>
                                    <span>
                                        <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                            disabled={!form.id_klien}
                                            onClick={tambahBarisRute}>
                                            Tambah Rute
                                        </Button>
                                    </span>
                                </Tooltip>
                            </div>
                        </div>
                        {!form.id_klien && <p className="text-xs text-amber-500 mt-1">Pilih klien dulu sebelum menambah rute</p>}
                        {ruteRowsError && <p className="text-red-500 text-sm mt-2">{ruteRowsError}</p>}

                        {manualRuteRows.length > 0 && (
                            <div className="mt-4">
                                <RuteTarifRows
                                    rows={manualRuteRows}
                                    onChangeRow={(index, next) => updateRuteRow(index, next)}
                                    onHapusRow={hapusBarisRute}
                                    ruteOptions={ruteOptionsMaster}
                                    jenisOptions={jenisOptionsMaster}
                                    komponenOpsi={komponenOpsi}
                                    onRuteCreated={() => muatRuteOptions()}
                                />
                                <div className="flex justify-end mt-3">
                                    <p className="text-sm">Total Nilai Penawaran:{' '}
                                        <span className="font-bold text-base">
                                            {formatRupiah(manualRuteRows.reduce((sum, r) => sum + (Number(r.harga_penawaran) || 0) * (Number(r.estimasi_ritase) || 1), 0))}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        )}

                        <PilihRuteDialog isOpen={dialogRuteTerbuka} konteks="proyek"
                            onClose={() => setDialogRuteTerbuka(false)}
                            onPilih={tambahRuteDariDialog}
                            onRuteBaru={() => muatRuteOptions()}
                            onRuteDihapus={() => muatRuteOptions()}
                            idRuteDipakai={manualRuteRows.map(r => r.id_rute).filter(Boolean)} />
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Unit Proyek (opsional)</p>
                            <p className="text-xs text-gray-400 mt-0.5">{unitDipilih.length} unit akan ditambahkan · supir pemegang unit ikut masuk ke proyek</p>
                        </div>
                        <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                            disabled={unitDipilih.length >= MAKS_UNIT_PROYEK}
                            onClick={() => setDialogUnitTerbuka(true)}>
                            Tambah Unit
                        </Button>
                    </div>

                    {unitDipilih.length > 0 && (
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="py-2.5 pl-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4 w-12">No</th>
                                        <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Unit</th>
                                        <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Kepemilikan</th>
                                        <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Supir</th>
                                        <th className="py-2.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {unitDipilih.map((u, i) => {
                                        const sumber = SUMBER_UNIT_TAG[u.sumber] ?? SUMBER_UNIT_TAG.internal
                                        const detail = ringkasUnit(u)
                                        return (
                                            <tr key={kunciUnit(u)}>
                                                <td className="py-3 pl-3 pr-4 text-gray-500">{i + 1}</td>
                                                <td className="py-3 pr-4">
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">{u.nopol ?? '—'}</p>
                                                    {detail && <p className="text-xs text-gray-400">{detail}</p>}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <Tag className={`text-xs font-semibold ${sumber.tag}`}>{sumber.label}</Tag>
                                                    {u.sumber === 'vendor' && u.nama_vendor && <p className="text-xs text-gray-400 mt-1">{u.nama_vendor}</p>}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    {u.nama_supir
                                                        ? <span className="text-gray-700 dark:text-gray-300">{u.nama_supir}</span>
                                                        : <span className="text-xs text-gray-400">Belum ada pemegang</span>}
                                                </td>
                                                <td className="py-3 text-right whitespace-nowrap">
                                                    <Tooltip title="Batal pilih unit">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                            onClick={() => setUnitDipilih(prev => prev.filter(x => kunciUnit(x) !== kunciUnit(u)))}>
                                                            <HiOutlineTrash className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <PilihUnitProyekDialog isOpen={dialogUnitTerbuka} onClose={() => setDialogUnitTerbuka(false)}
                        muatOpsi={muatOpsiUnit}
                        kecualiKunci={unitDipilih.map(kunciUnit)}
                        maks={MAKS_UNIT_PROYEK - unitDipilih.length}
                        pesanKosong={unitDipilih.length > 0 ? 'Semua unit yang tersedia sudah dipilih' : 'Belum ada unit aktif yang bisa dipilih'}
                        keterangan="Centang unit yang dipakai di proyek ini. Unit disimpan bersama proyek dan supir pemegang unit ikut masuk ke proyek. Penugasan harian tetap dibuat di halaman Penugasan."
                        onSimpan={pilihan => { setUnitDipilih(prev => [...prev, ...pilihan]); setDialogUnitTerbuka(false) }} />
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
