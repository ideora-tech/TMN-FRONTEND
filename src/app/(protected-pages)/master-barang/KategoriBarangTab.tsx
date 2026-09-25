'use client'
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Dialog, FormItem, Input, Tag, Tooltip, Switcher, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { barangService, type KategoriBarang } from '@/services/barang.service'

type FormState = { nama: string; keterangan: string; aktif: boolean }
const FORM_KOSONG: FormState = { nama: '', keterangan: '', aktif: true }

export default function KategoriBarangTab() {
    const [list, setList] = useState<KategoriBarang[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<KategoriBarang | null>(null)
    const [form, setForm] = useState<FormState>(FORM_KOSONG)
    const [errNama, setErrNama] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<KategoriBarang | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            setList(await barangService.listKategori())
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const bukaTambah = () => { setEditTarget(null); setForm(FORM_KOSONG); setErrNama(''); setFormOpen(true) }
    const bukaEdit = (k: KategoriBarang) => {
        setEditTarget(k)
        setForm({ nama: k.nama, keterangan: k.keterangan ?? '', aktif: k.aktif })
        setErrNama(''); setFormOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.nama.trim()) { setErrNama('Nama kategori wajib diisi'); return }
        setSubmitting(true)
        try {
            const payload = {
                nama: form.nama.trim(),
                keterangan: form.keterangan.trim() || null,
                aktif: form.aktif,
            }
            if (editTarget) await barangService.updateKategori(editTarget.id_kategori_barang, payload)
            else await barangService.createKategori(payload)
            toast.push(<Notification type="success" title={editTarget ? 'Kategori diperbarui' : 'Kategori ditambahkan'} />)
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
            await barangService.removeKategori(deleteTarget.id_kategori_barang)
            toast.push(<Notification type="success" title="Kategori dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<KategoriBarang>[] = [
        { header: 'No', id: 'no', size: 60, cell: p => p.row.index + 1 },
        { header: 'Nama', accessorKey: 'nama', cell: ({ row }) => <span className="font-semibold">{row.original.nama}</span> },
        { header: 'Keterangan', accessorKey: 'keterangan', cell: ({ row }) => row.original.keterangan ?? <span className="text-gray-400">—</span> },
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
                            <HiOutlinePencilAlt className="text-lg" />
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
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <p className="text-sm text-gray-500">Kategori untuk mengelompokkan barang umum (ATK, perlengkapan, kebersihan, dll)</p>
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={bukaTambah}>
                        Tambah Kategori
                    </Button>
                </div>
                <DataTable columns={columns} data={list as unknown[]} loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total: list.length, pageIndex: 1, pageSize: Math.max(list.length, 10) }} />
            </Card>

            <Dialog isOpen={formOpen} onClose={() => setFormOpen(false)} onRequestClose={() => setFormOpen(false)}>
                <h5 className="mb-4">{editTarget ? 'Edit Kategori' : 'Tambah Kategori'}</h5>
                <form onSubmit={handleSubmit}>
                    <FormItem label="Nama Kategori" asterisk invalid={!!errNama} errorMessage={errNama}>
                        <Input value={form.nama} placeholder="Contoh: ATK, Perlengkapan Kantor"
                            onChange={e => { setForm({ ...form, nama: e.target.value }); setErrNama('') }} />
                    </FormItem>
                    <FormItem label="Keterangan">
                        <Input textArea rows={2} value={form.keterangan} placeholder="Keterangan kategori (opsional)"
                            onChange={e => setForm({ ...form, keterangan: e.target.value })} />
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

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Kategori" confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus kategori <span className="font-semibold">{deleteTarget?.nama}</span>?</p>
            </ConfirmDialog>
        </div>
    )
}
