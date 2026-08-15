'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Button, Input, Select, Tag, Tooltip, Dialog, FormItem, toast, Notification } from '@/components/ui'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { approvalKeuanganService, ApproverKeuangan } from '@/services/approvalKeuangan.service'
import { jabatanService } from '@/services/jabatan.service'
import { penggunaService } from '@/services/pengguna.service'

type Opsi = { value: string; label: string }

const TIPE_OPTIONS: Opsi[] = [
    { value: 'jabatan', label: 'Jabatan' },
    { value: 'pengguna', label: 'Pengguna' },
]

const FORM_KOSONG = { tipe: 'jabatan' as 'jabatan' | 'pengguna', id_jabatan: '', id_pengguna: '' }

export default function ApprovalKeuanganPage() {
    const [list, setList] = useState<ApproverKeuangan[]>([])
    const [loading, setLoading] = useState(false)

    const [batasInput, setBatasInput] = useState('0')
    const [loadingBatas, setLoadingBatas] = useState(false)
    const [savingBatas, setSavingBatas] = useState(false)

    const [jabatanOptions, setJabatanOptions] = useState<Opsi[]>([])
    const [penggunaOptions, setPenggunaOptions] = useState<Opsi[]>([])

    const [formOpen, setFormOpen] = useState(false)
    const [form, setForm] = useState(FORM_KOSONG)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    const [hapusTarget, setHapusTarget] = useState<ApproverKeuangan | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchList = useCallback(async () => {
        setLoading(true)
        try {
            const data = await approvalKeuanganService.list()
            setList(data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchBatas = useCallback(async () => {
        setLoadingBatas(true)
        try {
            const batas = await approvalKeuanganService.getBatas()
            setBatasInput(String(batas))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoadingBatas(false)
        }
    }, [])

    useEffect(() => {
        fetchList()
        fetchBatas()
        Promise.all([
            jabatanService.list(1, 999),
            penggunaService.list(1, 999, undefined, '1'),
        ]).then(([jRes, pRes]) => {
            setJabatanOptions(jRes.data.map(j => ({ value: j.id_jabatan, label: j.nama_jabatan })))
            setPenggunaOptions(pRes.data.map(p => ({ value: p.id_pengguna, label: p.username })))
        }).catch(err => {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        })
    }, [fetchList, fetchBatas])

    const handleSimpanBatas = async () => {
        setSavingBatas(true)
        try {
            const nilai = Number(batasInput) || 0
            await approvalKeuanganService.setBatas(nilai)
            toast.push(<Notification type="success" title="Batas approval berhasil disimpan" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingBatas(false)
        }
    }

    const bukaTambah = () => { setForm(FORM_KOSONG); setErrors({}); setFormOpen(true) }

    const validate = () => {
        const e: Record<string, string> = {}
        if (form.tipe === 'jabatan' && !form.id_jabatan) e.id_jabatan = 'Jabatan wajib dipilih'
        if (form.tipe === 'pengguna' && !form.id_pengguna) e.id_pengguna = 'Pengguna wajib dipilih'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setSaving(true)
        try {
            await approvalKeuanganService.tambah({
                tipe: form.tipe,
                id_jabatan: form.tipe === 'jabatan' ? form.id_jabatan : undefined,
                id_pengguna: form.tipe === 'pengguna' ? form.id_pengguna : undefined,
            })
            toast.push(<Notification type="success" title="Approver berhasil ditambahkan" />)
            setFormOpen(false)
            fetchList()
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
            await approvalKeuanganService.hapus(hapusTarget.id_approver)
            toast.push(<Notification type="success" title="Approver berhasil dihapus" />)
            setHapusTarget(null)
            fetchList()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeleting(false)
        }
    }

    const columns: ColumnDef<ApproverKeuangan>[] = [
        { header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<ApproverKeuangan, unknown>) => row.index + 1 },
        { header: 'Tipe', accessorKey: 'tipe', size: 140,
            cell: ({ row }: CellContext<ApproverKeuangan, unknown>) => (
                <Tag className={row.original.tipe === 'jabatan'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100'
                    : 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100'}>
                    {row.original.tipe === 'jabatan' ? 'Jabatan' : 'Pengguna'}
                </Tag>
            ),
        },
        { header: 'Nama', accessorKey: 'nama',
            cell: ({ row }: CellContext<ApproverKeuangan, unknown>) => (
                <span className="font-medium">{row.original.nama}</span>
            ),
        },
        { header: '', id: 'aksi', size: 90,
            cell: ({ row }: CellContext<ApproverKeuangan, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Hapus">
                        <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Approval Keuangan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Atur batas nominal & daftar approver pengajuan pengeluaran arus kas</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={bukaTambah}>
                    Tambah Approver
                </Button>
            </div>

            <Card header={{ content: 'Batas Nominal Approval' }}>
                <form onSubmit={e => { e.preventDefault(); handleSimpanBatas() }}>
                    <div className="flex flex-wrap items-end gap-3">
                        <FormItem label="Batas Nominal" className="mb-0 w-full sm:w-64"
                            extra={<span className="text-xs text-gray-400">0 = semua pengajuan wajib approval BOD</span>}>
                            <Input prefix="Rp" placeholder="0" value={batasInput ? formatNum(Number(batasInput)) : ''}
                                disabled={loadingBatas}
                                onChange={e => setBatasInput(e.target.value.replace(/\D/g, ''))} />
                        </FormItem>
                        <Button type="submit" variant="solid" loading={savingBatas} disabled={loadingBatas}>Simpan</Button>
                    </div>
                </form>
            </Card>

            <Card bodyClass="p-0">
                <div className="px-4 py-3">
                    <h5 className="font-semibold">Daftar Approver</h5>
                </div>
                <DataTable columns={columns} data={list as unknown[]} loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total: list.length, pageIndex: 1, pageSize: Math.max(list.length, 10) }} />
            </Card>

            <Dialog isOpen={formOpen} onRequestClose={() => setFormOpen(false)} onClose={() => setFormOpen(false)} width={440}>
                <h5 className="font-bold mb-4">Tambah Approver</h5>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                    <FormItem label="Tipe Approver" asterisk>
                        <Select isSearchable={false} options={TIPE_OPTIONS}
                            value={TIPE_OPTIONS.find(o => o.value === form.tipe) ?? null}
                            onChange={opt => setForm(p => ({ ...p, tipe: (opt?.value as 'jabatan' | 'pengguna') ?? 'jabatan', id_jabatan: '', id_pengguna: '' }))} />
                    </FormItem>
                    {form.tipe === 'jabatan' ? (
                        <FormItem label="Jabatan" asterisk invalid={!!errors.id_jabatan} errorMessage={errors.id_jabatan}>
                            <Select isClearable isSearchable placeholder="Pilih jabatan..."
                                options={jabatanOptions}
                                value={jabatanOptions.find(o => o.value === form.id_jabatan) ?? null}
                                onChange={opt => setForm(p => ({ ...p, id_jabatan: opt?.value ?? '' }))} />
                        </FormItem>
                    ) : (
                        <FormItem label="Pengguna" asterisk invalid={!!errors.id_pengguna} errorMessage={errors.id_pengguna}>
                            <Select isClearable isSearchable placeholder="Pilih pengguna..."
                                options={penggunaOptions}
                                value={penggunaOptions.find(o => o.value === form.id_pengguna) ?? null}
                                onChange={opt => setForm(p => ({ ...p, id_pengguna: opt?.value ?? '' }))} />
                        </FormItem>
                    )}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={!!hapusTarget} type="danger" title="Hapus Approver"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: deleting }}
                onClose={() => setHapusTarget(null)} onCancel={() => setHapusTarget(null)} onConfirm={handleHapus}>
                <p>Hapus approver <span className="font-semibold">&ldquo;{hapusTarget?.nama}&rdquo;</span>?</p>
            </ConfirmDialog>
        </div>
    )
}
