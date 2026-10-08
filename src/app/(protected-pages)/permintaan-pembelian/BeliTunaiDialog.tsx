'use client'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Button, Dialog, FormItem, Input, Upload, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { HiOutlinePaperClip, HiOutlineTrash } from 'react-icons/hi'
import LampiranPreview from '@/components/shared/LampiranPreview'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { permintaanPembelianService, type PermintaanPembelian } from '@/services/permintaanPembelian.service'
import { barangService, type Barang } from '@/services/barang.service'
import { supplierService } from '@/services/supplier.service'

type Option = { value: string; label: string }

const rapikanPersen = (nilai: string) => {
    const [bulat, ...pecahan] = nilai.replace(/,/g, '.').replace(/[^0-9.]/g, '').split('.')
    return pecahan.length > 0 ? `${bulat}.${pecahan.join('').slice(0, 2)}` : bulat
}

export default function BeliTunaiDialog({ isOpen, data, namaPenalangAwal, onClose, onSelesai }: {
    isOpen: boolean
    data: PermintaanPembelian
    namaPenalangAwal: string
    onClose: () => void
    onSelesai: (hasil: PermintaanPembelian) => void
}) {
    const [tanggal, setTanggal]       = useState(dayjs().format('YYYY-MM-DD'))
    const [idSupplier, setIdSupplier] = useState('')
    const [namaToko, setNamaToko]     = useState('')
    const [penalang, setPenalang]     = useState(namaPenalangAwal)
    const [qty, setQty]               = useState<Record<string, string>>({})
    const [harga, setHarga]           = useState<Record<string, string>>({})
    const [barang, setBarang]         = useState<Record<string, string>>({})
    const [diskon, setDiskon]         = useState('')
    const [ppnPersen, setPpnPersen]   = useState('')
    const [ongkir, setOngkir]         = useState('')
    const [nota, setNota]             = useState<File[]>([])
    const [menyimpan, setMenyimpan]   = useState(false)
    const [supplierOptions, setSupplierOptions] = useState<Option[]>([])
    const [barangOptions, setBarangOptions]     = useState<Option[]>([])

    useEffect(() => {
        if (!isOpen) return
        const qtyAwal: Record<string, string> = {}
        const hargaAwal: Record<string, string> = {}
        const barangAwal: Record<string, string> = {}
        data.items.forEach(i => {
            qtyAwal[i.id_item] = String(i.qty)
            hargaAwal[i.id_item] = String(i.harga_aktual ?? i.harga_estimasi)
            barangAwal[i.id_item] = i.id_barang ?? ''
        })
        setTanggal(dayjs().format('YYYY-MM-DD'))
        setIdSupplier('')
        setNamaToko('')
        setPenalang(namaPenalangAwal)
        setQty(qtyAwal)
        setHarga(hargaAwal)
        setBarang(barangAwal)
        setDiskon('')
        setPpnPersen('')
        setOngkir('')
        setNota([])
        setMenyimpan(false)
        Promise.all([supplierService.list({ limit: 999 }), barangService.list({ limit: 999 })])
            .then(([sup, brg]) => {
                setSupplierOptions(sup.data.map(s => ({ value: s.id_supplier, label: s.nama })))
                const opsi = brg.data.map((b: Barang) => ({ value: b.id_barang, label: `${b.kode} · ${b.nama}` }))
                data.items.forEach(i => {
                    if (i.id_barang && !opsi.some(o => o.value === i.id_barang)) {
                        opsi.push({ value: i.id_barang, label: `${i.kode_barang ?? ''} · ${i.nama_item}`.replace(/^ · /, '') })
                    }
                })
                setBarangOptions(opsi)
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const qtyItem = (id: string) => Number(qty[id]) || 0
    const hargaItem = (id: string) => Number(harga[id]) || 0
    const subtotal = data.items.reduce((sum, i) => sum + qtyItem(i.id_item) * hargaItem(i.id_item), 0)
    const nilaiDiskon = Number(diskon) || 0
    const persen = Number(ppnPersen) || 0
    const ppn = Math.round((subtotal - nilaiDiskon) * persen / 100)
    const total = subtotal - nilaiDiskon + ppn + (Number(ongkir) || 0)
    const batas = data.batas_beli_tunai ?? null

    const jumlahDibeli = data.items.reduce((sum, i) => sum + qtyItem(i.id_item), 0)
    const itemBermasalah = data.items.find(i =>
        qtyItem(i.id_item) > i.qty
        || (qtyItem(i.id_item) > 0 && harga[i.id_item] === '')
        || (qtyItem(i.id_item) > 0 && i.jenis === 'barang' && !barang[i.id_item]))
    const diskonMelebihi = nilaiDiskon > subtotal
    const ppnMelebihi = persen > 100
    const melebihiBatas = batas !== null && total > batas
    const adaPenjual = !!idSupplier || namaToko.trim() !== ''
    const bisaSimpan = !!tanggal && adaPenjual && penalang.trim() !== '' && nota.length > 0 && jumlahDibeli > 0
        && !itemBermasalah && !diskonMelebihi && !ppnMelebihi && total > 0 && !melebihiBatas

    const simpan = async () => {
        if (!bisaSimpan || menyimpan) return
        setMenyimpan(true)
        try {
            const hasil = await permintaanPembelianService.beliTunai(data.id_permintaan, {
                tanggal_pembelian: tanggal,
                id_supplier: idSupplier || null,
                nama_toko: idSupplier ? null : namaToko.trim(),
                nama_penalang: penalang.trim(),
                items: data.items.map(i => ({
                    id_item: i.id_item,
                    qty_dibeli: qtyItem(i.id_item),
                    harga_aktual: hargaItem(i.id_item),
                    id_barang: i.jenis === 'barang' ? (barang[i.id_item] || null) : null,
                })),
                diskon: nilaiDiskon,
                ppn_persen: persen,
                ongkir: Number(ongkir) || 0,
            }, nota)
            toast.push(<Notification type="success" title="Pembelian tunai dicatat, pengajuan penggantian dibuat" />)
            onSelesai(hasil)
            onClose()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setMenyimpan(false)
        }
    }

    return (
        <Dialog isOpen={isOpen} onRequestClose={onClose} onClose={onClose} width={720}>
            <h5 className="font-bold mb-1">Catat Pembelian Tunai</h5>
            <p className="text-xs text-gray-400 mb-4">
                Untuk barang/jasa yang sudah dibeli tunai dan sudah di tangan. Tanpa PO: barang langsung tercatat diterima dan Keuangan mengganti uang yang menalangi.
                {batas !== null && <> Maksimal {formatRupiah(batas)} — di atas itu terbitkan PO.</>}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                <FormItem label="Tanggal Pembelian" asterisk>
                    <DatePicker inputFormat="DD/MM/YYYY" maxDate={new Date()}
                        value={tanggal ? dayjs(tanggal).toDate() : null}
                        onChange={d => setTanggal(d ? dayjs(d).format('YYYY-MM-DD') : '')} />
                </FormItem>
                <FormItem label="Ditalangi Oleh" asterisk>
                    <Input placeholder="Nama yang membayar lebih dulu" maxLength={150} value={penalang} onChange={e => setPenalang(e.target.value)} />
                </FormItem>
                <FormItem label="Supplier (opsional)">
                    <Select<Option> isSearchable isClearable placeholder="Pilih bila ada di master..."
                        options={supplierOptions}
                        value={supplierOptions.find(o => o.value === idSupplier) ?? null}
                        onChange={opt => setIdSupplier((opt as Option | null)?.value ?? '')} />
                </FormItem>
                <FormItem label="Nama Toko" asterisk={!idSupplier}>
                    <Input placeholder={idSupplier ? 'Mengikuti supplier' : 'Contoh: Toko Sumber Rejeki'} maxLength={150} disabled={!!idSupplier}
                        value={idSupplier ? '' : namaToko} onChange={e => setNamaToko(e.target.value)} />
                </FormItem>
            </div>
            <FormItem label="Nota Pembelian" asterisk>
                <Upload accept=".jpg,.jpeg,.png,.webp,.pdf" multiple showList={false} fileList={nota}
                    beforeUpload={baru => {
                        const daftar = Array.from(baru ?? [])
                        if (nota.length + daftar.length > 10) return 'Maksimal 10 file'
                        const kebesaran = daftar.find(f => f.size > 5 * 1024 * 1024)
                        if (kebesaran) return `File ${kebesaran.name} melebihi 5MB`
                        return true
                    }}
                    onChange={files => setNota(files)}>
                    <Button type="button" variant="default" size="sm" icon={<HiOutlinePaperClip />}>Pilih file nota (maks. 10 × 5MB)</Button>
                </Upload>
                {nota.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        {nota.map((file, idx) => (
                            <div key={`${file.name}-${idx}`} className="relative group">
                                <LampiranPreview file={file} />
                                <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                                <button type="button"
                                    className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 shadow"
                                    onClick={() => setNota(prev => prev.filter((_, i) => i !== idx))}>
                                    <HiOutlineTrash className="text-xs" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </FormItem>
            <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto pr-1">
                {data.items.map(i => {
                    const melebihi = qtyItem(i.id_item) > i.qty
                    const butuhMaster = qtyItem(i.id_item) > 0 && i.jenis === 'barang' && !barang[i.id_item]
                    const hargaKosong = qtyItem(i.id_item) > 0 && (harga[i.id_item] ?? '') === ''
                    return (
                        <div key={i.id_item} className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                            <p className="font-medium text-sm">{i.nama_item} <span className="text-xs text-gray-400">diminta {formatNum(i.qty)} {i.satuan}</span></p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                                <FormItem label="Jumlah Dibeli" className="mb-0" invalid={melebihi} errorMessage={melebihi ? `Maksimal ${formatNum(i.qty)}` : ''}>
                                    <Input suffix={i.satuan} invalid={melebihi} value={qty[i.id_item] ?? ''}
                                        onChange={e => setQty(p => ({ ...p, [i.id_item]: e.target.value.replace(/\D/g, '') }))} />
                                </FormItem>
                                <FormItem label="Harga / satuan" className="mb-0" invalid={hargaKosong} errorMessage={hargaKosong ? 'Harga wajib diisi' : ''}>
                                    <Input prefix="Rp" invalid={hargaKosong} value={harga[i.id_item] ? formatNum(Number(harga[i.id_item])) : ''}
                                        onChange={e => setHarga(p => ({ ...p, [i.id_item]: e.target.value.replace(/\D/g, '') }))} />
                                </FormItem>
                                {i.jenis === 'barang' && (
                                    <FormItem label="Master Barang" className="mb-0 col-span-2 sm:col-span-1" invalid={butuhMaster} errorMessage={butuhMaster ? 'Wajib ditautkan untuk stok' : ''}>
                                        <Select<Option> isSearchable options={barangOptions} value={barangOptions.find(o => o.value === barang[i.id_item]) ?? null}
                                            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                            onChange={opt => setBarang(p => ({ ...p, [i.id_item]: (opt as Option | null)?.value ?? '' }))} />
                                    </FormItem>
                                )}
                            </div>
                        </div>
                    )
                })}
                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                    <p className="text-sm font-semibold mb-3">Ringkasan Biaya</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormItem label="Subtotal" className="mb-0">
                            <p className="h-12 flex items-center text-sm font-semibold tabular-nums">{formatRupiah(subtotal)}</p>
                        </FormItem>
                        <FormItem label="Diskon" className="mb-0">
                            <Input prefix="Rp" placeholder="0" invalid={diskonMelebihi} value={diskon ? formatNum(Number(diskon)) : ''}
                                onChange={e => setDiskon(e.target.value.replace(/\D/g, ''))} />
                            {diskonMelebihi && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Diskon tidak boleh melebihi subtotal ({formatRupiah(subtotal)})</p>}
                        </FormItem>
                        <FormItem label="PPN" className="mb-0">
                            <div className="flex items-center gap-2">
                                <Input className="w-24" suffix="%" placeholder="0" invalid={ppnMelebihi} value={ppnPersen}
                                    onChange={e => setPpnPersen(rapikanPersen(e.target.value))} />
                                <Input className="flex-1" prefix="Rp" placeholder="0" readOnly value={ppnPersen ? formatNum(ppn) : ''} />
                            </div>
                            {ppnMelebihi && <p className="text-xs text-red-500 dark:text-red-400 mt-1">PPN tidak boleh melebihi 100%</p>}
                        </FormItem>
                        <FormItem label="Ongkos Kirim" className="mb-0">
                            <Input prefix="Rp" placeholder="0" value={ongkir ? formatNum(Number(ongkir)) : ''}
                                onChange={e => setOngkir(e.target.value.replace(/\D/g, ''))} />
                        </FormItem>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mt-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total diganti ke penalang</span>
                        <span className="font-bold text-lg tabular-nums">{formatRupiah(total)}</span>
                    </div>
                    {melebihiBatas && batas !== null && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">Melebihi batas pembelian tunai {formatRupiah(batas)} — terbitkan PO untuk pembelian ini.</p>
                    )}
                    {jumlahDibeli === 0 && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Isi jumlah yang dibeli minimal untuk satu item.</p>}
                    {jumlahDibeli > 0 && total <= 0 && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Total pembelian tidak boleh Rp 0.</p>}
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={onClose}>Kembali</Button>
                <Button type="button" variant="solid" loading={menyimpan} disabled={!bisaSimpan} onClick={simpan}>Simpan</Button>
            </div>
        </Dialog>
    )
}
