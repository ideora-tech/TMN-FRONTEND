'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Upload, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { HiArrowLeft, HiOutlinePlus, HiOutlineTrash, HiOutlineDocumentText } from 'react-icons/hi'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { pembelianSparepartService, PembelianSparepart, PembelianPayload } from '@/services/pembelianSparepart.service'
import { supplierService } from '@/services/supplier.service'
import { sparepartService, Sparepart } from '@/services/sparepart.service'

type Option = { value: string; label: string }

type ItemRow = {
    id_sparepart: string
    qty: string
    harga_estimasi: string
}

type Props = {
    mode: 'baru' | 'edit'
    initial?: PembelianSparepart
}

const EMPTY_ROW: ItemRow = { id_sparepart: '', qty: '1', harga_estimasi: '' }

export default function PembelianForm({ mode, initial }: Props) {
    const router = useRouter()
    const [idSupplier, setIdSupplier] = useState(initial?.id_supplier ?? '')
    const [tanggalPengajuan, setTanggalPengajuan] = useState(initial?.tanggal_pengajuan ?? dayjs().format('YYYY-MM-DD'))
    const [keterangan, setKeterangan] = useState(initial?.keterangan ?? '')
    const [lampiran, setLampiran] = useState<File[]>([])
    const [idArmada, setIdArmada] = useState('')
    const [idPerawatan, setIdPerawatan] = useState(initial?.id_perawatan ?? '')
    const [items, setItems] = useState<ItemRow[]>(
        initial?.items.length
            ? initial.items.map(i => ({
                  id_sparepart: i.id_sparepart,
                  qty: String(i.qty),
                  harga_estimasi: String(i.harga_estimasi),
              }))
            : [{ ...EMPTY_ROW }],
    )
    const [supplierOptions, setSupplierOptions] = useState<Option[]>([])
    const [sparepartList, setSparepartList] = useState<Sparepart[]>([])
    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])
    const [perawatanOptions, setPerawatanOptions] = useState<Option[]>([])
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        supplierService.list({ limit: 999, aktif: 1 })
            .then(r => setSupplierOptions(r.data.map(s => ({ value: s.id_supplier, label: s.nama }))))
            .catch(() => {})
        sparepartService.list({ limit: 999 })
            .then(r => setSparepartList(r.data))
            .catch(() => {})
        axios.get(API_ENDPOINTS.ARMADA, { params: { limit: 999 } })
            .then(r => setArmadaOptions((r.data.data as { id_armada: string; nopol: string }[])
                .map(a => ({ value: a.id_armada, label: a.nopol }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!idArmada) { setPerawatanOptions([]); return }
        axios.get(API_ENDPOINTS.ARMADA_PERAWATAN(idArmada), { params: { limit: 999 } })
            .then(r => setPerawatanOptions((r.data.data as { id_perawatan: string; tanggal: string; jenis_perawatan: string }[])
                .map(p => ({ value: p.id_perawatan, label: `${dayjs(p.tanggal).format('DD MMM YYYY')} — ${p.jenis_perawatan}` }))))
            .catch(() => setPerawatanOptions([]))
    }, [idArmada])

    const sparepartOptions: Option[] = sparepartList.map(s => ({
        value: s.id_sparepart,
        label: `${s.kode} — ${s.nama} · stok ${formatNum(s.stok)}${s.satuan ? ` ${s.satuan}` : ''}`,
    }))

    const setRow = (index: number, patch: Partial<ItemRow>) => {
        setItems(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    }

    const pilihSparepart = (index: number, idSparepart: string) => {
        const master = sparepartList.find(s => s.id_sparepart === idSparepart)
        setRow(index, {
            id_sparepart: idSparepart,
            harga_estimasi: master ? String(master.harga_standar) : '',
        })
    }

    const tambahRow = () => setItems(prev => [...prev, { ...EMPTY_ROW }])
    const hapusRow = (index: number) => setItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

    const totalEstimasi = items.reduce((sum, row) => sum + (Number(row.qty) || 0) * (Number(row.harga_estimasi) || 0), 0)

    const validate = () => {
        const e: Record<string, string> = {}
        if (!idSupplier) e.id_supplier = 'Supplier wajib dipilih'
        if (!tanggalPengajuan) e.tanggal_pengajuan = 'Tanggal pengajuan wajib diisi'
        if (items.some(row => !row.id_sparepart || (Number(row.qty) || 0) < 1)) {
            e.items = 'Setiap baris wajib memilih sparepart dengan qty minimal 1'
        }
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            return
        }
        setLoading(true)
        try {
            const payload: PembelianPayload = {
                id_supplier: idSupplier,
                id_perawatan: idPerawatan || null,
                tanggal_pengajuan: tanggalPengajuan,
                keterangan: keterangan.trim() || null,
                items: items.map(row => ({
                    id_sparepart: row.id_sparepart,
                    qty: Number(row.qty),
                    harga_estimasi: Number(row.harga_estimasi) || 0,
                })),
            }
            const hasil = mode === 'edit' && initial
                ? await pembelianSparepartService.update(initial.id_pembelian, payload)
                : await pembelianSparepartService.create(payload)
            if (mode === 'baru' && lampiran.length > 0) {
                try {
                    await pembelianSparepartService.uploadBukti(hasil.id_pembelian, lampiran)
                } catch (err) {
                    toast.push(<Notification type="warning" title={`Pengajuan tersimpan, tapi lampiran gagal diunggah: ${parseApiError(err)}`} />)
                }
            }
            toast.push(<Notification type="success" title={mode === 'edit' ? 'Pengajuan berhasil diperbarui' : 'Pengajuan berhasil dibuat'} />)
            router.push(ROUTES.PEMBELIAN_SPAREPART_DETAIL(hasil.id_pembelian))
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
                    <h3 className="font-bold">
                        {mode === 'edit' ? `Edit Pengajuan ${initial?.nomor_pengajuan ?? ''}` : 'Pengajuan Pembelian Baru'}
                    </h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {mode === 'edit' ? 'Ubah pengajuan pembelian sparepart yang masih diajukan' : 'Ajukan pembelian sparepart untuk disetujui manager dan finance'}
                    </p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Supplier" asterisk invalid={!!errors.id_supplier} errorMessage={errors.id_supplier}>
                            <Select<Option> isSearchable placeholder="Pilih supplier..."
                                options={supplierOptions}
                                value={supplierOptions.find(o => o.value === idSupplier) ?? null}
                                onChange={opt => { setIdSupplier(opt?.value ?? ''); setErrors(p => ({ ...p, id_supplier: '' })) }} />
                        </FormItem>
                        <FormItem label="Tanggal Pengajuan" asterisk invalid={!!errors.tanggal_pengajuan} errorMessage={errors.tanggal_pengajuan}>
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={tanggalPengajuan ? dayjs(tanggalPengajuan).toDate() : null}
                                onChange={date => setTanggalPengajuan(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        </FormItem>
                        <FormItem label="Armada (opsional)"
                            extra={mode === 'edit' && initial?.nopol_armada && !idArmada
                                ? <span className="text-xs text-gray-400">Terkait perawatan armada {initial.nopol_armada}</span>
                                : undefined}>
                            <Select<Option> isSearchable isClearable placeholder="Pilih armada bila terkait perbaikan..."
                                options={armadaOptions}
                                value={armadaOptions.find(o => o.value === idArmada) ?? null}
                                onChange={opt => { setIdArmada(opt?.value ?? ''); if (!opt) setIdPerawatan(initial?.id_perawatan ?? '') }} />
                        </FormItem>
                        <FormItem label="Perawatan Armada (opsional)">
                            <Select<Option> isClearable placeholder={idArmada ? 'Pilih perawatan...' : 'Pilih armada dulu'}
                                isDisabled={!idArmada}
                                options={perawatanOptions}
                                value={perawatanOptions.find(o => o.value === idPerawatan) ?? null}
                                onChange={opt => setIdPerawatan(opt?.value ?? '')} />
                        </FormItem>
                    </div>

                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold">Item Sparepart</p>
                            <Button type="button" size="xs" icon={<HiOutlinePlus />} onClick={tambahRow}>
                                Tambah Item
                            </Button>
                        </div>
                        {errors.items && <p className="text-red-500 text-sm mb-2">{errors.items}</p>}
                        <div className="flex flex-col gap-2">
                            {items.map((row, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-12 sm:col-span-5">
                                        <Select<Option> isSearchable placeholder="Pilih sparepart..."
                                            options={sparepartOptions}
                                            value={sparepartOptions.find(o => o.value === row.id_sparepart) ?? null}
                                            onChange={opt => pilihSparepart(index, opt?.value ?? '')} />
                                    </div>
                                    <div className="col-span-3 sm:col-span-2">
                                        <Input placeholder="Qty" value={row.qty}
                                            onChange={e => setRow(index, { qty: e.target.value.replace(/\D/g, '') })} />
                                    </div>
                                    <div className="col-span-5 sm:col-span-2">
                                        <Input prefix="Rp" placeholder="0"
                                            value={row.harga_estimasi ? formatNum(Number(row.harga_estimasi)) : ''}
                                            onChange={e => setRow(index, { harga_estimasi: e.target.value.replace(/\D/g, '') })} />
                                    </div>
                                    <div className="col-span-3 sm:col-span-2 text-right text-sm font-semibold tabular-nums">
                                        {formatRupiah((Number(row.qty) || 0) * (Number(row.harga_estimasi) || 0))}
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button type="button" onClick={() => hapusRow(index)}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors disabled:opacity-40"
                                            disabled={items.length <= 1}>
                                            <HiOutlineTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mt-3">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Estimasi</span>
                            <span className="font-bold text-lg tabular-nums">{formatRupiah(totalEstimasi)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 mt-3">
                        <FormItem label="Keterangan">
                            <Input textArea rows={3} placeholder="Catatan tambahan (opsional)"
                                value={keterangan} onChange={e => setKeterangan(e.target.value)} />
                        </FormItem>
                    </div>

                    {mode === 'baru' && (
                        <div className="mt-1">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                                Lampiran (opsional) — penawaran supplier, foto kerusakan, dsb.
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
                                <div className="flex flex-col gap-1.5 mt-3">
                                    {lampiran.map((file, idx) => (
                                        <div key={`${file.name}-${idx}`}
                                            className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                                            <span className="text-sm truncate">{file.name}</span>
                                            <span
                                                className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors flex-shrink-0"
                                                onClick={() => setLampiran(prev => prev.filter((_, i) => i !== idx))}
                                            >
                                                <HiOutlineTrash className="text-sm" />
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => router.back()}>Batal</Button>
                        <Button type="submit" variant="solid" loading={loading}>
                            {mode === 'edit' ? 'Simpan Perubahan' : 'Ajukan Pembelian'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
