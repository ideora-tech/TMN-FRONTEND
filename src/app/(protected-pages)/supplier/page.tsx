'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Button, Input, Tag, Tooltip, Dialog, FormItem, toast, Notification, Switcher } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { supplierService, Supplier } from '@/services/supplier.service'

type FormState = { nama: string; telepon: string; alamat: string; aktif: boolean }
const EMPTY_FORM: FormState = { nama: '', telepon: '', alamat: '', aktif: true }

export default function SupplierPage() {
    const [list, setList] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [total, setTotal] = useState(0)
    const [formOpen, setFormOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<Supplier | null>(null)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [errNama, setErrNama] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await supplierService.list({ page: currentPage, limit: pageSize, search })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search])

    useEffect(() => { fetchData() }, [fetchData])

    const bukaTambah = () => { setEditTarget(null); setForm(EMPTY_FORM); setErrNama(''); setFormOpen(true) }
    const bukaEdit = (s: Supplier) => {
        setEditTarget(s)
        setForm({ nama: s.nama, telepon: s.telepon ?? '', alamat: s.alamat ?? '', aktif: s.aktif })
        setErrNama(''); setFormOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.nama.trim()) { setErrNama('Nama supplier wajib diisi'); return }
        setSubmitting(true)
        try {
            const payload = {
                nama: form.nama.trim(),
                telepon: form.telepon.trim() || null,
                alamat: form.alamat.trim() || null,
                aktif: form.aktif,
            }
            if (editTarget) await supplierService.update(editTarget.id_supplier, payload)
            else await supplierService.create(payload)
            toast.push(<Notification type="success" title={editTarget ? 'Supplier diperbarui' : 'Supplier ditambahkan'} />)
            setFormOpen(false)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await supplierService.remove(deleteTarget.id_supplier)
            toast.push(<Notification type="success" title="Supplier dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<Supplier>[] = [
        { header: 'No', id: 'no', size: 60, cell: p => p.row.index + 1 + (currentPage - 1) * pageSize },
        { header: 'Nama', accessorKey: 'nama', cell: ({ row }) => <span className="font-semibold">{row.original.nama}</span> },
        { header: 'Telepon', accessorKey: 'telepon', cell: ({ row }) => row.original.telepon ?? <span className="text-gray-400">—</span> },
        { header: 'Alamat', accessorKey: 'alamat', cell: ({ row }) => row.original.alamat ?? <span className="text-gray-400">—</span> },
        {
            header: 'Status', accessorKey: 'aktif', size: 100,
            cell: ({ row }) => row.original.aktif
                ? <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100">Aktif</Tag>
                : <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300">Nonaktif</Tag>,
        },
        {
            header: '', id: 'aksi', size: 90,
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Edit">
                        <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 transition-colors"
                            onClick={() => bukaEdit(row.original)}>
                            <HiOutlinePencil className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors"
                            onClick={() => setDeleteTarget(row.original)}>
                            <HiOutlineTrash className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3>Supplier</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Master toko/supplier tempat pembelian sparepart</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={bukaTambah}>
                    Tambah Supplier
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input className="flex-1 min-w-60" placeholder="Cari nama supplier... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer" onClick={() => { setSearchInput(''); setSearch(''); setCurrentPage(1) }} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer" onClick={() => { setSearch(searchInput); setCurrentPage(1) }} />}
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setCurrentPage(1) } }} />
                </div>
                <DataTable columns={columns} data={list as unknown[]} loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }} />
            </Card>

            <Dialog isOpen={formOpen} onClose={() => setFormOpen(false)} onRequestClose={() => setFormOpen(false)}>
                <h5 className="mb-4">{editTarget ? 'Edit Supplier' : 'Tambah Supplier'}</h5>
                <form onSubmit={handleSubmit}>
                    <FormItem label="Nama Supplier" asterisk invalid={!!errNama} errorMessage={errNama}>
                        <Input value={form.nama} placeholder="Nama toko/supplier"
                            onChange={e => { setForm({ ...form, nama: e.target.value }); setErrNama('') }} />
                    </FormItem>
                    <FormItem label="Telepon">
                        <Input value={form.telepon} placeholder="08xxxxxxxxxx"
                            onChange={e => setForm({ ...form, telepon: e.target.value })} />
                    </FormItem>
                    <FormItem label="Alamat">
                        <Input textArea rows={2} value={form.alamat} placeholder="Alamat supplier (opsional)"
                            onChange={e => setForm({ ...form, alamat: e.target.value })} />
                    </FormItem>
                    <FormItem label="Aktif">
                        <Switcher checked={form.aktif} onChange={checked => setForm({ ...form, aktif: checked })} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={submitting}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Supplier"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus supplier {deleteTarget?.nama}?</p>
            </ConfirmDialog>
        </div>
    )
}
