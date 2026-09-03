'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Input, Tag, Tooltip, Dialog, Button, FormItem, Switcher, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { cutiService, JenisCuti } from '@/services/cuti.service'

const FORM_KOSONG = { id_jenis_cuti: '', nama_jenis: '', mengurangi_saldo: true, aktif: true, keterangan: '' }

export default function JenisCutiTab() {
    const [list, setList]       = useState<JenisCuti[]>([])
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    const [formOpen, setFormOpen] = useState(false)
    const [form, setForm]         = useState(FORM_KOSONG)
    const [saving, setSaving]     = useState(false)
    const [hapusTarget, setHapusTarget] = useState<JenisCuti | null>(null)
    const [deleting, setDeleting]       = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await cutiService.listJenis({ page: currentPage, limit: pageSize })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize])

    useEffect(() => { fetchData() }, [fetchData])

    const bukaTambah = () => { setForm(FORM_KOSONG); setFormOpen(true) }
    const bukaEdit = (j: JenisCuti) => {
        setForm({
            id_jenis_cuti: j.id_jenis_cuti,
            nama_jenis: j.nama_jenis,
            mengurangi_saldo: j.mengurangi_saldo,
            aktif: j.aktif,
            keterangan: j.keterangan ?? '',
        })
        setFormOpen(true)
    }

    const handleSubmit = async () => {
        if (!form.nama_jenis.trim()) return
        setSaving(true)
        try {
            const payload = {
                nama_jenis: form.nama_jenis,
                mengurangi_saldo: form.mengurangi_saldo,
                aktif: form.aktif,
                keterangan: form.keterangan || null,
            }
            if (form.id_jenis_cuti) {
                await cutiService.updateJenis(form.id_jenis_cuti, payload)
                toast.push(<Notification type="success" title="Jenis cuti diperbarui" />)
            } else {
                await cutiService.createJenis(payload)
                toast.push(<Notification type="success" title="Jenis cuti ditambahkan" />)
            }
            setFormOpen(false)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleHapus = async () => {
        if (!hapusTarget) return
        setDeleting(true)
        try {
            await cutiService.deleteJenis(hapusTarget.id_jenis_cuti)
            toast.push(<Notification type="success" title="Jenis cuti dihapus" />)
            setHapusTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setHapusTarget(null)
        } finally {
            setDeleting(false)
        }
    }

    const columns: ColumnDef<JenisCuti>[] = [
        {
            header: 'Nama Jenis', accessorKey: 'nama_jenis', size: 190,
            cell: ({ row }: CellContext<JenisCuti, unknown>) => (
                <span className="font-medium">{row.original.nama_jenis}</span>
            ),
        },
        {
            header: 'Potong Saldo', accessorKey: 'mengurangi_saldo', size: 120,
            cell: ({ row }: CellContext<JenisCuti, unknown>) => (
                <Tag className={row.original.mengurangi_saldo
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}>
                    {row.original.mengurangi_saldo ? 'Ya' : 'Tidak'}
                </Tag>
            ),
        },
        {
            header: 'Status', accessorKey: 'aktif', size: 110,
            cell: ({ row }: CellContext<JenisCuti, unknown>) => (
                <Tag className={row.original.aktif
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                    : 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100'}>
                    {row.original.aktif ? 'Aktif' : 'Nonaktif'}
                </Tag>
            ),
        },
        {
            header: 'Keterangan', accessorKey: 'keterangan', size: 240,
            cell: ({ row }: CellContext<JenisCuti, unknown>) => (
                <span className="text-xs text-gray-500 block max-w-60 truncate">{row.original.keterangan ?? '—'}</span>
            ),
        },
        {
            header: '', id: 'action', size: 90,
            cell: ({ row }: CellContext<JenisCuti, unknown>) => (
                <div className="flex items-center justify-end gap-1">
                    <Tooltip title="Edit">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => bukaEdit(row.original)}>
                            <HiOutlinePencilAlt className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                            onClick={() => setHapusTarget(row.original)}>
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
                <div className="flex items-center justify-end px-4 py-3">
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={bukaTambah}>
                        Tambah Jenis
                    </Button>
                </div>
                <DataTable
                    columns={columns}
                    data={list as unknown[]}
                    loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>

            <Dialog isOpen={formOpen} onRequestClose={() => setFormOpen(false)} onClose={() => setFormOpen(false)} width={440}>
                <h5 className="font-bold mb-4">{form.id_jenis_cuti ? 'Edit Jenis Cuti' : 'Tambah Jenis Cuti'}</h5>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                    <FormItem label="Nama Jenis" asterisk>
                        <Input placeholder="Misal: Cuti Melahirkan" value={form.nama_jenis}
                            onChange={e => setForm(p => ({ ...p, nama_jenis: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Memotong saldo cuti tahunan">
                        <Switcher checked={form.mengurangi_saldo}
                            onChange={checked => setForm(p => ({ ...p, mengurangi_saldo: checked }))} />
                    </FormItem>
                    <FormItem label="Aktif">
                        <Switcher checked={form.aktif}
                            onChange={checked => setForm(p => ({ ...p, aktif: checked }))} />
                    </FormItem>
                    <FormItem label="Keterangan">
                        <Input textArea rows={2} value={form.keterangan}
                            onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving} disabled={!form.nama_jenis.trim()}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog
                isOpen={!!hapusTarget}
                type="danger"
                title="Hapus Jenis Cuti"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => setHapusTarget(null)}
                onCancel={() => setHapusTarget(null)}
                onConfirm={handleHapus}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>Hapus jenis cuti &quot;{hapusTarget?.nama_jenis}&quot;?</p>
            </ConfirmDialog>
        </div>
    )
}
