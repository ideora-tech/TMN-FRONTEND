'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Dialog, FormItem, Input, Upload, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { HiArrowLeft, HiPlusCircle, HiOutlineTrash, HiOutlineDownload, HiOutlineUpload } from 'react-icons/hi'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { kontrakVendorService, KontrakUnitInput, KontrakSupirInput, BarisGagal } from '@/services/kontrak-vendor.service'
import { Vendor } from '@/services/vendor.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'

const MEKANISME_OPTIONS = [
    { value: 'unit_only',   label: 'Unit Only' },
    { value: 'unit_driver', label: 'Unit + Driver' },
    { value: 'full',        label: 'All In' },
]

const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'All In',
}

const SATUAN_OPTIONS = [
    { value: 'per trip',  label: 'Per Trip' },
    { value: 'per ton',   label: 'Per Ton' },
    { value: 'per hari',  label: 'Per Hari' },
    { value: 'per bulan', label: 'Per Bulan' },
    { value: 'lumpsum',   label: 'Lumpsum' },
]

type UnitRow = {
    nopol: string; merk: string; jenis: string; id_jenis_kendaraan: string
    tahun: string; kapasitas: string; masa_berlaku_stnk: string; masa_berlaku_kir: string
    supir_index: string
    driver_nama: string; driver_telepon: string; driver_no_sim: string
}
type SupirRow = { nama: string; telepon: string; no_sim: string }

const emptyUnitRow = (): UnitRow => ({
    nopol: '', merk: '', jenis: '', id_jenis_kendaraan: '',
    tahun: '', kapasitas: '', masa_berlaku_stnk: '', masa_berlaku_kir: '',
    supir_index: '',
    driver_nama: '', driver_telepon: '', driver_no_sim: '',
})
const emptySupirRow = (): SupirRow => ({ nama: '', telepon: '', no_sim: '' })

const unitInputKeRow = (u: KontrakUnitInput): UnitRow => ({
    nopol: u.nopol ?? '',
    merk: u.merk ?? '',
    jenis: u.jenis ?? '',
    id_jenis_kendaraan: u.id_jenis_kendaraan ?? '',
    tahun: u.tahun != null ? String(u.tahun) : '',
    kapasitas: u.kapasitas ?? '',
    masa_berlaku_stnk: u.masa_berlaku_stnk ?? '',
    masa_berlaku_kir: u.masa_berlaku_kir ?? '',
    supir_index: '',
    driver_nama: '', driver_telepon: '', driver_no_sim: '',
})
const supirInputKeRow = (s: KontrakSupirInput): SupirRow => ({
    nama: s.nama ?? '',
    telepon: s.telepon ?? '',
    no_sim: s.no_sim ?? '',
})

// Supir cadangan disembunyikan sementara — ubah ke true untuk menampilkan lagi
const TAMPILKAN_SUPIR_CADANGAN = false

export default function KontrakVendorBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        id_vendor: '', mekanisme: 'unit_only', nilai_kontrak: '',
        nomor_kontrak: '', jenis_layanan: '', rate: '', satuan: '',
        pajak_persen: '', termin_pembayaran_hari: '',
        tanggal_mulai: '', tanggal_selesai: '',
    })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors]   = useState<Record<string, string>>({})
    const [vendorOptions, setVendorOptions] = useState<{ value: string; label: string }[]>([])
    const [jenisKendaraanOptions, setJenisKendaraanOptions] = useState<{ value: string; label: string }[]>([])
    const [unitRows, setUnitRows]   = useState<UnitRow[]>([])
    const [supirRows, setSupirRows] = useState<SupirRow[]>([])
    const [salinDari, setSalinDari] = useState('')
    const [kontrakLamaOptions, setKontrakLamaOptions] = useState<{ value: string; label: string }[]>([])
    const [downloadingTemplate, setDownloadingTemplate] = useState<'' | 'unit' | 'supir'>('')
    const [parsing, setParsing] = useState<'' | 'unit' | 'supir'>('')
    const [parseGagal, setParseGagal] = useState<{ judul: string; daftar: BarisGagal[] } | null>(null)
    const [hapusSemuaTarget, setHapusSemuaTarget] = useState<'unit' | 'supir' | null>(null)

    const pakaiSupir = form.mekanisme !== 'unit_only'

    useEffect(() => {
        axios.get(API_ENDPOINTS.VENDOR, { params: { limit: 999 } })
            .then(r => setVendorOptions((r.data.data as Vendor[]).map(v => ({ value: v.id_vendor, label: v.nama_vendor }))))
            .catch(() => {})
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisKendaraanOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        setSalinDari('')
        setKontrakLamaOptions([])
        if (!form.id_vendor) return
        kontrakVendorService.list(1, { id_vendor: form.id_vendor, limit: '200' })
            .then(res => setKontrakLamaOptions(res.data.map(k => ({
                value: k.id_kontrak_vendor,
                label: `${k.nomor_kontrak || `Kontrak ${k.id_kontrak_vendor.slice(0, 8)}`} — ${MEKANISME_LABEL[k.mekanisme] ?? k.mekanisme}`,
            }))))
            .catch(() => {})
    }, [form.id_vendor])

    const ubahUnitRow = (i: number, patch: Partial<UnitRow>) =>
        setUnitRows(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
    const ubahSupirRow = (i: number, patch: Partial<SupirRow>) =>
        setSupirRows(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))

    const unduhTemplate = async (jenis: 'unit' | 'supir') => {
        setDownloadingTemplate(jenis)
        try {
            const res = await axios.get(
                jenis === 'unit'
                    ? (pakaiSupir ? API_ENDPOINTS.KONTRAK_VENDOR_TEMPLATE_PASANGAN : API_ENDPOINTS.ARMADA_VENDOR_IMPORT_TEMPLATE)
                    : API_ENDPOINTS.SUPIR_VENDOR_IMPORT_TEMPLATE,
                { responseType: 'blob' },
            )
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = jenis === 'unit'
                ? (pakaiSupir ? 'template-import-pasangan-unit-driver.xlsx' : 'template-import-armada-vendor.xlsx')
                : 'template-import-supir-vendor.xlsx'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingTemplate('')
        }
    }

    const umumkanHasilParse = (judul: string, masuk: number, gagal: BarisGagal[]) => {
        toast.push(
            <Notification type={gagal.length > 0 ? 'warning' : 'success'}
                title={`${masuk} baris masuk, ${gagal.length} gagal`} />,
        )
        if (gagal.length > 0) setParseGagal({ judul, daftar: gagal })
    }

    const uploadExcelUnit = async (files: File[]) => {
        const file = files[0]
        if (!file) return
        setParsing('unit')
        try {
            if (pakaiSupir) {
                const hasil = await kontrakVendorService.parsePasangan(file)
                setUnitRows(hasil.baris_valid.map(b => ({
                    ...unitInputKeRow(b),
                    driver_nama: b.driver_nama ?? '',
                    driver_telepon: b.driver_telepon ?? '',
                    driver_no_sim: b.driver_no_sim ?? '',
                })))
                umumkanHasilParse('Pasangan Unit + Driver', hasil.baris_valid.length, hasil.baris_gagal)
            } else {
                const hasil = await kontrakVendorService.parseUnit(file)
                setUnitRows(hasil.baris_valid.map(unitInputKeRow))
                umumkanHasilParse('Unit Disewa', hasil.baris_valid.length, hasil.baris_gagal)
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setParsing('')
        }
    }

    const uploadExcelSupir = async (files: File[]) => {
        const file = files[0]
        if (!file) return
        setParsing('supir')
        try {
            const hasil = await kontrakVendorService.parseSupir(file)
            setSupirRows(hasil.baris_valid.map(supirInputKeRow))
            umumkanHasilParse('Supir dari Vendor', hasil.baris_valid.length, hasil.baris_gagal)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setParsing('')
        }
    }

    const handleHapusSemua = () => {
        if (hapusSemuaTarget === 'unit') setUnitRows([])
        if (hapusSemuaTarget === 'supir') setSupirRows([])
        setHapusSemuaTarget(null)
    }

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.id_vendor) e.id_vendor = 'Vendor wajib dipilih'
        if (!form.nomor_kontrak.trim()) e.nomor_kontrak = 'No. kontrak wajib diisi'
        if (!form.nilai_kontrak) e.nilai_kontrak = 'Nilai kontrak wajib diisi'
        if (!form.rate) e.rate = 'Rate wajib diisi'
        if (!form.satuan) e.satuan = 'Satuan kontrak wajib dipilih'
        if (!form.tanggal_mulai) e.tanggal_mulai = 'Tanggal mulai wajib diisi'
        if (!form.tanggal_selesai) e.tanggal_selesai = 'Tanggal selesai wajib diisi'
        unitRows.forEach((u, i) => {
            if (!u.nopol.trim()) e[`unit_${i}_nopol`] = 'Nopol wajib diisi'
            if (!u.masa_berlaku_stnk) e[`unit_${i}_stnk`] = 'Habis masa berlaku STNK wajib diisi'
            if (!u.masa_berlaku_kir) e[`unit_${i}_kir`] = 'Habis masa berlaku KIR wajib diisi'
        })
        if (pakaiSupir) supirRows.forEach((s, i) => { if (!s.nama.trim()) e[`supir_${i}_nama`] = 'Nama wajib diisi' })
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
            const dibuat = await kontrakVendorService.create({
                id_vendor: form.id_vendor,
                mekanisme: form.mekanisme,
                nomor_kontrak: form.nomor_kontrak.trim() || null,
                jenis_layanan: form.jenis_layanan.trim() || null,
                rate: form.rate ? Number(form.rate) : null,
                satuan: form.satuan || null,
                pajak_persen: form.pajak_persen ? Number(form.pajak_persen) : null,
                termin_pembayaran_hari: form.termin_pembayaran_hari ? Number(form.termin_pembayaran_hari) : null,
                nilai_kontrak: form.nilai_kontrak ? Number(form.nilai_kontrak) : null,
                tanggal_mulai: form.tanggal_mulai || null,
                tanggal_selesai: form.tanggal_selesai || null,
                ...(() => {
                    const supirGabungan: { nama: string; telepon: string | null; no_sim: string | null }[] = []
                    const unit = unitRows.map(u => {
                        let supirIndex: number | null = null
                        if (pakaiSupir && u.driver_nama.trim()) {
                            supirGabungan.push({
                                nama: u.driver_nama.trim(),
                                telepon: u.driver_telepon.trim() || null,
                                no_sim: u.driver_no_sim.trim() || null,
                            })
                            supirIndex = supirGabungan.length - 1
                        }
                        return {
                            nopol: u.nopol.trim(),
                            merk: u.merk.trim() || null,
                            jenis: u.jenis.trim() || null,
                            id_jenis_kendaraan: u.id_jenis_kendaraan || null,
                            tahun: u.tahun ? Number(u.tahun) : null,
                            kapasitas: u.kapasitas.trim() || null,
                            masa_berlaku_stnk: u.masa_berlaku_stnk || null,
                            masa_berlaku_kir: u.masa_berlaku_kir || null,
                            supir_index: supirIndex,
                        }
                    })
                    if (pakaiSupir) {
                        supirRows.forEach(s => supirGabungan.push({
                            nama: s.nama.trim(),
                            telepon: s.telepon.trim() || null,
                            no_sim: s.no_sim.trim() || null,
                        }))
                    }
                    return {
                        ...(unit.length > 0 ? { unit } : {}),
                        ...(pakaiSupir && supirGabungan.length > 0 ? { supir: supirGabungan } : {}),
                    }
                })(),
                ...(salinDari ? { salin_dari_kontrak: salinDari } : {}),
            })
            toast.push(<Notification type="success" title="Kontrak tersimpan sebagai draft — ajukan approval dari halaman detail" />)
            router.push(ROUTES.KONTRAK_VENDOR_DETAIL(dibuat.id_kontrak_vendor))
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
                    <h3 className="font-bold">Tambah Kontrak Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Buat kontrak baru dengan vendor</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Vendor" asterisk invalid={!!errors.id_vendor} errorMessage={errors.id_vendor}>
                        <Select isSearchable placeholder="Pilih vendor..."
                            options={vendorOptions}
                            value={vendorOptions.find(o => o.value === form.id_vendor) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_vendor: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Mekanisme" asterisk>
                        <Select isSearchable={false} options={MEKANISME_OPTIONS}
                            value={MEKANISME_OPTIONS.find(o => o.value === form.mekanisme) ?? null}
                            onChange={opt => {
                                const mekanisme = opt?.value ?? 'unit_only'
                                setForm(p => ({ ...p, mekanisme }))
                                if (mekanisme === 'unit_only') setSupirRows([])
                            }} />
                    </FormItem>
                    <FormItem label="No. Kontrak" asterisk invalid={!!errors.nomor_kontrak} errorMessage={errors.nomor_kontrak}>
                        <Input placeholder="Nomor kontrak" value={form.nomor_kontrak}
                            onChange={e => setForm(p => ({ ...p, nomor_kontrak: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nilai Kontrak" asterisk invalid={!!errors.nilai_kontrak} errorMessage={errors.nilai_kontrak}>
                        <Input prefix="Rp" placeholder="0"
                            value={form.nilai_kontrak ? formatNum(Number(form.nilai_kontrak)) : ''}
                            onChange={e => setForm(p => ({ ...p, nilai_kontrak: e.target.value.replace(/\D/g, '') }))} />
                    </FormItem>
                    <FormItem label="Rate" asterisk invalid={!!errors.rate} errorMessage={errors.rate}>
                        <Input prefix="Rp" placeholder="0"
                            value={form.rate ? formatNum(Number(form.rate)) : ''}
                            onChange={e => setForm(p => ({ ...p, rate: e.target.value.replace(/\D/g, '') }))} />
                    </FormItem>
                    <FormItem label="Satuan Kontrak" asterisk invalid={!!errors.satuan} errorMessage={errors.satuan}>
                        <Select isSearchable={false} isClearable placeholder="Pilih satuan..."
                            options={SATUAN_OPTIONS}
                            value={SATUAN_OPTIONS.find(o => o.value === form.satuan) ?? null}
                            onChange={opt => setForm(p => ({ ...p, satuan: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Tanggal Mulai" asterisk invalid={!!errors.tanggal_mulai} errorMessage={errors.tanggal_mulai}>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_mulai ? dayjs(form.tanggal_mulai).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Tanggal Selesai" asterisk invalid={!!errors.tanggal_selesai} errorMessage={errors.tanggal_selesai}>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_selesai ? dayjs(form.tanggal_selesai).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Pajak">
                        <Input suffix="%" placeholder="0"
                            value={form.pajak_persen}
                            onChange={e => {
                                const v = e.target.value.replace(/\D/g, '')
                                setForm(p => ({ ...p, pajak_persen: v && Number(v) > 100 ? '100' : v }))
                            }} />
                    </FormItem>
                    <FormItem label="Termin Pembayaran">
                        <Input suffix="hari" placeholder="0"
                            value={form.termin_pembayaran_hari}
                            onChange={e => setForm(p => ({ ...p, termin_pembayaran_hari: e.target.value.replace(/\D/g, '') }))} />
                    </FormItem>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <FormItem label="Salin dari Kontrak Sebelumnya">
                        <p className="text-xs text-gray-400 -mt-1 mb-2">Unit & supir kontrak lama vendor ini yang belum berpindah akan ditautkan ke kontrak baru</p>
                        <Select isSearchable isClearable
                            isDisabled={!form.id_vendor || kontrakLamaOptions.length === 0}
                            placeholder={!form.id_vendor
                                ? 'Pilih vendor dahulu...'
                                : kontrakLamaOptions.length === 0
                                    ? 'Vendor ini belum punya kontrak lain'
                                    : 'Pilih kontrak lama...'}
                            options={kontrakLamaOptions}
                            value={kontrakLamaOptions.find(o => o.value === salinDari) ?? null}
                            onChange={opt => setSalinDari(opt?.value ?? '')} />
                    </FormItem>
                </div>

                <div className="mt-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div>
                            <p className="text-sm font-semibold">{pakaiSupir ? 'Pasangan Unit + Driver' : 'Unit Disewa'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{pakaiSupir ? 'Satu baris = satu paket: unit beserta driver bawaannya dari vendor' : 'Unit baru milik vendor yang langsung terikat ke kontrak ini'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" size="sm" variant="default" icon={<HiOutlineDownload />}
                                loading={downloadingTemplate === 'unit'}
                                onClick={() => unduhTemplate('unit')}>
                                Unduh Template
                            </Button>
                            <Upload accept=".xlsx" showList={false} uploadLimit={1} onChange={uploadExcelUnit}>
                                <Button type="button" size="sm" variant="default" icon={<HiOutlineUpload />}
                                    loading={parsing === 'unit'}>
                                    Upload Excel (Timpa)
                                </Button>
                            </Upload>
                            {unitRows.length > 0 && (
                                <Button type="button" size="sm" variant="default" icon={<HiOutlineTrash />}
                                    className="text-red-500 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
                                    onClick={() => setHapusSemuaTarget('unit')}>
                                    Hapus Semua
                                </Button>
                            )}
                            <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                onClick={() => setUnitRows(prev => [...prev, emptyUnitRow()])}>
                                {pakaiSupir ? 'Tambah Pasangan' : 'Tambah Unit'}
                            </Button>
                        </div>
                    </div>
                    {unitRows.length === 0 ? (
                        <p className="text-sm text-gray-400">{pakaiSupir ? 'Belum ada pasangan unit + driver ditambahkan.' : 'Belum ada unit ditambahkan.'}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                        <th className="py-2 pr-2 w-8">No</th>
                                        <th className="py-2 pr-2">Nopol <span className="text-red-500">*</span></th>
                                        <th className="py-2 pr-2">Merk</th>
                                        {!pakaiSupir && <th className="py-2 pr-2">Jenis</th>}
                                        <th className="py-2 pr-2">Jenis Kendaraan</th>
                                        {!pakaiSupir && <th className="py-2 pr-2">Tahun</th>}
                                        {!pakaiSupir && <th className="py-2 pr-2">Kapasitas / Muatan / Kubikasi</th>}
                                        {pakaiSupir && <th className="py-2 pr-2">Nama Driver</th>}
                                        {pakaiSupir && <th className="py-2 pr-2">Telepon Driver</th>}
                                        {pakaiSupir && <th className="py-2 pr-2">No. SIM</th>}
                                        <th className="py-2 pr-2">Habis Masa Berlaku STNK <span className="text-red-500">*</span></th>
                                        <th className="py-2 pr-2">Habis Masa Berlaku KIR <span className="text-red-500">*</span></th>
                                        <th className="py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unitRows.map((u, i) => (
                                        <tr key={i} className="border-t border-gray-100 dark:border-gray-700 align-top">
                                            <td className="py-2 pr-2 pt-4 text-gray-400">{i + 1}</td>
                                            <td className="py-2 pr-2 min-w-36">
                                                <Input size="sm" placeholder="B 1234 XYZ" value={u.nopol} invalid={!!errors[`unit_${i}_nopol`]}
                                                    onChange={e => ubahUnitRow(i, { nopol: e.target.value })} />
                                                {errors[`unit_${i}_nopol`] && <p className="text-red-500 text-xs mt-1">{errors[`unit_${i}_nopol`]}</p>}
                                            </td>
                                            <td className="py-2 pr-2 min-w-32">
                                                <Input size="sm" placeholder="Hino Dutro" value={u.merk}
                                                    onChange={e => ubahUnitRow(i, { merk: e.target.value })} />
                                            </td>
                                            {!pakaiSupir && (
                                                <td className="py-2 pr-2 min-w-32">
                                                    <Input size="sm" placeholder="Truk Box" value={u.jenis}
                                                        onChange={e => ubahUnitRow(i, { jenis: e.target.value })} />
                                                </td>
                                            )}
                                            <td className="py-2 pr-2 min-w-44">
                                                <Select size="sm" isSearchable isClearable placeholder="Pilih..."
                                                    options={jenisKendaraanOptions}
                                                    value={jenisKendaraanOptions.find(o => o.value === u.id_jenis_kendaraan) ?? null}
                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 60 }) }}
                                                    onChange={opt => ubahUnitRow(i, { id_jenis_kendaraan: (opt as { value: string } | null)?.value ?? '' })} />
                                            </td>
                                            {!pakaiSupir && (
                                                <td className="py-2 pr-2 w-24 min-w-20">
                                                    <Input size="sm" placeholder="2024" value={u.tahun}
                                                        onChange={e => ubahUnitRow(i, { tahun: e.target.value.replace(/\D/g, '') })} />
                                                </td>
                                            )}
                                            {!pakaiSupir && (
                                                <td className="py-2 pr-2 min-w-28">
                                                    <Input size="sm" placeholder="20 ton" value={u.kapasitas}
                                                        onChange={e => ubahUnitRow(i, { kapasitas: e.target.value })} />
                                                </td>
                                            )}
                                            {pakaiSupir && (
                                                <td className="py-2 pr-2 min-w-44">
                                                    <Input size="sm" placeholder="Nama driver bawaan" value={u.driver_nama}
                                                        onChange={e => ubahUnitRow(i, { driver_nama: e.target.value })} />
                                                </td>
                                            )}
                                            {pakaiSupir && (
                                                <td className="py-2 pr-2 min-w-36">
                                                    <Input size="sm" placeholder="08xxxxxxxxxx" value={u.driver_telepon}
                                                        onChange={e => ubahUnitRow(i, { driver_telepon: e.target.value })} />
                                                </td>
                                            )}
                                            {pakaiSupir && (
                                                <td className="py-2 pr-2 min-w-36">
                                                    <Input size="sm" placeholder="Nomor SIM" value={u.driver_no_sim}
                                                        onChange={e => ubahUnitRow(i, { driver_no_sim: e.target.value })} />
                                                </td>
                                            )}
                                            <td className="py-2 pr-2 min-w-36">
                                                <DatePicker size="sm" inputFormat="DD/MM/YYYY"
                                                    value={u.masa_berlaku_stnk ? dayjs(u.masa_berlaku_stnk).toDate() : null}
                                                    onChange={date => ubahUnitRow(i, { masa_berlaku_stnk: date ? dayjs(date).format('YYYY-MM-DD') : '' })} />
                                                {errors[`unit_${i}_stnk`] && <p className="text-red-500 text-xs mt-1">{errors[`unit_${i}_stnk`]}</p>}
                                            </td>
                                            <td className="py-2 pr-2 min-w-36">
                                                <DatePicker size="sm" inputFormat="DD/MM/YYYY"
                                                    value={u.masa_berlaku_kir ? dayjs(u.masa_berlaku_kir).toDate() : null}
                                                    onChange={date => ubahUnitRow(i, { masa_berlaku_kir: date ? dayjs(date).format('YYYY-MM-DD') : '' })} />
                                                {errors[`unit_${i}_kir`] && <p className="text-red-500 text-xs mt-1">{errors[`unit_${i}_kir`]}</p>}
                                            </td>
                                            <td className="py-2 pt-3">
                                                <button type="button"
                                                    onClick={() => setUnitRows(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors">
                                                    <HiOutlineTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {TAMPILKAN_SUPIR_CADANGAN && pakaiSupir && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div>
                                <p className="text-sm font-semibold">Supir Cadangan (Opsional)</p>
                                <p className="text-xs text-gray-400 mt-0.5">Driver vendor tanpa unit bawaan — pengganti/rotasi; driver utama diisi langsung di baris pasangan di atas</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button type="button" size="sm" variant="default" icon={<HiOutlineDownload />}
                                    loading={downloadingTemplate === 'supir'}
                                    onClick={() => unduhTemplate('supir')}>
                                    Unduh Template
                                </Button>
                                <Upload accept=".xlsx" showList={false} uploadLimit={1} onChange={uploadExcelSupir}>
                                    <Button type="button" size="sm" variant="default" icon={<HiOutlineUpload />}
                                        loading={parsing === 'supir'}>
                                        Upload Excel (Timpa)
                                    </Button>
                                </Upload>
                                {supirRows.length > 0 && (
                                    <Button type="button" size="sm" variant="default" icon={<HiOutlineTrash />}
                                        className="text-red-500 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
                                        onClick={() => setHapusSemuaTarget('supir')}>
                                        Hapus Semua
                                    </Button>
                                )}
                                <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                    onClick={() => setSupirRows(prev => [...prev, emptySupirRow()])}>
                                    Tambah Supir
                                </Button>
                            </div>
                        </div>
                        {supirRows.length === 0 ? (
                            <p className="text-sm text-gray-400">Tidak ada supir cadangan — kosongkan bila semua driver sudah dipasangkan di atas.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                            <th className="py-2 pr-2 w-8">No</th>
                                            <th className="py-2 pr-2">Nama <span className="text-red-500">*</span></th>
                                            <th className="py-2 pr-2">Telepon</th>
                                            <th className="py-2 pr-2">No. SIM</th>
                                            <th className="py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supirRows.map((s, i) => (
                                            <tr key={i} className="border-t border-gray-100 dark:border-gray-700 align-top">
                                                <td className="py-2 pr-2 pt-4 text-gray-400">{i + 1}</td>
                                                <td className="py-2 pr-2 min-w-44">
                                                    <Input size="sm" placeholder="Nama supir" value={s.nama} invalid={!!errors[`supir_${i}_nama`]}
                                                        onChange={e => ubahSupirRow(i, { nama: e.target.value })} />
                                                    {errors[`supir_${i}_nama`] && <p className="text-red-500 text-xs mt-1">{errors[`supir_${i}_nama`]}</p>}
                                                </td>
                                                <td className="py-2 pr-2 min-w-36">
                                                    <Input size="sm" placeholder="08xxxxxxxxxx" value={s.telepon}
                                                        onChange={e => ubahSupirRow(i, { telepon: e.target.value })} />
                                                </td>
                                                <td className="py-2 pr-2 min-w-36">
                                                    <Input size="sm" placeholder="Nomor SIM" value={s.no_sim}
                                                        onChange={e => ubahSupirRow(i, { no_sim: e.target.value })} />
                                                </td>
                                                <td className="py-2 pt-3">
                                                    <button type="button"
                                                        onClick={() => setSupirRows(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors">
                                                        <HiOutlineTrash />
                                                    </button>
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

            <Dialog isOpen={!!parseGagal} width={520}
                onRequestClose={() => setParseGagal(null)} onClose={() => setParseGagal(null)}>
                <h5 className="text-base font-semibold mb-4">Baris Gagal — {parseGagal?.judul}</h5>
                <div className="max-h-80 overflow-y-auto flex flex-col gap-2">
                    {parseGagal?.daftar.map((g, idx) => (
                        <p key={idx} className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-semibold">Baris {g.baris}:</span>{' '}
                            <span className="text-red-500">{g.alasan}</span>
                        </p>
                    ))}
                </div>
                <div className="flex justify-end mt-6">
                    <Button variant="solid" onClick={() => setParseGagal(null)}>Tutup</Button>
                </div>
            </Dialog>

            <ConfirmDialog isOpen={!!hapusSemuaTarget} type="danger" title="Hapus Semua"
                onClose={() => setHapusSemuaTarget(null)} onConfirm={handleHapusSemua}>
                <p>
                    Hapus semua {hapusSemuaTarget === 'supir' ? 'supir cadangan' : (pakaiSupir ? 'pasangan unit + driver' : 'unit')} yang sudah ditambahkan di tabel ini?
                </p>
            </ConfirmDialog>
        </div>
    )
}
