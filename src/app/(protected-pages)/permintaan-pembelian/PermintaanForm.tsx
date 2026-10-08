'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Upload, Tag, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { HiPlusCircle, HiOutlineTrash, HiOutlineDocumentText } from 'react-icons/hi'
import axios from 'axios'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import type { PermintaanPembelian, PermintaanPayload, ItemPayload, JenisItem, TipePermintaan, PrioritasPermintaan } from '@/services/permintaanPembelian.service'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import { departemenService } from '@/services/departemen.service'
import { barangService, type Barang } from '@/services/barang.service'
import { sparepartService, type Sparepart } from '@/services/sparepart.service'
import { jenisKendaraanService, type JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { judulPermintaanService, type JudulPermintaan } from '@/services/judul-permintaan.service'
import LampiranPreview from '@/components/shared/LampiranPreview'
import { JENIS_LABEL, TIPE_LABEL } from './status'

type Option = { value: string; label: string }

type ItemRow = {
    jenis: JenisItem
    id_barang: string
    id_sparepart: string
    id_jenis_kendaraan: string
    merk: string
    model: string
    tahun: string
    manual: boolean
    nama_item: string
    spesifikasi: string
    qty: string
    satuan: string
    harga_estimasi: string
    keterangan: string
}

type Props = {
    mode: 'baru' | 'edit'
    awal?: PermintaanPembelian
    tipeAwal?: TipePermintaan
    idArmadaAwal?: string
    idPerawatanAwal?: string
    onSubmit: (payload: PermintaanPayload, bukti: File[]) => Promise<void>
}

const TAHUN_INI = String(new Date().getFullYear())

const EMPTY_ROW: ItemRow = { jenis: 'barang', id_barang: '', id_sparepart: '', id_jenis_kendaraan: '', merk: '', model: '', tahun: '', manual: false, nama_item: '', spesifikasi: '', qty: '1', satuan: '', harga_estimasi: '', keterangan: '' }

const barisKosong = (tipe: TipePermintaan): ItemRow => {
    if (tipe === 'sparepart') return { ...EMPTY_ROW, jenis: 'sparepart' }
    if (tipe === 'aset') return { ...EMPTY_ROW, jenis: 'aset', satuan: 'unit', tahun: TAHUN_INI }
    return { ...EMPTY_ROW, jenis: 'barang' }
}

const TIPE_HINT: Record<TipePermintaan, string> = {
    umum:      'Barang/jasa kebutuhan umum; spare part armada diajukan lewat tipe Spare Part',
    sparepart: 'Semua item dipilih dari master Spare Part; di atas batas mandiri, Pengadaan menerbitkan PO lalu mencatat realisasinya',
    aset:      'Pengadaan unit armada baru; pembayaran bertahap (termin) dan tiap unit didaftarkan ke master Armada saat diterima',
}

const ITEM_HINT: Record<TipePermintaan, string> = {
    umum:      'Barang bisa dipilih dari Master Barang atau diketik manual; jasa diketik langsung',
    sparepart: 'Pilih spare part dari master; satuan mengikuti master, harga estimasi bisa disesuaikan',
    aset:      'Pilih jenis kendaraan lalu isi merk, model, tahun; qty adalah jumlah unit dengan harga estimasi per unit',
}

const LABEL_ITEM = 'text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

const JENIS_OPTIONS: Option[] = (['barang', 'jasa'] as JenisItem[]).map(j => ({ value: j, label: JENIS_LABEL[j] }))

export default function PermintaanForm({ mode, awal, tipeAwal, idArmadaAwal, idPerawatanAwal, onSubmit }: Props) {
    const router = useRouter()
    const { session } = useCurrentSession()
    const [tipe, setTipe] = useState<TipePermintaan>(awal?.tipe ?? tipeAwal ?? 'umum')
    const [judul, setJudul] = useState(awal?.judul ?? '')
    const [prioritas, setPrioritas] = useState<PrioritasPermintaan>(awal?.prioritas ?? 'normal')
    const [idKategori, setIdKategori] = useState(awal?.id_judul_permintaan ?? '')
    const [kategoriList, setKategoriList] = useState<JudulPermintaan[]>([])
    const [kategoriLoading, setKategoriLoading] = useState(true)
    const [alasan, setAlasan] = useState(awal?.alasan ?? '')
    const [idDepartemen, setIdDepartemen] = useState(awal?.id_departemen ?? '')
    const [idArmada, setIdArmada] = useState(idArmadaAwal ?? '')
    const [idPerawatan, setIdPerawatan] = useState(awal?.id_perawatan ?? idPerawatanAwal ?? '')
    const [tanggalPermintaan, setTanggalPermintaan] = useState(awal?.tanggal_permintaan ?? dayjs().format('YYYY-MM-DD'))
    const [tanggalDibutuhkan, setTanggalDibutuhkan] = useState(awal?.tanggal_dibutuhkan ?? '')
    const [items, setItems] = useState<ItemRow[]>(
        awal?.items.length
            ? awal.items.map(i => ({
                  jenis: i.jenis,
                  id_barang: i.id_barang ?? '',
                  id_sparepart: i.id_sparepart ?? '',
                  id_jenis_kendaraan: i.id_jenis_kendaraan ?? '',
                  merk: i.merk ?? '',
                  model: i.model ?? '',
                  tahun: i.tahun !== null && i.tahun !== undefined ? String(i.tahun) : (i.jenis === 'aset' ? TAHUN_INI : ''),
                  manual: i.jenis === 'barang' && !i.id_barang,
                  nama_item: i.nama_item,
                  spesifikasi: i.spesifikasi ?? '',
                  qty: String(i.qty),
                  satuan: i.satuan,
                  harga_estimasi: String(i.harga_estimasi),
                  keterangan: i.keterangan ?? '',
              }))
            : [barisKosong(awal?.tipe ?? tipeAwal ?? 'umum')],
    )
    const [lampiran, setLampiran] = useState<File[]>([])
    const [departemenOptions, setDepartemenOptions] = useState<Option[]>([])
    const [barangList, setBarangList] = useState<Barang[]>([])
    const [sparepartList, setSparepartList] = useState<Sparepart[]>([])
    const [jenisKendaraanList, setJenisKendaraanList] = useState<JenisKendaraan[]>([])
    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])
    const [perawatanOptions, setPerawatanOptions] = useState<Option[]>([])
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        judulPermintaanService.opsiAktif()
            .then(setKategoriList)
            .catch(() => {})
            .finally(() => setKategoriLoading(false))
    }, [])

    useEffect(() => {
        departemenService.list(1, 999, undefined, '1')
            .then(r => setDepartemenOptions(r.data.map(d => ({ value: d.id_departemen, label: d.nama_departemen }))))
            .catch(() => toast.push(<Notification type="danger" title="Daftar departemen gagal dimuat — muat ulang halaman untuk mencoba lagi" />))
        barangService.list({ limit: 999 })
            .then(r => setBarangList(r.data))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (tipe !== 'sparepart' || sparepartList.length) return
        sparepartService.list({ limit: 999 })
            .then(r => setSparepartList(r.data))
            .catch(() => {})
    }, [tipe, sparepartList.length])

    useEffect(() => {
        if (tipe !== 'aset' || jenisKendaraanList.length) return
        jenisKendaraanService.list(1, 100, undefined, '1')
            .then(r => setJenisKendaraanList(r.data.filter(j => j.aktif)))
            .catch(() => {})
    }, [tipe, jenisKendaraanList.length])

    useEffect(() => {
        if (tipe !== 'sparepart' || armadaOptions.length) return
        axios.get(API_ENDPOINTS.ARMADA, { params: { limit: 999 } })
            .then(r => setArmadaOptions((r.data.data as { id_armada: string; nopol: string }[])
                .map(a => ({ value: a.id_armada, label: a.nopol }))))
            .catch(() => {})
    }, [tipe, armadaOptions.length])

    useEffect(() => {
        if (!idArmada) { setPerawatanOptions([]); return }
        axios.get(API_ENDPOINTS.ARMADA_PERAWATAN(idArmada), { params: { limit: 999 } })
            .then(r => setPerawatanOptions((r.data.data as { id_perawatan: string; tanggal: string; interval_label?: string | null }[])
                .map(p => ({ value: p.id_perawatan, label: `${dayjs(p.tanggal).format('DD MMM YYYY')} — ${p.interval_label ?? 'Perbaikan'}` }))))
            .catch(() => setPerawatanOptions([]))
    }, [idArmada])

    const perawatanAwalOption: Option | null = awal?.id_perawatan && awal.id_perawatan === idPerawatan && !perawatanOptions.some(o => o.value === idPerawatan)
        ? { value: awal.id_perawatan, label: `${awal.nopol_perawatan ?? '—'} · ${awal.tanggal_perawatan ? dayjs(awal.tanggal_perawatan).format('DD MMM YYYY') : '—'}` }
        : null
    const perawatanOptionsTampil = perawatanAwalOption ? [perawatanAwalOption, ...perawatanOptions] : perawatanOptions

    const jenisKendaraanOptions: Option[] = jenisKendaraanList.map(j => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))

    const barangOptions: Option[] = barangList.map(b => ({
        value: b.id_barang,
        label: `${b.kode} — ${b.nama} · stok ${formatNum(b.stok)}${b.satuan ? ` ${b.satuan}` : ''}`,
    }))

    const sparepartOptions: Option[] = sparepartList.map(s => ({
        value: s.id_sparepart,
        label: `${s.kode} — ${s.nama} · stok ${formatNum(s.stok)}${s.satuan ? ` ${s.satuan}` : ''}`,
    }))

    const setRow = (index: number, patch: Partial<ItemRow>) => {
        setItems(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
        setErrors(p => ({ ...p, [`item_${index}`]: '' }))
    }

    const kategoriTersedia = (!awal && tipeAwal && tipeAwal !== 'umum')
        ? kategoriList.filter(k => k.tipe === tipeAwal)
        : kategoriList
    const kategoriOptions: Option[] = kategoriTersedia.map(k => ({ value: k.id_judul_permintaan, label: k.nama_judul }))
    const kategoriTerpilih = kategoriList.find(k => k.id_judul_permintaan === idKategori)
        ?? (awal && !idKategori ? kategoriList.find(k => k.tipe === awal.tipe && k.nama_judul.toLowerCase() === awal.judul.toLowerCase()) : undefined)
    const kategoriLama = !kategoriTerpilih && awal && !kategoriLoading ? (awal.nama_kategori ?? null) : null
    const namaPemohon = awal ? (awal.username_pengaju ?? '—') : (session?.user?.name ?? session?.user?.userName ?? '—')

    useEffect(() => {
        if (kategoriLoading || idKategori) return
        if (awal) {
            const cocok = kategoriList.find(k => k.tipe === awal.tipe && k.nama_judul.toLowerCase() === awal.judul.toLowerCase())
            if (cocok) setIdKategori(cocok.id_judul_permintaan)
            return
        }
        if (tipeAwal && tipeAwal !== 'umum') {
            const kandidat = kategoriList.filter(k => k.tipe === tipeAwal)
            if (kandidat.length === 1) pilihKategori(kandidat[0].id_judul_permintaan)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kategoriLoading, kategoriList])

    const pilihKategori = (id: string) => {
        setIdKategori(id)
        setErrors(p => ({ ...p, kategori: '' }))
        const master = kategoriList.find(k => k.id_judul_permintaan === id)
        if (master && master.tipe !== tipe) gantiTipe(master.tipe)
    }

    const gantiTipe = (baru: TipePermintaan) => {
        if (!baru || baru === tipe) return
        setTipe(baru)
        setItems([barisKosong(baru)])
        if (baru !== 'sparepart') { setIdArmada(''); setIdPerawatan('') }
        setErrors(p => Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith('item_'))))
    }

    const pilihSparepart = (index: number, idSparepart: string) => {
        const master = sparepartList.find(s => s.id_sparepart === idSparepart)
        setRow(index, master
            ? { id_sparepart: idSparepart, nama_item: master.nama, satuan: master.satuan, harga_estimasi: String(master.harga_standar) }
            : { id_sparepart: '', nama_item: '', satuan: '' })
    }

    const gantiJenis = (index: number, jenis: JenisItem) => {
        setRow(index, jenis === 'jasa'
            ? { jenis, id_barang: '', manual: false }
            : { jenis, id_barang: '', manual: false, nama_item: '' })
    }

    const pilihBarang = (index: number, idBarang: string) => {
        const master = barangList.find(b => b.id_barang === idBarang)
        setRow(index, master
            ? { id_barang: idBarang, nama_item: master.nama, satuan: master.satuan, harga_estimasi: String(master.harga_standar) }
            : { id_barang: '', nama_item: '' })
    }

    const toggleManual = (index: number) => {
        const row = items[index]
        setRow(index, row.manual
            ? { manual: false, id_barang: '', nama_item: '' }
            : { manual: true, id_barang: '' })
    }

    const tambahRow = () => setItems(prev => [...prev, barisKosong(tipe)])
    const hapusRow = (index: number) => {
        setItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
        setErrors(p => Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith('item_'))))
    }

    const subtotal = (row: ItemRow) => (Number(row.qty) || 0) * (Number(row.harga_estimasi) || 0)
    const totalEstimasi = items.reduce((sum, row) => sum + subtotal(row), 0)

    const validate = () => {
        const e: Record<string, string> = {}
        if (!judul.trim()) e.judul = 'Judul permintaan wajib diisi'
        else if (judul.trim().length > 150) e.judul = 'Judul permintaan maksimal 150 karakter'
        if (!kategoriTerpilih && !awal) e.kategori = 'Kategori wajib dipilih'
        if (!idDepartemen && departemenOptions.length > 0) e.id_departemen = 'Departemen wajib dipilih'
        if (!alasan.trim()) e.alasan = 'Alasan kebutuhan wajib diisi'
        if (!tanggalPermintaan) e.tanggal_permintaan = 'Tanggal permintaan wajib diisi'
        if (tanggalDibutuhkan && tanggalPermintaan && dayjs(tanggalDibutuhkan).isBefore(dayjs(tanggalPermintaan), 'day')) {
            e.tanggal_dibutuhkan = 'Tanggal dibutuhkan tidak boleh sebelum tanggal permintaan'
        }
        items.forEach((row, index) => {
            const masalah: string[] = []
            if (row.jenis === 'sparepart') {
                if (!row.id_sparepart) masalah.push('pilih spare part dari master')
            } else if (row.jenis === 'aset') {
                if (!row.id_jenis_kendaraan) masalah.push('pilih jenis kendaraan')
                if (!row.merk.trim()) masalah.push('merk wajib diisi')
                const tahun = Number(row.tahun)
                if (!row.tahun || !Number.isInteger(tahun) || tahun < 1990 || tahun > 2100) masalah.push('tahun wajib diisi (1990–2100)')
            } else if (!row.nama_item.trim()) {
                masalah.push(row.jenis === 'barang' && !row.manual ? 'pilih barang dari master' : 'nama item wajib diisi')
            }
            if ((Number(row.qty) || 0) < 1) masalah.push(row.jenis === 'aset' ? 'jumlah unit minimal 1' : 'qty minimal 1')
            if (row.jenis !== 'sparepart' && row.jenis !== 'aset' && !row.satuan.trim()) masalah.push('satuan wajib diisi')
            if (row.harga_estimasi === '' || Number(row.harga_estimasi) < 0) masalah.push('harga estimasi wajib diisi (boleh 0)')
            if (masalah.length) e[`item_${index}`] = `Baris ${index + 1}: ${masalah.join(', ')}`
        })
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            return
        }
        const idKategoriKirim = kategoriTerpilih?.id_judul_permintaan ?? idKategori
        const payload: PermintaanPayload = {
            ...(idKategoriKirim ? { id_judul_permintaan: idKategoriKirim } : { tipe }),
            judul: judul.trim(),
            prioritas,
            alasan: alasan.trim(),
            id_departemen: idDepartemen || null,
            ...(tipe === 'sparepart' ? { id_perawatan: idPerawatan || null } : {}),
            tanggal_permintaan: tanggalPermintaan,
            tanggal_dibutuhkan: tanggalDibutuhkan || null,
            items: items.map<ItemPayload>(row => {
                if (row.jenis === 'sparepart') {
                    const master = sparepartList.find(s => s.id_sparepart === row.id_sparepart)
                    return {
                        jenis: 'sparepart',
                        id_sparepart: row.id_sparepart,
                        nama_item: master?.nama ?? row.nama_item.trim(),
                        spesifikasi: row.spesifikasi.trim() || null,
                        qty: Number(row.qty),
                        satuan: master?.satuan ?? row.satuan.trim(),
                        harga_estimasi: Number(row.harga_estimasi) || 0,
                        keterangan: row.keterangan.trim() || null,
                    }
                }
                if (row.jenis === 'aset') {
                    const merk = row.merk.trim()
                    const model = row.model.trim()
                    return {
                        jenis: 'aset',
                        id_jenis_kendaraan: row.id_jenis_kendaraan,
                        merk,
                        model: model || null,
                        tahun: Number(row.tahun),
                        nama_item: `${merk} ${model} ${row.tahun}`.replace(/\s+/g, ' ').trim(),
                        spesifikasi: row.spesifikasi.trim() || null,
                        qty: Number(row.qty),
                        satuan: 'unit',
                        harga_estimasi: Number(row.harga_estimasi) || 0,
                        keterangan: row.keterangan.trim() || null,
                    }
                }
                return {
                    jenis: row.jenis,
                    id_barang: row.jenis === 'barang' && !row.manual && row.id_barang ? row.id_barang : null,
                    nama_item: row.nama_item.trim(),
                    spesifikasi: row.spesifikasi.trim() || null,
                    qty: Number(row.qty),
                    satuan: row.satuan.trim(),
                    harga_estimasi: Number(row.harga_estimasi) || 0,
                    keterangan: row.keterangan.trim() || null,
                }
            }),
        }
        setLoading(true)
        try {
            await onSubmit(payload, lampiran)
        } catch {
            setLoading(false)
            return
        }
        setLoading(false)
    }

    const itemErrors = Object.entries(errors).filter(([k, v]) => k.startsWith('item_') && v).map(([, v]) => v)

    return (
        <Card>
            <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                    <FormItem label="Tanggal Permintaan" asterisk invalid={!!errors.tanggal_permintaan} errorMessage={errors.tanggal_permintaan}>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={tanggalPermintaan ? dayjs(tanggalPermintaan).toDate() : null}
                            onChange={date => { setTanggalPermintaan(date ? dayjs(date).format('YYYY-MM-DD') : ''); setErrors(p => ({ ...p, tanggal_permintaan: '', tanggal_dibutuhkan: '' })) }} />
                    </FormItem>
                    <FormItem label="Pemohon">
                        <Input value={namaPemohon} readOnly disabled />
                    </FormItem>
                    <FormItem label="Departemen" asterisk={departemenOptions.length > 0} invalid={!!errors.id_departemen} errorMessage={errors.id_departemen}>
                        <Select<Option> isSearchable placeholder="Pilih departemen pemohon..."
                            noOptionsMessage={() => 'Belum ada departemen aktif — minta admin menambahkannya di Data Master'}
                            options={departemenOptions}
                            value={departemenOptions.find(o => o.value === idDepartemen) ?? null}
                            onChange={opt => { setIdDepartemen(opt?.value ?? ''); setErrors(p => ({ ...p, id_departemen: '' })) }} />
                    </FormItem>
                    <FormItem label="Judul Permintaan" asterisk invalid={!!errors.judul} errorMessage={errors.judul} className="sm:col-span-2 lg:col-span-3">
                        <Input placeholder="Contoh: Pengadaan ATK untuk kebutuhan Finance" maxLength={150} invalid={!!errors.judul}
                            value={judul} onChange={e => { setJudul(e.target.value); setErrors(p => ({ ...p, judul: '' })) }} />
                    </FormItem>
                    <FormItem label="Prioritas">
                        <div className="flex items-center gap-2 h-11">
                            <Button type="button" size="sm" variant={prioritas === 'normal' ? 'solid' : 'default'} onClick={() => setPrioritas('normal')}>
                                Normal
                            </Button>
                            <Button type="button" size="sm" variant={prioritas === 'urgent' ? 'solid' : 'default'}
                                customColorClass={() => (prioritas === 'urgent' ? 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' : '')}
                                onClick={() => setPrioritas('urgent')}>
                                Urgent
                            </Button>
                        </div>
                    </FormItem>
                    <FormItem label="Tanggal Dibutuhkan" invalid={!!errors.tanggal_dibutuhkan} errorMessage={errors.tanggal_dibutuhkan}>
                        <DatePicker inputFormat="DD/MM/YYYY" placeholder="Opsional"
                            value={tanggalDibutuhkan ? dayjs(tanggalDibutuhkan).toDate() : null}
                            onChange={date => { setTanggalDibutuhkan(date ? dayjs(date).format('YYYY-MM-DD') : ''); setErrors(p => ({ ...p, tanggal_dibutuhkan: '' })) }} />
                    </FormItem>
                    <FormItem label="Alasan Kebutuhan" asterisk invalid={!!errors.alasan} errorMessage={errors.alasan} className="sm:col-span-2 lg:col-span-3">
                        <Input textArea rows={3} placeholder="Jelaskan kebutuhan dan tujuan pembelian"
                            value={alasan} onChange={e => { setAlasan(e.target.value); setErrors(p => ({ ...p, alasan: '' })) }} />
                    </FormItem>
                    <FormItem label="Kategori" asterisk={!awal} invalid={!!errors.kategori} errorMessage={errors.kategori} className="sm:col-span-2 lg:col-span-3"
                        extra={kategoriTerpilih || kategoriLama ? (
                            <Tag className="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 border-0">Tipe: {kategoriTerpilih?.nama_tipe ?? TIPE_LABEL[tipe]}</Tag>
                        ) : undefined}>
                        <Select<Option> isSearchable isClearable={false} isLoading={kategoriLoading}
                            placeholder={kategoriLoading ? 'Memuat kategori...' : 'Pilih kategori sesuai jenis kebutuhan...'}
                            noOptionsMessage={() => 'Belum ada kategori — minta admin menambahkannya di Data Master'}
                            options={kategoriOptions}
                            value={kategoriTerpilih
                                ? { value: kategoriTerpilih.id_judul_permintaan, label: kategoriTerpilih.nama_judul }
                                : kategoriLama ? { value: '', label: `${kategoriLama} (tidak aktif)` } : null}
                            onChange={opt => opt && opt.value && pilihKategori(opt.value)} />
                        {(kategoriTerpilih || awal) && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{TIPE_HINT[tipe]}</p>
                        )}
                    </FormItem>
                </div>

                <div className="mt-4">
                    {tipe === 'sparepart' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Armada (opsional)"
                                extra={mode === 'edit' && awal?.nopol_perawatan && !idArmada
                                    ? <span className="text-xs text-gray-400">Terkait perawatan armada {awal.nopol_perawatan}</span>
                                    : undefined}>
                                <Select<Option> isSearchable isClearable placeholder="Pilih armada bila terkait perbaikan..."
                                    options={armadaOptions}
                                    value={armadaOptions.find(o => o.value === idArmada) ?? null}
                                    onChange={opt => { setIdArmada(opt?.value ?? ''); setIdPerawatan('') }} />
                            </FormItem>
                            <FormItem label="Perawatan terkait (opsional)">
                                <Select<Option> isClearable placeholder={idArmada ? 'Pilih perawatan...' : 'Pilih armada dulu'}
                                    isDisabled={!idArmada && !idPerawatan}
                                    options={perawatanOptionsTampil}
                                    value={perawatanOptionsTampil.find(o => o.value === idPerawatan) ?? null}
                                    onChange={opt => setIdPerawatan(opt?.value ?? '')} />
                            </FormItem>
                        </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="font-semibold">{tipe === 'aset' ? 'Unit yang Diajukan' : 'Item Permintaan'}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{ITEM_HINT[tipe]}</p>
                        </div>
                        <Button type="button" size="xs" variant="solid" icon={<HiPlusCircle />} onClick={tambahRow}>
                            {tipe === 'aset' ? 'Tambah Unit' : 'Tambah Item'}
                        </Button>
                    </div>
                    {itemErrors.length > 0 && (
                        <div className="mb-2 flex flex-col gap-0.5">
                            {itemErrors.map((msg, i) => <p key={i} className="text-red-500 text-sm">{msg}</p>)}
                        </div>
                    )}
                    {tipe === 'aset' ? (
                    <div className="flex flex-col gap-3">
                        {items.map((row, index) => {
                            const invalid = !!errors[`item_${index}`]
                            return (
                                <div key={index}
                                    className={`rounded-lg border p-3 ${invalid ? 'border-red-300 dark:border-red-500/60' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Unit {index + 1}</p>
                                    <div className="grid grid-cols-12 gap-2 items-start">
                                        <div className="col-span-12 sm:col-span-4">
                                            <Select<Option> isSearchable isClearable placeholder="Pilih jenis kendaraan..."
                                                options={jenisKendaraanOptions}
                                                value={jenisKendaraanOptions.find(o => o.value === row.id_jenis_kendaraan) ?? null}
                                                onChange={opt => setRow(index, { id_jenis_kendaraan: opt?.value ?? '' })} />
                                        </div>
                                        <div className="col-span-12 sm:col-span-3">
                                            <Input placeholder="Merk, contoh: Hino" value={row.merk}
                                                onChange={e => setRow(index, { merk: e.target.value })} />
                                        </div>
                                        <div className="col-span-8 sm:col-span-3">
                                            <Input placeholder="Model (opsional), contoh: Dutro" value={row.model}
                                                onChange={e => setRow(index, { model: e.target.value })} />
                                        </div>
                                        <div className="col-span-4 sm:col-span-2">
                                            <Input type="number" placeholder="Tahun" min={1990} max={2100} value={row.tahun}
                                                onChange={e => setRow(index, { tahun: e.target.value })} />
                                        </div>
                                        <div className="col-span-12">
                                            <Input placeholder="Spesifikasi (opsional): varian, kapasitas, warna, kelengkapan"
                                                value={row.spesifikasi}
                                                onChange={e => setRow(index, { spesifikasi: e.target.value })} />
                                        </div>
                                        <div className="col-span-4 sm:col-span-2">
                                            <Input placeholder="Jumlah unit" value={row.qty}
                                                onChange={e => setRow(index, { qty: e.target.value.replace(/\D/g, '') })} />
                                        </div>
                                        <div className="col-span-4 sm:col-span-2">
                                            <Input placeholder="Satuan" value="unit" readOnly disabled />
                                        </div>
                                        <div className="col-span-4 sm:col-span-3">
                                            <Input prefix="Rp" placeholder="Harga / unit"
                                                value={row.harga_estimasi ? formatNum(Number(row.harga_estimasi)) : ''}
                                                onChange={e => setRow(index, { harga_estimasi: e.target.value.replace(/\D/g, '') })} />
                                        </div>
                                        <div className="col-span-9 sm:col-span-4 flex items-center justify-end h-11 text-sm font-semibold tabular-nums">
                                            {formatRupiah(subtotal(row))}
                                        </div>
                                        <div className="col-span-3 sm:col-span-1 flex items-center justify-end h-11">
                                            <button type="button" onClick={() => hapusRow(index)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors disabled:opacity-40"
                                                disabled={items.length <= 1}>
                                                <HiOutlineTrash />
                                            </button>
                                        </div>
                                        <div className="col-span-12">
                                            <Input placeholder="Catatan (opsional)" maxLength={255} value={row.keterangan}
                                                onChange={e => setRow(index, { keterangan: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    ) : (
                    <div className="flex flex-col gap-3">
                        {items.map((row, index) => (
                            <div key={index}
                                className={`rounded-lg border p-3 ${errors[`item_${index}`] ? 'border-red-300 dark:border-red-500/60' : 'border-gray-200 dark:border-gray-700'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Item {index + 1}</p>
                                    <button type="button" onClick={() => hapusRow(index)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors disabled:opacity-40"
                                        disabled={items.length <= 1}>
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                                <div className="grid grid-cols-12 gap-x-3 gap-y-2 items-start">
                                    {tipe === 'umum' && (
                                        <div className="col-span-12 sm:col-span-4 xl:col-span-2">
                                            <p className={LABEL_ITEM}>Jenis</p>
                                            <Select<Option> placeholder="Jenis"
                                                options={JENIS_OPTIONS}
                                                value={JENIS_OPTIONS.find(o => o.value === row.jenis) ?? null}
                                                onChange={opt => gantiJenis(index, (opt?.value as JenisItem) ?? 'barang')} />
                                        </div>
                                    )}
                                    <div className={tipe === 'umum' ? 'col-span-12 sm:col-span-8 xl:col-span-5' : 'col-span-12 xl:col-span-7'}>
                                        <p className={LABEL_ITEM}>Item Permintaan</p>
                                        {row.jenis === 'sparepart' ? (
                                            <Select<Option> isSearchable isClearable placeholder="Pilih spare part dari master..."
                                                options={sparepartOptions}
                                                value={sparepartOptions.find(o => o.value === row.id_sparepart) ?? null}
                                                onChange={opt => pilihSparepart(index, opt?.value ?? '')} />
                                        ) : row.jenis === 'barang' && !row.manual ? (
                                            <Select<Option> isSearchable isClearable placeholder="Pilih barang dari master..."
                                                options={barangOptions}
                                                value={barangOptions.find(o => o.value === row.id_barang) ?? null}
                                                onChange={opt => pilihBarang(index, opt?.value ?? '')} />
                                        ) : (
                                            <Input placeholder={row.jenis === 'jasa' ? 'Nama jasa, contoh: Servis AC ruang meeting' : 'Nama barang (belum ada di master)'}
                                                value={row.nama_item}
                                                onChange={e => setRow(index, { nama_item: e.target.value })} />
                                        )}
                                        {row.jenis === 'barang' && (
                                            <button type="button" onClick={() => toggleManual(index)}
                                                className="mt-1 text-xs text-primary hover:underline">
                                                {row.manual ? 'Pilih dari Master Barang' : 'Barang belum ada di master? Ketik manual'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="col-span-12 xl:col-span-5">
                                        <p className={LABEL_ITEM}>Spesifikasi</p>
                                        <Input placeholder={row.jenis === 'sparepart' ? 'Opsional: merek, tipe' : 'Opsional: merek, ukuran, warna'}
                                            value={row.spesifikasi}
                                            onChange={e => setRow(index, { spesifikasi: e.target.value })} />
                                    </div>
                                    <div className="col-span-6 sm:col-span-3 xl:col-span-2">
                                        <p className={LABEL_ITEM}>Satuan (UOM)</p>
                                        {row.jenis === 'sparepart' ? (
                                            <Input placeholder="Satuan" value={row.satuan} readOnly disabled />
                                        ) : (
                                            <Input placeholder="Contoh: pack" value={row.satuan}
                                                onChange={e => setRow(index, { satuan: e.target.value })} />
                                        )}
                                    </div>
                                    <div className="col-span-6 sm:col-span-3 xl:col-span-2">
                                        <p className={LABEL_ITEM}>Qty</p>
                                        <Input placeholder="Qty" value={row.qty}
                                            onChange={e => setRow(index, { qty: e.target.value.replace(/\D/g, '') })} />
                                    </div>
                                    <div className="col-span-6 sm:col-span-3 xl:col-span-3">
                                        <p className={LABEL_ITEM}>Estimasi Harga Satuan</p>
                                        <Input prefix="Rp" placeholder="0"
                                            value={row.harga_estimasi ? formatNum(Number(row.harga_estimasi)) : ''}
                                            onChange={e => setRow(index, { harga_estimasi: e.target.value.replace(/\D/g, '') })} />
                                    </div>
                                    <div className="col-span-6 sm:col-span-3 xl:col-span-2">
                                        <p className={LABEL_ITEM}>Estimasi Total</p>
                                        <div className="flex items-center h-11 font-semibold tabular-nums whitespace-nowrap">{formatRupiah(subtotal(row))}</div>
                                    </div>
                                    <div className="col-span-12 xl:col-span-3">
                                        <p className={LABEL_ITEM}>Catatan</p>
                                        <Input placeholder="Opsional" maxLength={255} value={row.keterangan}
                                            onChange={e => setRow(index, { keterangan: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    )}
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mt-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Estimasi</span>
                        <span className="font-bold text-lg tabular-nums">{formatRupiah(totalEstimasi)}</span>
                    </div>
                </div>

                {mode === 'baru' && (
                    <div className="mt-4">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                            Lampiran (opsional) — penawaran, referensi harga, foto kebutuhan
                        </p>
                        <Upload
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            multiple
                            showList={false}
                            fileList={lampiran}
                            beforeUpload={(baru) => {
                                const daftar = Array.from(baru ?? [])
                                if (lampiran.length + daftar.length > 10) return 'Maksimal 10 file lampiran'
                                const kebesaran = daftar.find(f => f.size > 5 * 1024 * 1024)
                                if (kebesaran) return `File ${kebesaran.name} melebihi 5MB`
                                return true
                            }}
                            onChange={files => setLampiran(files)}
                        >
                            <Button type="button" variant="default" size="sm" icon={<HiOutlineDocumentText />}>
                                Pilih file (bisa lebih dari satu, maks. 10 file × 5MB)
                            </Button>
                        </Upload>
                        {lampiran.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                {lampiran.map((file, idx) => (
                                    <div key={`${file.name}-${idx}`} className="relative group">
                                        <LampiranPreview file={file} />
                                        <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                                        <button
                                            type="button"
                                            className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 shadow"
                                            onClick={() => setLampiran(prev => prev.filter((_, i) => i !== idx))}
                                        >
                                            <HiOutlineTrash className="text-xs" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => router.push(ROUTES.PERMINTAAN_PEMBELIAN)}>Kembali</Button>
                    <Button type="submit" variant="solid" loading={loading}>
                        {mode === 'edit' ? 'Simpan Perubahan' : 'Ajukan Permintaan'}
                    </Button>
                </div>
            </form>
        </Card>
    )
}
