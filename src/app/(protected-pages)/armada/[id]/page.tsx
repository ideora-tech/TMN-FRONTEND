'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Dialog, FormItem, Input, DatePicker, Upload, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlinePlus, HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { armadaService, Armada } from '@/services/armada.service'
import { dokumenArmadaService, DokumenArmada } from '@/services/dokumenArmada.service'
import { perawatanArmadaService, PerawatanArmada } from '@/services/perawatanArmada.service'

type Status = 'aktif' | 'servis' | 'nonaktif'

const STATUS_OPTIONS = [
    { value: 'aktif',    label: 'Aktif' },
    { value: 'servis',   label: 'Servis' },
    { value: 'nonaktif', label: 'Nonaktif' },
]

const statusClass: Record<string, string> = {
    aktif:    'bg-emerald-100 text-emerald-600',
    servis:   'bg-yellow-100 text-yellow-700',
    nonaktif: 'bg-red-100 text-red-500',
}

const JENIS_DOKUMEN_OPTIONS = [
    { value: 'STNK',     label: 'STNK' },
    { value: 'KIR',      label: 'KIR' },
    { value: 'Asuransi', label: 'Asuransi' },
    { value: 'BPKB',     label: 'BPKB' },
    { value: 'Pajak',    label: 'Pajak Kendaraan' },
    { value: 'Lainnya',  label: 'Lainnya' },
]

export default function ArmadaDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [armada, setArmada]   = useState<Armada | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Armada>>({})
    const [saving, setSaving]   = useState(false)

    const [dokumen, setDokumen]         = useState<DokumenArmada[]>([])
    const [docLoading, setDocLoading]   = useState(false)
    const [showDocForm, setShowDocForm] = useState(false)
    const [docForm, setDocForm]         = useState({ jenis_dokumen: '', nomor: '', berlaku_sampai: '', url_file: '' })
    const [docFile, setDocFile]         = useState<File | null>(null)
    const [addingDoc, setAddingDoc]     = useState(false)
    const [editDocTarget, setEditDocTarget]   = useState<DokumenArmada | null>(null)
    const [editDocForm, setEditDocForm]       = useState({ jenis_dokumen: '', nomor: '', berlaku_sampai: '', url_file: '' })
    const [editDocFile, setEditDocFile]       = useState<File | null>(null)
    const [updatingDoc, setUpdatingDoc]       = useState(false)
    const [deleteDocTarget, setDeleteDocTarget] = useState<DokumenArmada | null>(null)
    const [deletingDoc, setDeletingDoc] = useState(false)

    const [perawatan, setPerawatan]         = useState<PerawatanArmada[]>([])
    const [rawatLoading, setRawatLoading]   = useState(false)
    const [showRawatForm, setShowRawatForm] = useState(false)
    const [rawatForm, setRawatForm]         = useState({ tanggal: '', jenis_perawatan: '', biaya: '', keterangan: '' })
    const [addingRawat, setAddingRawat]     = useState(false)
    const [deleteRawatTarget, setDeleteRawatTarget] = useState<PerawatanArmada | null>(null)
    const [deletingRawat, setDeletingRawat] = useState(false)

    useEffect(() => {
        armadaService.get(id)
            .then(a => { setArmada(a); setForm(a) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const fetchDokumen = useCallback(async () => {
        setDocLoading(true)
        try { setDokumen(await dokumenArmadaService.list(id)) }
        catch (err) { toast.push(<Notification type="danger" title={parseApiError(err)} />) }
        finally { setDocLoading(false) }
    }, [id])

    const fetchPerawatan = useCallback(async () => {
        setRawatLoading(true)
        try { setPerawatan(await perawatanArmadaService.list(id)) }
        catch (err) { toast.push(<Notification type="danger" title={parseApiError(err)} />) }
        finally { setRawatLoading(false) }
    }, [id])

    useEffect(() => { fetchDokumen() }, [fetchDokumen])
    useEffect(() => { fetchPerawatan() }, [fetchPerawatan])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await armadaService.update(id, { ...form, tahun: form.tahun ? Number(form.tahun) : undefined })
            setArmada(updated)
            setEditing(false)
            toast.push(<Notification type="success" title="Data armada berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleAddDokumen = async () => {
        if (!docForm.jenis_dokumen) return
        setAddingDoc(true)
        try {
            await dokumenArmadaService.create(id, {
                jenis_dokumen:  docForm.jenis_dokumen,
                nomor:          docForm.nomor || null,
                berlaku_sampai: docForm.berlaku_sampai || null,
                url_file:       docFile ? null : (docForm.url_file || null),
            }, docFile)
            toast.push(<Notification type="success" title="Dokumen berhasil ditambahkan" />)
            setDocForm({ jenis_dokumen: '', nomor: '', berlaku_sampai: '', url_file: '' })
            setDocFile(null)
            setShowDocForm(false)
            fetchDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAddingDoc(false)
        }
    }

    const handleEditDokumen = async () => {
        if (!editDocTarget || !editDocForm.jenis_dokumen) return
        setUpdatingDoc(true)
        try {
            await dokumenArmadaService.update(id, editDocTarget.id_dokumen_armada, {
                jenis_dokumen:  editDocForm.jenis_dokumen,
                nomor:          editDocForm.nomor || null,
                berlaku_sampai: editDocForm.berlaku_sampai || null,
                url_file:       editDocFile ? null : (editDocForm.url_file || null),
            }, editDocFile)
            toast.push(<Notification type="success" title="Dokumen berhasil diperbarui" />)
            setEditDocTarget(null)
            setEditDocFile(null)
            fetchDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdatingDoc(false)
        }
    }

    const handleDeleteDokumen = async () => {
        if (!deleteDocTarget) return
        setDeletingDoc(true)
        try {
            await dokumenArmadaService.delete(id, deleteDocTarget.id_dokumen_armada)
            toast.push(<Notification type="success" title="Dokumen berhasil dihapus" />)
            setDeleteDocTarget(null)
            fetchDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeletingDoc(false)
        }
    }

    const handleAddPerawatan = async () => {
        if (!rawatForm.tanggal || !rawatForm.jenis_perawatan) return
        setAddingRawat(true)
        try {
            await perawatanArmadaService.create(id, {
                tanggal:         rawatForm.tanggal,
                jenis_perawatan: rawatForm.jenis_perawatan,
                biaya:           Number(rawatForm.biaya) || 0,
                keterangan:      rawatForm.keterangan || null,
            })
            toast.push(<Notification type="success" title="Perawatan berhasil dicatat" />)
            setRawatForm({ tanggal: '', jenis_perawatan: '', biaya: '', keterangan: '' })
            setShowRawatForm(false)
            fetchPerawatan()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAddingRawat(false)
        }
    }

    const handleDeletePerawatan = async () => {
        if (!deleteRawatTarget) return
        setDeletingRawat(true)
        try {
            await perawatanArmadaService.delete(id, deleteRawatTarget.id_perawatan)
            toast.push(<Notification type="success" title="Data perawatan berhasil dihapus" />)
            setDeleteRawatTarget(null)
            fetchPerawatan()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeletingRawat(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!armada) return <div className="p-6 text-red-500">Armada tidak ditemukan.</div>

    const initial = armada.nopol?.charAt(0).toUpperCase() ?? 'A'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.ARMADA)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{armada.nopol}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan pengelolaan armada</p>
                </div>
            </div>

            {/* Info Armada */}
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight font-mono">{armada.nopol}</p>
                                    <p className="text-sm text-gray-500 mt-1">{armada.merk}{armada.model ? ` ${armada.model}` : ''}{armada.tahun ? ` · ${armada.tahun}` : ''}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass[armada.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {armada.status}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Nopol', value: <span className="font-mono">{armada.nopol}</span> },
                                { label: 'Merk',  value: armada.merk },
                                { label: 'Model', value: armada.model ?? <span className="text-gray-400">—</span> },
                                { label: 'Tahun', value: armada.tahun ? String(armada.tahun) : <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nopol?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Data Armada</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi armada di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nopol">
                                <Input value={form.nopol ?? ''} onChange={e => setForm(p => ({ ...p, nopol: e.target.value.toUpperCase() }))} />
                            </FormItem>
                            <FormItem label="Merk">
                                <Input value={form.merk ?? ''} onChange={e => setForm(p => ({ ...p, merk: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Model">
                                <Input value={form.model ?? ''} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Tahun">
                                <Input type="number" value={form.tahun ?? ''} min={1990} max={2100}
                                    onChange={e => setForm(p => ({ ...p, tahun: Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false}
                                    value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                                    options={STATUS_OPTIONS}
                                    onChange={option => option && setForm(p => ({ ...p, status: option.value as Status }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(armada) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>

            {/* Dokumen Kendaraan */}
            <Card>
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Dokumen Kendaraan</p>
                    <Button size="sm" variant="solid" icon={<HiOutlinePlus />} onClick={() => setShowDocForm(v => !v)}>
                        Tambah Dokumen
                    </Button>
                </div>

                {showDocForm && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Jenis Dokumen" asterisk>
                                <Select isSearchable={false} placeholder="Pilih jenis..."
                                    options={JENIS_DOKUMEN_OPTIONS}
                                    value={JENIS_DOKUMEN_OPTIONS.find(o => o.value === docForm.jenis_dokumen) ?? null}
                                    onChange={opt => setDocForm(p => ({ ...p, jenis_dokumen: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Nomor Dokumen">
                                <Input placeholder="Contoh: B 1234 XYZ" value={docForm.nomor}
                                    onChange={e => setDocForm(p => ({ ...p, nomor: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Berlaku Sampai">
                                <DatePicker
                                    value={docForm.berlaku_sampai ? new Date(docForm.berlaku_sampai) : null}
                                    onChange={date => setDocForm(p => ({ ...p, berlaku_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="URL File">
                                <Input placeholder="https://..." value={docForm.url_file} disabled={!!docFile}
                                    onChange={e => setDocForm(p => ({ ...p, url_file: e.target.value }))} />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Upload File (PDF/JPG/PNG, maks 5MB)">
                                    <Upload accept=".pdf,.jpg,.jpeg,.png" showList={false} uploadLimit={1}
                                        onChange={(files) => { setDocFile(files[0] ?? null); if (files[0]) setDocForm(p => ({ ...p, url_file: '' })) }}>
                                        <Button type="button" variant="default" size="sm">
                                            {docFile ? `📎 ${docFile.name}` : 'Pilih file...'}
                                        </Button>
                                    </Upload>
                                    {docFile && (
                                        <button type="button" className="text-xs text-red-400 hover:text-red-600 mt-1.5 block"
                                            onClick={() => setDocFile(null)}>Hapus pilihan</button>
                                    )}
                                </FormItem>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button size="sm" variant="plain" icon={<HiOutlineX />} onClick={() => { setShowDocForm(false); setDocFile(null) }}>Batal</Button>
                            <Button size="sm" variant="solid" loading={addingDoc} onClick={handleAddDokumen}>Simpan</Button>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </div>
                )}

                {docLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : dokumen.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada dokumen tercatat</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Jenis</th>
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Nomor</th>
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Berlaku s/d</th>
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">File</th>
                                    <th className="pb-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {dokumen.map(d => (
                                    <tr key={d.id_dokumen_armada}>
                                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{d.jenis_dokumen}</td>
                                        <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{d.nomor ?? '-'}</td>
                                        <td className="py-3 pr-4">
                                            {d.berlaku_sampai ? (
                                                <span className={dayjs(d.berlaku_sampai).isBefore(dayjs()) ? 'text-red-500 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                                    {dayjs(d.berlaku_sampai).format('DD MMM YYYY')}
                                                </span>
                                            ) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4">
                                            {d.url_file
                                                ? <a href={d.url_file} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Lihat</a>
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 text-right whitespace-nowrap">
                                            <Button size="xs" variant="plain" icon={<HiOutlinePencilAlt />}
                                                className="mr-1"
                                                onClick={() => {
                                                    setEditDocTarget(d)
                                                    setEditDocForm({
                                                        jenis_dokumen: d.jenis_dokumen,
                                                        nomor: d.nomor ?? '',
                                                        berlaku_sampai: d.berlaku_sampai ?? '',
                                                        url_file: d.url_file ?? '',
                                                    })
                                                    setEditDocFile(null)
                                                }} />
                                            <Button size="xs" variant="plain" icon={<HiOutlineTrash />}
                                                onClick={() => setDeleteDocTarget(d)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Riwayat Perawatan */}
            <Card>
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Perawatan</p>
                    <Button size="sm" variant="solid" icon={<HiOutlinePlus />} onClick={() => setShowRawatForm(v => !v)}>
                        Catat Perawatan
                    </Button>
                </div>

                {showRawatForm && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Tanggal" asterisk>
                                <DatePicker
                                    value={rawatForm.tanggal ? new Date(rawatForm.tanggal) : null}
                                    onChange={date => setRawatForm(p => ({ ...p, tanggal: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="Jenis Perawatan" asterisk>
                                <Input placeholder="Contoh: Ganti Oli, Tune Up..." value={rawatForm.jenis_perawatan}
                                    onChange={e => setRawatForm(p => ({ ...p, jenis_perawatan: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Biaya (Rp)">
                                <Input prefix="Rp" placeholder="0"
                                    value={rawatForm.biaya ? formatNum(Number(rawatForm.biaya)) : ''}
                                    onChange={e => setRawatForm(p => ({ ...p, biaya: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Keterangan">
                                    <Input textArea placeholder="Keterangan tambahan..." value={rawatForm.keterangan}
                                        onChange={e => setRawatForm(p => ({ ...p, keterangan: e.target.value }))} />
                                </FormItem>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button size="sm" variant="plain" icon={<HiOutlineX />} onClick={() => setShowRawatForm(false)}>Batal</Button>
                            <Button size="sm" variant="solid" loading={addingRawat} onClick={handleAddPerawatan}>Simpan</Button>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </div>
                )}

                {rawatLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : perawatan.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada riwayat perawatan</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Tanggal</th>
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Jenis</th>
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Biaya</th>
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Keterangan</th>
                                    <th className="pb-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {perawatan.map(p => (
                                    <tr key={p.id_perawatan}>
                                        <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{dayjs(p.tanggal).format('DD MMM YYYY')}</td>
                                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{p.jenis_perawatan}</td>
                                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{formatRupiah(p.biaya)}</td>
                                        <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">{p.keterangan ?? <span className="text-gray-300">—</span>}</td>
                                        <td className="py-3 text-right">
                                            <Button size="xs" variant="plain" icon={<HiOutlineTrash />}
                                                onClick={() => setDeleteRawatTarget(p)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Edit Dokumen Dialog */}
            <Dialog isOpen={!!editDocTarget} onRequestClose={() => setEditDocTarget(null)} width={560}>
                <h5 className="text-base font-semibold mb-5">Edit Dokumen</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Jenis Dokumen" asterisk>
                        <Select isSearchable={false} placeholder="Pilih jenis..."
                            options={JENIS_DOKUMEN_OPTIONS}
                            value={JENIS_DOKUMEN_OPTIONS.find(o => o.value === editDocForm.jenis_dokumen) ?? null}
                            onChange={opt => setEditDocForm(p => ({ ...p, jenis_dokumen: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Nomor Dokumen">
                        <Input placeholder="Contoh: B 1234 XYZ" value={editDocForm.nomor}
                            onChange={e => setEditDocForm(p => ({ ...p, nomor: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Berlaku Sampai">
                        <DatePicker
                            value={editDocForm.berlaku_sampai ? new Date(editDocForm.berlaku_sampai) : null}
                            onChange={date => setEditDocForm(p => ({ ...p, berlaku_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="URL File">
                        <Input placeholder="https://..." value={editDocForm.url_file} disabled={!!editDocFile}
                            onChange={e => setEditDocForm(p => ({ ...p, url_file: e.target.value }))} />
                    </FormItem>
                    <div className="sm:col-span-2">
                        <FormItem label="Upload File Baru (PDF/JPG/PNG, maks 5MB)">
                            <Upload accept=".pdf,.jpg,.jpeg,.png" showList={false} uploadLimit={1}
                                onChange={(files) => { setEditDocFile(files[0] ?? null); if (files[0]) setEditDocForm(p => ({ ...p, url_file: '' })) }}>
                                <Button type="button" variant="default" size="sm">
                                    {editDocFile ? `📎 ${editDocFile.name}` : 'Pilih file...'}
                                </Button>
                            </Upload>
                            {editDocFile && (
                                <button type="button" className="text-xs text-red-400 hover:text-red-600 mt-1.5 block"
                                    onClick={() => setEditDocFile(null)}>Hapus pilihan</button>
                            )}
                        </FormItem>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" icon={<HiOutlineX />} onClick={() => { setEditDocTarget(null); setEditDocFile(null) }}>Batal</Button>
                    <Button variant="solid" loading={updatingDoc} onClick={handleEditDokumen}>Simpan</Button>
                </div>
            </Dialog>

            <ConfirmDialog isOpen={!!deleteDocTarget} type="danger" title="Hapus Dokumen"
                onClose={() => setDeleteDocTarget(null)} onConfirm={handleDeleteDokumen}
                confirmButtonProps={{ loading: deletingDoc, variant: 'solid', className: 'bg-red-600 hover:bg-red-700' }}>
                <p>Hapus dokumen <strong>{deleteDocTarget?.jenis_dokumen}</strong>?</p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={!!deleteRawatTarget} type="danger" title="Hapus Perawatan"
                onClose={() => setDeleteRawatTarget(null)} onConfirm={handleDeletePerawatan}
                confirmButtonProps={{ loading: deletingRawat, variant: 'solid', className: 'bg-red-600 hover:bg-red-700' }}>
                <p>Hapus data perawatan <strong>{deleteRawatTarget?.jenis_perawatan}</strong>?</p>
            </ConfirmDialog>
        </div>
    )
}