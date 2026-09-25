'use client'
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, FormItem, Input, Tag, Tooltip, Switcher, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineClipboardList, HiOutlineMinusCircle, HiOutlineAdjustments } from 'react-icons/hi'
import { PiCubeDuotone, PiWarningCircleDuotone } from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { barangService, type Barang, type KategoriBarang, type BarangPayload } from '@/services/barang.service'
import MutasiBarangDrawer from './MutasiBarangDrawer'

type Option = { value: string; label: string }
const SATUAN_OPTIONS: Option[] = ['pcs', 'box', 'rim', 'pak', 'lusin', 'set', 'unit', 'liter', 'kg', 'meter'].map(s => ({ value: s, label: s }))
const FORM_KOSONG = { nama: '', id_kategori_barang: '', satuan: 'pcs', harga_standar: '', stok_minimum: '0', aktif: true }

const KARTU_RINGKASAN = [
    { key: 'total' as const,   label: 'Total Barang', icon: <PiCubeDuotone className="text-3xl text-blue-500" />,         bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-400' },
    { key: 'menipis' as const, label: 'Stok Menipis', icon: <PiWarningCircleDuotone className="text-3xl text-red-500" />, bg: 'bg-red-50 dark:bg-red-500/10',   text: 'text-red-600 dark:text-red-400',   ring: 'ring-red-400' },
]

export default function DaftarBarangTab() {
    const [list, setList] = useState<Barang[]>([])
    const [loading, setLoading] = useState(false)
    const [kategori, setKategori] = useState<KategoriBarang[]>([])
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [kategoriFilter, setKategoriFilter] = useState('')
    const [hanyaMenipis, setHanyaMenipis] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [total, setTotal] = useState(0)
    const [jumlahMenipis, setJumlahMenipis] = useState(0)

    const [formOpen, setFormOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<Barang | null>(null)
    const [form, setForm] = useState(FORM_KOSONG)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [hapusTarget, setHapusTarget] = useState<Barang | null>(null)
    const [pakaiTarget, setPakaiTarget] = useState<Barang | null>(null)
    const [pakai, setPakai] = useState({ qty: '', tanggal: dayjs().format('YYYY-MM-DD'), pemakai: '', keterangan: '' })
    const [sesuaiTarget, setSesuaiTarget] = useState<Barang | null>(null)
    const [sesuai, setSesuai] = useState({ stok_baru: '', keterangan: '' })
    const [mutasiTarget, setMutasiTarget] = useState<Barang | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await barangService.list({
                page: currentPage, limit: pageSize, search: search || undefined,
                id_kategori_barang: kategoriFilter || undefined, stok_menipis: hanyaMenipis ? '1' : undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
            setJumlahMenipis(res.meta.ringkasan?.stok_menipis ?? 0)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, kategoriFilter, hanyaMenipis])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => { barangService.listKategori(true).then(setKategori).catch(() => {}) }, [])

    const kategoriOptions: Option[] = kategori.map(k => ({ value: k.id_kategori_barang, label: k.nama }))

    const bukaTambah = () => { setEditTarget(null); setForm(FORM_KOSONG); setErrors({}); setFormOpen(true) }
    const bukaEdit = (b: Barang) => {
        setEditTarget(b)
        setForm({ nama: b.nama, id_kategori_barang: b.id_kategori_barang ?? '', satuan: b.satuan, harga_standar: String(b.harga_standar), stok_minimum: String(b.stok_minimum), aktif: b.aktif })
        setErrors({})
        setFormOpen(true)
    }

    const jalankan = async (aksi: () => Promise<unknown>, sukses: string, tutup: () => void, setLoad: (v: boolean) => void) => {
        setLoad(true)
        try {
            await aksi()
            toast.push(<Notification type="success" title={sukses} />)
            tutup()
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoad(false)
        }
    }

    const handleSimpan = () => {
        const e: Record<string, string> = {}
        if (!form.nama.trim()) e.nama = 'Nama wajib diisi'
        setErrors(e)
        if (Object.keys(e).length > 0) return
        const payload: BarangPayload = {
            nama: form.nama.trim(), id_kategori_barang: form.id_kategori_barang || null, satuan: form.satuan,
            harga_standar: Number(form.harga_standar) || 0, stok_minimum: Number(form.stok_minimum) || 0, aktif: form.aktif,
        }
        jalankan(() => editTarget ? barangService.update(editTarget.id_barang, payload) : barangService.create(payload),
            editTarget ? 'Barang diperbarui' : 'Barang ditambahkan', () => setFormOpen(false), setSaving)
    }

    const columns: ColumnDef<Barang>[] = [
        { header: 'Kode', accessorKey: 'kode', size: 110, cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.kode}</span> },
        { header: 'Nama', accessorKey: 'nama', cell: ({ row }) => (
            <div>
                <p className="font-semibold">{row.original.nama}</p>
                <p className="text-xs text-gray-400">{row.original.nama_kategori ?? '—'}</p>
            </div>
        ) },
        { header: 'Satuan', accessorKey: 'satuan', size: 90 },
        { header: 'Harga Standar', accessorKey: 'harga_standar', size: 140, cell: ({ row }) => <span className="tabular-nums">{formatRupiah(row.original.harga_standar)}</span> },
        { header: 'Stok', accessorKey: 'stok', size: 120, cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <span className="tabular-nums font-semibold">{formatNum(row.original.stok)}</span>
                {row.original.stok_menipis && <Tag className="text-[10px] bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">Menipis</Tag>}
            </div>
        ) },
        { header: 'Status', accessorKey: 'aktif', size: 90, cell: ({ row }) => (
            <Tag className={row.original.aktif ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100' : 'bg-gray-100 text-gray-500'}>{row.original.aktif ? 'Aktif' : 'Nonaktif'}</Tag>
        ) },
        { header: '', id: 'aksi', size: 180, cell: ({ row }) => (
            <div className="flex items-center justify-end gap-1">
                <Tooltip title="Riwayat Stok"><span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300" onClick={() => setMutasiTarget(row.original)}><HiOutlineClipboardList className="text-lg" /></span></Tooltip>
                <Tooltip title="Catat Pemakaian"><span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300" onClick={() => { setPakaiTarget(row.original); setPakai({ qty: '', tanggal: dayjs().format('YYYY-MM-DD'), pemakai: '', keterangan: '' }) }}><HiOutlineMinusCircle className="text-lg" /></span></Tooltip>
                <Tooltip title="Penyesuaian Stok"><span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300" onClick={() => { setSesuaiTarget(row.original); setSesuai({ stok_baru: String(row.original.stok), keterangan: '' }) }}><HiOutlineAdjustments className="text-lg" /></span></Tooltip>
                <Tooltip title="Edit"><span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300" onClick={() => bukaEdit(row.original)}><HiOutlinePencilAlt className="text-lg" /></span></Tooltip>
                <Tooltip title="Hapus"><span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400" onClick={() => setHapusTarget(row.original)}><HiOutlineTrash className="text-lg" /></span></Tooltip>
            </div>
        ) },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-end gap-3">
                <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={bukaTambah}>Tambah Barang</Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {KARTU_RINGKASAN.map(k => {
                    const aktif = k.key === 'total' ? !hanyaMenipis : hanyaMenipis
                    return (
                        <Card key={k.key} clickable onClick={() => { setHanyaMenipis(k.key === 'menipis'); setCurrentPage(1) }}
                            className={`${k.bg} transition-shadow ${aktif ? `ring-2 ${k.ring}` : ''}`}>
                            <div className="flex flex-col gap-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>
                                    {k.icon}
                                </div>
                                <div className={`font-bold text-2xl ${k.text}`}>
                                    {formatNum(k.key === 'total' ? total : jumlahMenipis)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{k.label}</div>
                            </div>
                        </Card>
                    )
                })}
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input className="flex-1 min-w-60" placeholder="Cari kode/nama barang... (tekan Enter)"
                        suffix={searchInput ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer" onClick={() => { setSearchInput(''); setSearch(''); setCurrentPage(1) }} /> : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer" onClick={() => { setSearch(searchInput); setCurrentPage(1) }} />}
                        value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setCurrentPage(1) } }} />
                    <div className="w-full sm:w-52 shrink-0">
                        <Select<Option> isClearable placeholder="Semua Kategori" options={kategoriOptions}
                            value={kategoriOptions.find(o => o.value === kategoriFilter) ?? null}
                            onChange={opt => { setKategoriFilter((opt as Option | null)?.value ?? ''); setCurrentPage(1) }} />
                    </div>
                    <div className="flex items-center gap-2"><Switcher checked={hanyaMenipis} onChange={v => { setHanyaMenipis(v); setCurrentPage(1) }} /><span className="text-sm">Hanya stok menipis</span></div>
                </div>
                <DataTable columns={columns} data={list as unknown[]} loading={loading} noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }} onPaginationChange={setCurrentPage}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }} />
            </Card>

            <Dialog isOpen={formOpen} onRequestClose={() => setFormOpen(false)} onClose={() => setFormOpen(false)} width={480}>
                <h5 className="font-bold mb-4">{editTarget ? 'Edit Barang' : 'Tambah Barang'}</h5>
                <form onSubmit={e => { e.preventDefault(); handleSimpan() }}>
                    <FormItem label="Nama" asterisk invalid={!!errors.nama} errorMessage={errors.nama}><Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} /></FormItem>
                    <FormItem label="Kategori"><Select<Option> isClearable options={kategoriOptions} value={kategoriOptions.find(o => o.value === form.id_kategori_barang) ?? null} onChange={opt => setForm(p => ({ ...p, id_kategori_barang: (opt as Option | null)?.value ?? '' }))} /></FormItem>
                    <div className="grid grid-cols-2 gap-3">
                        <FormItem label="Satuan"><Select<Option> options={SATUAN_OPTIONS} value={SATUAN_OPTIONS.find(o => o.value === form.satuan) ?? SATUAN_OPTIONS[0]} onChange={opt => setForm(p => ({ ...p, satuan: (opt as Option).value }))} /></FormItem>
                        <FormItem label="Harga Standar"><Input prefix="Rp" value={form.harga_standar ? formatNum(Number(form.harga_standar)) : ''} onChange={e => setForm(p => ({ ...p, harga_standar: e.target.value.replace(/\D/g, '') }))} /></FormItem>
                        <FormItem label="Stok Minimum" extra={<span className="text-xs text-gray-400">0 = tidak dipantau</span>}><Input type="number" min={0} value={form.stok_minimum} onChange={e => setForm(p => ({ ...p, stok_minimum: e.target.value }))} /></FormItem>
                        <FormItem label="Aktif"><Switcher checked={form.aktif} onChange={v => setForm(p => ({ ...p, aktif: v }))} /></FormItem>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={!!pakaiTarget} onRequestClose={() => setPakaiTarget(null)} onClose={() => setPakaiTarget(null)} width={440}>
                <h5 className="font-bold mb-1">Catat Pemakaian</h5>
                <p className="text-xs text-gray-400 mb-4">{pakaiTarget?.nama} · stok {formatNum(pakaiTarget?.stok ?? 0)} {pakaiTarget?.satuan}</p>
                <form onSubmit={e => { e.preventDefault(); if (!pakaiTarget) return; jalankan(() => barangService.pemakaian(pakaiTarget.id_barang, { qty: Number(pakai.qty), tanggal: pakai.tanggal, pemakai: pakai.pemakai.trim(), keterangan: pakai.keterangan || undefined }), 'Pemakaian tercatat', () => setPakaiTarget(null), setSaving) }}>
                    <FormItem label="Qty" asterisk><Input type="number" min={1} value={pakai.qty} onChange={e => setPakai(p => ({ ...p, qty: e.target.value }))} /></FormItem>
                    <FormItem label="Tanggal" asterisk><DatePicker inputFormat="DD/MM/YYYY" value={dayjs(pakai.tanggal).toDate()} onChange={d => setPakai(p => ({ ...p, tanggal: d ? dayjs(d).format('YYYY-MM-DD') : '' }))} /></FormItem>
                    <FormItem label="Pemakai / Divisi" asterisk><Input value={pakai.pemakai} onChange={e => setPakai(p => ({ ...p, pemakai: e.target.value }))} /></FormItem>
                    <FormItem label="Keterangan"><Input textArea rows={2} value={pakai.keterangan} onChange={e => setPakai(p => ({ ...p, keterangan: e.target.value }))} /></FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setPakaiTarget(null)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving} disabled={!pakai.qty || !pakai.pemakai.trim() || !pakai.tanggal}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={!!sesuaiTarget} onRequestClose={() => setSesuaiTarget(null)} onClose={() => setSesuaiTarget(null)} width={440}>
                <h5 className="font-bold mb-1">Penyesuaian Stok</h5>
                <p className="text-xs text-gray-400 mb-4">{sesuaiTarget?.nama} · stok saat ini {formatNum(sesuaiTarget?.stok ?? 0)}</p>
                <form onSubmit={e => { e.preventDefault(); if (!sesuaiTarget) return; jalankan(() => barangService.penyesuaian(sesuaiTarget.id_barang, { stok_baru: Number(sesuai.stok_baru), keterangan: sesuai.keterangan.trim() }), 'Penyesuaian tersimpan', () => setSesuaiTarget(null), setSaving) }}>
                    <FormItem label="Stok Baru (hasil opname)" asterisk><Input type="number" min={0} value={sesuai.stok_baru} onChange={e => setSesuai(p => ({ ...p, stok_baru: e.target.value }))} /></FormItem>
                    <FormItem label="Keterangan" asterisk><Input textArea rows={2} value={sesuai.keterangan} onChange={e => setSesuai(p => ({ ...p, keterangan: e.target.value }))} /></FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setSesuaiTarget(null)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving} disabled={sesuai.stok_baru === '' || !sesuai.keterangan.trim()}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={!!hapusTarget} type="danger" title="Hapus Barang" confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: saving }} onClose={() => setHapusTarget(null)} onCancel={() => setHapusTarget(null)}
                onConfirm={() => { if (!hapusTarget) return; jalankan(() => barangService.remove(hapusTarget.id_barang), 'Barang dihapus', () => setHapusTarget(null), setSaving) }}>
                <p>Hapus barang <span className="font-semibold">{hapusTarget?.nama}</span>?</p>
            </ConfirmDialog>

            <MutasiBarangDrawer barang={mutasiTarget} onClose={() => setMutasiTarget(null)} />
        </div>
    )
}
