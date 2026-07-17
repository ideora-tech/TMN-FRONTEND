'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Button, Dialog, FormItem, Input, DatePicker, Upload, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX, HiOutlinePlus, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineDocumentText } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { dokumenArmadaService, DokumenArmadaWithArmada } from '@/services/dokumenArmada.service'
import { armadaService, Armada } from '@/services/armada.service'

type Option = { value: string; label: string }

// Selaras dengan rule backend: 'file' => ['file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'] (KB)
const MAX_FILE_SIZE = 5 * 1024 * 1024

const JENIS_DOKUMEN_OPTIONS: Option[] = [
    { value: 'STNK',     label: 'STNK' },
    { value: 'KIR',      label: 'KIR' },
    { value: 'Asuransi', label: 'Asuransi' },
    { value: 'BPKB',     label: 'BPKB' },
    { value: 'Pajak',    label: 'Pajak Kendaraan' },
    { value: 'Lainnya',  label: 'Lainnya' },
]

const JENIS_FILTER_OPTIONS: Option[] = [{ value: '', label: 'Semua Jenis' }, ...JENIS_DOKUMEN_OPTIONS]

function getExpiryInfo(berlakuSampai: string | null): { label: string; className: string } {
    if (!berlakuSampai) return { label: '—', className: 'bg-gray-100 text-gray-400' }
    const days = Math.ceil((new Date(berlakuSampai).getTime() - Date.now()) / 86400000)
    if (days < 0)   return { label: 'Kadaluarsa', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    if (days <= 14) return { label: `${days} hari lagi`, className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    if (days <= 30) return { label: `${days} hari lagi`, className: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' }
    if (days <= 60) return { label: `${days} hari lagi`, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' }
    return { label: `${days} hari lagi`, className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' }
}

type DocForm = { id_armada: string; jenis_dokumen: string; nomor: string; berlaku_sampai: string }

const emptyForm = (): DocForm => ({ id_armada: '', jenis_dokumen: '', nomor: '', berlaku_sampai: '' })

export default function DokumenArmadaPage() {
    const [list, setList]       = useState<DokumenArmadaWithArmada[]>([])
    const [loading, setLoading] = useState(false)
    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [armadaFilter, setArmadaFilter] = useState('')
    const [jenisFilter, setJenisFilter]   = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const [showForm, setShowForm]         = useState(false)
    const [form, setForm]                 = useState<DocForm>(emptyForm())
    const [file, setFile]                 = useState<File | null>(null)
    const [saving, setSaving]             = useState(false)
    const [editTarget, setEditTarget]     = useState<DokumenArmadaWithArmada | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<DokumenArmadaWithArmada | null>(null)
    const [deleting, setDeleting]         = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await dokumenArmadaService.listAll({
                page: currentPage, limit: pageSize,
                id_armada: armadaFilter || undefined,
                jenis_dokumen: jenisFilter || undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, armadaFilter, jenisFilter])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        armadaService.list(1, 100).then(res => {
            setArmadaOptions(res.data.map((a: Armada) => ({ value: a.id_armada, label: a.nopol })))
        }).catch(() => {})
    }, [])

    const handleSearchSubmit = () => setSearch(searchInput)
    const handleSearchClear  = () => { setSearchInput(''); setSearch('') }

    const filteredList = list.filter(d => {
        if (!search) return true
        const q = search.toLowerCase()
        return d.jenis_dokumen.toLowerCase().includes(q)
            || (d.nomor ?? '').toLowerCase().includes(q)
            || (d.armada_nopol ?? '').toLowerCase().includes(q)
    })

    const openAdd = () => { setForm(emptyForm()); setFile(null); setShowForm(true) }

    const openEdit = (d: DokumenArmadaWithArmada) => {
        setEditTarget(d)
        setForm({
            id_armada: d.id_armada,
            jenis_dokumen: d.jenis_dokumen,
            nomor: d.nomor ?? '',
            berlaku_sampai: d.berlaku_sampai ?? '',
        })
        setFile(null)
    }

    const closeForm = () => { setShowForm(false); setEditTarget(null) }

    const handleSubmit = async () => {
        if (!form.id_armada || !form.jenis_dokumen) return
        if (!editTarget && !file) return
        setSaving(true)
        try {
            const payload = {
                jenis_dokumen: form.jenis_dokumen,
                nomor: form.nomor || null,
                berlaku_sampai: form.berlaku_sampai || null,
            }
            if (editTarget) {
                await dokumenArmadaService.update(editTarget.id_armada, editTarget.id_dokumen_armada, payload, file ?? undefined)
                toast.push(<Notification type="success" title="Dokumen berhasil diperbarui" />)
            } else {
                await dokumenArmadaService.create(form.id_armada, payload, file)
                toast.push(<Notification type="success" title="Dokumen berhasil ditambahkan" />)
            }
            closeForm()
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await dokumenArmadaService.delete(deleteTarget.id_armada, deleteTarget.id_dokumen_armada)
            toast.push(<Notification type="success" title="Dokumen berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeleting(false)
        }
    }

    const columns: ColumnDef<DokumenArmadaWithArmada>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<DokumenArmadaWithArmada, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Armada', accessorKey: 'armada_nopol', size: 130,
            cell: ({ row }: CellContext<DokumenArmadaWithArmada, unknown>) => (
                <span className="font-mono text-xs font-semibold">{row.original.armada_nopol ?? '—'}</span>
            ),
        },
        { header: 'Jenis Dokumen', accessorKey: 'jenis_dokumen', size: 140 },
        {
            header: 'Nomor', accessorKey: 'nomor', size: 150,
            cell: ({ row }: CellContext<DokumenArmadaWithArmada, unknown>) => (
                <span className="font-mono text-xs">{row.original.nomor ?? '—'}</span>
            ),
        },
        {
            header: 'Berlaku Sampai', accessorKey: 'berlaku_sampai', size: 180,
            cell: ({ row }: CellContext<DokumenArmadaWithArmada, unknown>) => {
                const tgl = row.original.berlaku_sampai
                const expiry = getExpiryInfo(tgl)
                return (
                    <div>
                        <p className="text-xs">{tgl ? dayjs(tgl).format('DD MMM YYYY') : '—'}</p>
                        <Tag className={`text-xs font-semibold mt-1 ${expiry.className}`}>{expiry.label}</Tag>
                    </div>
                )
            },
        },
        {
            header: 'File', accessorKey: 'url_file', size: 90,
            cell: ({ row }: CellContext<DokumenArmadaWithArmada, unknown>) =>
                row.original.url_file
                    ? <a href={row.original.url_file} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Lihat</a>
                    : <span className="text-gray-400 text-xs">—</span>,
        },
        {
            header: '', id: 'action', size: 90,
            cell: ({ row }: CellContext<DokumenArmadaWithArmada, unknown>) => (
                <div className="flex items-center justify-end gap-1">
                    <Tooltip title="Edit">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => openEdit(row.original)}>
                            <HiOutlinePencilAlt className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                            onClick={() => setDeleteTarget(row.original)}>
                            <HiOutlineTrash className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
    ]

    const isFormOpen = showForm || editTarget !== null

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Dokumen Armada</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola dokumen seluruh armada — STNK, KIR, Asuransi, dll</p>
                </div>
                <Button variant="solid" icon={<HiOutlinePlus />} onClick={openAdd}>Tambah Dokumen</Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari jenis dokumen, nomor, atau nopol... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-full sm:w-52 shrink-0">
                        <Select
                            placeholder="Semua Armada"
                            isClearable
                            options={armadaOptions}
                            value={armadaOptions.find(o => o.value === armadaFilter) ?? null}
                            onChange={(opt) => { setArmadaFilter((opt as Option | null)?.value ?? ''); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-44 shrink-0">
                        <Select
                            isSearchable={false}
                            options={JENIS_FILTER_OPTIONS}
                            value={JENIS_FILTER_OPTIONS.find(o => o.value === jenisFilter) ?? JENIS_FILTER_OPTIONS[0]}
                            onChange={(opt) => { setJenisFilter((opt as Option).value); setCurrentPage(1) }}
                        />
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={filteredList as unknown[]}
                    loading={loading}
                    noData={!loading && filteredList.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>

            <Dialog isOpen={isFormOpen} onRequestClose={closeForm} width={600}>
                <h5 className="text-base font-semibold mb-5">{editTarget ? 'Edit Dokumen' : 'Tambah Dokumen'}</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <div className="sm:col-span-2">
                        <FormItem label="Armada" asterisk>
                            <Select
                                placeholder="Pilih armada..."
                                isDisabled={!!editTarget}
                                options={armadaOptions}
                                value={armadaOptions.find(o => o.value === form.id_armada) ?? null}
                                onChange={(opt) => setForm(p => ({ ...p, id_armada: (opt as Option | null)?.value ?? '' }))}
                            />
                        </FormItem>
                    </div>
                    <FormItem label="Jenis Dokumen" asterisk>
                        <Select isSearchable={false} placeholder="Pilih jenis..."
                            options={JENIS_DOKUMEN_OPTIONS}
                            value={JENIS_DOKUMEN_OPTIONS.find(o => o.value === form.jenis_dokumen) ?? null}
                            onChange={opt => setForm(p => ({ ...p, jenis_dokumen: (opt as Option | null)?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Nomor Dokumen">
                        <Input placeholder="Contoh: B 1234 XYZ" value={form.nomor}
                            onChange={e => setForm(p => ({ ...p, nomor: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Berlaku Sampai">
                        <DatePicker
                            value={form.berlaku_sampai ? new Date(form.berlaku_sampai) : null}
                            onChange={date => setForm(p => ({ ...p, berlaku_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="File Dokumen" asterisk={!editTarget}>
                        <Upload accept=".pdf,.jpg,.jpeg,.png" showList={false} uploadLimit={1}
                            onChange={files => {
                                const f = files[0] ?? null
                                if (f && f.size > MAX_FILE_SIZE) {
                                    toast.push(<Notification type="danger" title={`Ukuran file maksimal 5 MB (file dipilih: ${(f.size / 1024 / 1024).toFixed(1)} MB)`} />)
                                    return
                                }
                                setFile(f)
                            }}>
                            <Button type="button" variant="default" size="sm" icon={<HiOutlineDocumentText />}
                                className="max-w-full">
                                <span className="inline-block max-w-[180px] truncate align-bottom">
                                    {file ? file.name : (editTarget ? 'Ganti file (opsional)' : 'Pilih file')}
                                </span>
                            </Button>
                        </Upload>
                        <p className="text-xs text-gray-400 mt-1.5">PDF/JPG/PNG · maksimal 5 MB</p>
                        {file && (
                            <button type="button" className="text-xs text-red-400 hover:text-red-600 mt-1 block"
                                onClick={() => setFile(null)}>Hapus pilihan</button>
                        )}
                        {editTarget?.url_file && !file && (
                            <p className="text-xs text-gray-500 mt-1">
                                File saat ini:{' '}
                                <a href={editTarget.url_file} target="_blank" rel="noreferrer"
                                    className="text-blue-500 hover:underline">Lihat dokumen</a>
                            </p>
                        )}
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={closeForm}>Batal</Button>
                    <Button variant="solid" loading={saving}
                        disabled={!form.id_armada || !form.jenis_dokumen || (!editTarget && !file)}
                        onClick={handleSubmit}>Simpan</Button>
                </div>
            </Dialog>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Dokumen"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>Hapus dokumen <strong>{deleteTarget?.jenis_dokumen}</strong> untuk armada {deleteTarget?.armada_nopol}?</p>
            </ConfirmDialog>
        </div>
    )
}
