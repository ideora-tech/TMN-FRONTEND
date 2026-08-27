'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Button, Input, Select, Tag, Tooltip, Dialog, FormItem, toast, Notification } from '@/components/ui'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineTrash, HiOutlinePencilAlt, HiOutlineBan, HiOutlineCheckCircle } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { approvalService, ApprovalEventType, ApprovalConfigApprover } from '@/services/approval.service'
import { approvalKeuanganService } from '@/services/approvalKeuangan.service'
import { jabatanService } from '@/services/jabatan.service'
import { penggunaService } from '@/services/pengguna.service'

type Opsi = { value: string; label: string }

const TIPE_OPTIONS: Opsi[] = [
    { value: 'jabatan', label: 'Jabatan' },
    { value: 'pengguna', label: 'Pengguna' },
]

type FormApprover = { tipe: 'jabatan' | 'pengguna'; id_jabatan: string[]; id_pengguna: string[] }
const FORM_KOSONG: FormApprover = { tipe: 'jabatan', id_jabatan: [], id_pengguna: [] }

const labelEventType = (e: ApprovalEventType) => (e.aktif ? e.nama : `${e.nama} (nonaktif)`)

export default function KonfigurasiApprovalPage() {
    const [eventTypes, setEventTypes] = useState<ApprovalEventType[]>([])
    const [eventTypeTerpilih, setEventTypeTerpilih] = useState<ApprovalEventType | null>(null)
    const [formEventTypeOpen, setFormEventTypeOpen] = useState(false)
    const [eventTypeForm, setEventTypeForm] = useState({ kode: '', nama: '', mode_resolusi: 'pinned' as 'pinned' | 'relatif' })
    const [eventTypeErrors, setEventTypeErrors] = useState<Record<string, string>>({})
    const [savingEventType, setSavingEventType] = useState(false)

    const [eventTypeEditOpen, setEventTypeEditOpen] = useState(false)
    const [eventTypeEditForm, setEventTypeEditForm] = useState({ nama: '', mode_resolusi: 'pinned' as 'pinned' | 'relatif' })
    const [eventTypeEditErrors, setEventTypeEditErrors] = useState<Record<string, string>>({})
    const [savingEventTypeEdit, setSavingEventTypeEdit] = useState(false)

    const [toggleAktifOpen, setToggleAktifOpen] = useState(false)
    const [togglingAktif, setTogglingAktif] = useState(false)

    const [hapusEventTypeOpen, setHapusEventTypeOpen] = useState(false)
    const [deletingEventType, setDeletingEventType] = useState(false)
    const [list, setList] = useState<ApprovalConfigApprover[]>([])
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

    const [hapusTarget, setHapusTarget] = useState<ApprovalConfigApprover | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchList = useCallback(async (idEventType: string) => {
        setLoading(true)
        try {
            const data = await approvalService.listConfigApprover(idEventType)
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

    const bukaTambahEventType = () => {
        setEventTypeForm({ kode: '', nama: '', mode_resolusi: 'pinned' })
        setEventTypeErrors({})
        setFormEventTypeOpen(true)
    }

    const handleSubmitEventType = async () => {
        const e: Record<string, string> = {}
        if (!eventTypeForm.kode.trim()) e.kode = 'Kode wajib diisi'
        if (!/^[a-z_]+$/.test(eventTypeForm.kode.trim())) e.kode = 'Kode hanya boleh huruf kecil dan underscore (contoh: penawaran)'
        if (!eventTypeForm.nama.trim()) e.nama = 'Nama wajib diisi'
        setEventTypeErrors(e)
        if (Object.keys(e).length > 0) return

        setSavingEventType(true)
        try {
            const created = await approvalService.createEventType({
                kode: eventTypeForm.kode.trim(),
                nama: eventTypeForm.nama.trim(),
                mode_resolusi: eventTypeForm.mode_resolusi,
            })
            toast.push(<Notification type="success" title="Jenis pengajuan berhasil dibuat" />)
            setFormEventTypeOpen(false)
            const data = await approvalService.listEventType()
            setEventTypes(data)
            setEventTypeTerpilih(created)
            fetchList(created.id_event_type)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingEventType(false)
        }
    }

    const bukaEditEventType = () => {
        if (!eventTypeTerpilih) return
        setEventTypeEditForm({ nama: eventTypeTerpilih.nama, mode_resolusi: eventTypeTerpilih.mode_resolusi })
        setEventTypeEditErrors({})
        setEventTypeEditOpen(true)
    }

    const handleSubmitEditEventType = async () => {
        if (!eventTypeTerpilih) return
        const e: Record<string, string> = {}
        if (!eventTypeEditForm.nama.trim()) e.nama = 'Nama wajib diisi'
        setEventTypeEditErrors(e)
        if (Object.keys(e).length > 0) return

        const idEventType = eventTypeTerpilih.id_event_type
        setSavingEventTypeEdit(true)
        try {
            await approvalService.updateEventType(idEventType, {
                nama: eventTypeEditForm.nama.trim(),
                mode_resolusi: eventTypeEditForm.mode_resolusi,
            })
            toast.push(<Notification type="success" title="Jenis pengajuan berhasil diperbarui" />)
            setEventTypeEditOpen(false)
            const data = await approvalService.listEventType()
            setEventTypes(data)
            setEventTypeTerpilih(data.find(e2 => e2.id_event_type === idEventType) ?? null)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingEventTypeEdit(false)
        }
    }

    const handleToggleAktifEventType = async () => {
        if (!eventTypeTerpilih) return
        const idEventType = eventTypeTerpilih.id_event_type
        const aktifBaru = !eventTypeTerpilih.aktif
        setTogglingAktif(true)
        try {
            await approvalService.updateEventType(idEventType, { aktif: aktifBaru })
            toast.push(<Notification type="success" title={aktifBaru ? 'Jenis pengajuan diaktifkan kembali' : 'Jenis pengajuan dinonaktifkan'} />)
            setToggleAktifOpen(false)
            const data = await approvalService.listEventType()
            setEventTypes(data)
            setEventTypeTerpilih(data.find(e2 => e2.id_event_type === idEventType) ?? null)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setTogglingAktif(false)
        }
    }

    const handleHapusEventType = async () => {
        if (!eventTypeTerpilih) return
        setDeletingEventType(true)
        try {
            await approvalService.deleteEventType(eventTypeTerpilih.id_event_type)
            toast.push(<Notification type="success" title="Jenis pengajuan berhasil dihapus" />)
            setHapusEventTypeOpen(false)
            setEventTypeTerpilih(null)
            setList([])
            const data = await approvalService.listEventType()
            setEventTypes(data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeletingEventType(false)
        }
    }

    useEffect(() => {
        approvalService.listEventType().then(data => {
            setEventTypes(data)
            if (data.length > 0) {
                setEventTypeTerpilih(data[0])
                fetchList(data[0].id_event_type)
            }
        }).catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))

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
        if (form.tipe === 'jabatan' && form.id_jabatan.length === 0) e.id_jabatan = 'Pilih minimal 1 jabatan'
        if (form.tipe === 'pengguna' && form.id_pengguna.length === 0) e.id_pengguna = 'Pilih minimal 1 pengguna'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate() || !eventTypeTerpilih) return
        setSaving(true)
        const idList = form.tipe === 'jabatan' ? form.id_jabatan : form.id_pengguna
        let sukses = 0
        let gagal = 0
        for (const id of idList) {
            try {
                await approvalService.tambahConfigApprover(eventTypeTerpilih.id_event_type, {
                    tipe: form.tipe,
                    id_jabatan: form.tipe === 'jabatan' ? id : undefined,
                    id_pengguna: form.tipe === 'pengguna' ? id : undefined,
                })
                sukses += 1
            } catch (err) {
                gagal += 1
                console.error('Gagal menambahkan approver:', parseApiError(err))
            }
        }
        setSaving(false)
        setFormOpen(false)
        fetchList(eventTypeTerpilih.id_event_type)
        if (gagal === 0) {
            toast.push(<Notification type="success" title={`${sukses} approver berhasil ditambahkan`} />)
        } else {
            toast.push(<Notification type={sukses > 0 ? 'warning' : 'danger'} title={`${sukses} berhasil, ${gagal} gagal ditambahkan`} />)
        }
    }

    const handleHapus = async () => {
        if (!hapusTarget || !eventTypeTerpilih) return
        setDeleting(true)
        try {
            await approvalService.hapusConfigApprover(eventTypeTerpilih.id_event_type, hapusTarget.id_config)
            toast.push(<Notification type="success" title="Approver berhasil dihapus" />)
            setHapusTarget(null)
            fetchList(eventTypeTerpilih.id_event_type)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeleting(false)
        }
    }

    const columns: ColumnDef<ApprovalConfigApprover>[] = [
        { header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<ApprovalConfigApprover, unknown>) => row.index + 1 },
        { header: 'Tipe', accessorKey: 'tipe', size: 140,
            cell: ({ row }: CellContext<ApprovalConfigApprover, unknown>) => (
                <Tag className={row.original.tipe === 'jabatan'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100'
                    : 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100'}>
                    {row.original.tipe === 'jabatan' ? 'Jabatan' : 'Pengguna'}
                </Tag>
            ),
        },
        { header: 'Nama', accessorKey: 'nama',
            cell: ({ row }: CellContext<ApprovalConfigApprover, unknown>) => (
                <span className="font-medium">{row.original.nama ?? '—'}</span>
            ),
        },
        { header: '', id: 'aksi', size: 90,
            cell: ({ row }: CellContext<ApprovalConfigApprover, unknown>) => (
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
                    <h3 className="font-bold">Konfigurasi Approval</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Atur batas nominal & daftar approver per jenis pengajuan</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={bukaTambah} disabled={!eventTypeTerpilih}>
                    Tambah Approver
                </Button>
            </div>

            <Card header={{ content: 'Jenis Pengajuan' }}>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-full sm:w-72">
                        <Select isSearchable={false}
                            options={eventTypes.map(e => ({ value: e.id_event_type, label: labelEventType(e) }))}
                            value={eventTypeTerpilih ? { value: eventTypeTerpilih.id_event_type, label: labelEventType(eventTypeTerpilih) } : null}
                            onChange={opt => {
                                const found = eventTypes.find(e => e.id_event_type === opt?.value) ?? null
                                setEventTypeTerpilih(found)
                                if (found) fetchList(found.id_event_type)
                            }} />
                    </div>
                    <Button size="sm" variant="default" icon={<HiPlusCircle />} onClick={bukaTambahEventType}>
                        Tambah Jenis Pengajuan
                    </Button>
                    <Button size="sm" variant="default" icon={<HiOutlinePencilAlt />}
                        disabled={!eventTypeTerpilih} onClick={bukaEditEventType}>
                        Edit
                    </Button>
                    <Button size="sm" variant="default"
                        className={eventTypeTerpilih?.aktif
                            ? 'text-amber-600 border-amber-300 hover:bg-amber-50'
                            : 'text-emerald-600 border-emerald-300 hover:bg-emerald-50'}
                        icon={eventTypeTerpilih?.aktif ? <HiOutlineBan /> : <HiOutlineCheckCircle />}
                        disabled={!eventTypeTerpilih} onClick={() => setToggleAktifOpen(true)}>
                        {eventTypeTerpilih?.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                    <Button size="sm" variant="default" className="text-red-500 border-red-300 hover:bg-red-50"
                        icon={<HiOutlineTrash />} disabled={!eventTypeTerpilih} onClick={() => setHapusEventTypeOpen(true)}>
                        Hapus
                    </Button>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                    Kode berikut dikenali otomatis oleh Pengajuan Pengeluaran (dicocokkan dengan kategori pengajuan): <span className="font-mono">sparepart, perawatan, uang_jalan, penggajian, legalitas, pembelian_aset, pembayaran_pinjaman, lainnya</span> — kalau jenisnya tidak ada/nonaktif, dipakai fallback <span className="font-mono">pengajuan_pengeluaran</span>. Jenis lain (mis. penawaran, faktur, invoice_vendor) dipakai oleh modulnya masing-masing.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Kode <span className="font-mono">persetujuan_transfer</span> adalah gerbang persetujuan transfer oleh dirut sebelum staf keuangan transfer dana — opsional; tanpa jenis ini (atau saat dinonaktifkan), pengajuan langsung siap transfer setelah diverifikasi keuangan.
                </p>
            </Card>

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
                    <h5 className="font-semibold">Daftar Approver — {eventTypeTerpilih?.nama ?? '—'}</h5>
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
                            onChange={opt => setForm(p => ({ ...p, tipe: (opt?.value as 'jabatan' | 'pengguna') ?? 'jabatan', id_jabatan: [], id_pengguna: [] }))} />
                    </FormItem>
                    {form.tipe === 'jabatan' ? (
                        <FormItem label="Jabatan" asterisk invalid={!!errors.id_jabatan} errorMessage={errors.id_jabatan}>
                            <Select<Opsi, true> isMulti isClearable isSearchable placeholder="Pilih jabatan (bisa lebih dari satu)..."
                                options={jabatanOptions}
                                value={jabatanOptions.filter(o => form.id_jabatan.includes(o.value))}
                                onChange={opts => setForm(p => ({ ...p, id_jabatan: opts ? opts.map(o => o.value) : [] }))} />
                        </FormItem>
                    ) : (
                        <FormItem label="Pengguna" asterisk invalid={!!errors.id_pengguna} errorMessage={errors.id_pengguna}>
                            <Select<Opsi, true> isMulti isClearable isSearchable placeholder="Pilih pengguna (bisa lebih dari satu)..."
                                options={penggunaOptions}
                                value={penggunaOptions.filter(o => form.id_pengguna.includes(o.value))}
                                onChange={opts => setForm(p => ({ ...p, id_pengguna: opts ? opts.map(o => o.value) : [] }))} />
                        </FormItem>
                    )}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={formEventTypeOpen} onRequestClose={() => setFormEventTypeOpen(false)} onClose={() => setFormEventTypeOpen(false)} width={440}>
                <h5 className="font-bold mb-4">Tambah Jenis Pengajuan</h5>
                <form onSubmit={e => { e.preventDefault(); handleSubmitEventType() }}>
                    <FormItem label="Kode" asterisk invalid={!!eventTypeErrors.kode} errorMessage={eventTypeErrors.kode}
                        extra={<span className="text-xs text-gray-400">Identifier teknis, huruf kecil & underscore saja — contoh: penawaran</span>}>
                        <Input value={eventTypeForm.kode}
                            onChange={e => setEventTypeForm(p => ({ ...p, kode: e.target.value.toLowerCase() }))} />
                    </FormItem>
                    <FormItem label="Nama" asterisk invalid={!!eventTypeErrors.nama} errorMessage={eventTypeErrors.nama}>
                        <Input value={eventTypeForm.nama}
                            onChange={e => setEventTypeForm(p => ({ ...p, nama: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Mode Resolusi Approver" asterisk>
                        <Select isSearchable={false}
                            options={[
                                { value: 'pinned', label: 'Pinned (jabatan/orang tetap)' },
                                { value: 'relatif', label: 'Relatif (eskalasi ke atasan pengaju)' },
                            ]}
                            value={{ value: eventTypeForm.mode_resolusi, label: eventTypeForm.mode_resolusi === 'pinned' ? 'Pinned (jabatan/orang tetap)' : 'Relatif (eskalasi ke atasan pengaju)' }}
                            onChange={opt => setEventTypeForm(p => ({ ...p, mode_resolusi: (opt?.value as 'pinned' | 'relatif') ?? 'pinned' }))} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setFormEventTypeOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={savingEventType}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={!!hapusTarget} type="danger" title="Hapus Approver"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: deleting }}
                onClose={() => setHapusTarget(null)} onCancel={() => setHapusTarget(null)} onConfirm={handleHapus}>
                <p>Hapus approver <span className="font-semibold">&ldquo;{hapusTarget?.nama ?? '—'}&rdquo;</span>?</p>
            </ConfirmDialog>

            <Dialog isOpen={eventTypeEditOpen} onRequestClose={() => setEventTypeEditOpen(false)} onClose={() => setEventTypeEditOpen(false)} width={440}>
                <h5 className="font-bold mb-4">Edit Jenis Pengajuan</h5>
                <form onSubmit={e => { e.preventDefault(); handleSubmitEditEventType() }}>
                    <FormItem label="Kode" extra={<span className="text-xs text-gray-400">Kode tidak bisa diubah</span>}>
                        <Input value={eventTypeTerpilih?.kode ?? ''} disabled />
                    </FormItem>
                    <FormItem label="Nama" asterisk invalid={!!eventTypeEditErrors.nama} errorMessage={eventTypeEditErrors.nama}>
                        <Input value={eventTypeEditForm.nama}
                            onChange={e => setEventTypeEditForm(p => ({ ...p, nama: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Mode Resolusi Approver" asterisk>
                        <Select isSearchable={false}
                            options={[
                                { value: 'pinned', label: 'Pinned (jabatan/orang tetap)' },
                                { value: 'relatif', label: 'Relatif (eskalasi ke atasan pengaju)' },
                            ]}
                            value={{ value: eventTypeEditForm.mode_resolusi, label: eventTypeEditForm.mode_resolusi === 'pinned' ? 'Pinned (jabatan/orang tetap)' : 'Relatif (eskalasi ke atasan pengaju)' }}
                            onChange={opt => setEventTypeEditForm(p => ({ ...p, mode_resolusi: (opt?.value as 'pinned' | 'relatif') ?? 'pinned' }))} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setEventTypeEditOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={savingEventTypeEdit}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={toggleAktifOpen}
                type={eventTypeTerpilih?.aktif ? 'danger' : 'info'}
                title={eventTypeTerpilih?.aktif ? 'Nonaktifkan Jenis Pengajuan' : 'Aktifkan Jenis Pengajuan'}
                confirmText={eventTypeTerpilih?.aktif ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'} cancelText="Batal"
                confirmButtonProps={{ loading: togglingAktif }}
                onClose={() => setToggleAktifOpen(false)} onCancel={() => setToggleAktifOpen(false)} onConfirm={handleToggleAktifEventType}>
                {eventTypeTerpilih?.aktif ? (
                    <p>
                        Nonaktifkan jenis pengajuan <span className="font-semibold">&ldquo;{eventTypeTerpilih?.nama}&rdquo;</span>?
                        <br />
                        <span className="text-red-500 text-sm">Modul yang memakai jenis ini tidak akan bisa mengajukan approval selama nonaktif.</span>
                    </p>
                ) : (
                    <p>Aktifkan kembali jenis pengajuan <span className="font-semibold">&ldquo;{eventTypeTerpilih?.nama}&rdquo;</span>?</p>
                )}
            </ConfirmDialog>

            <ConfirmDialog isOpen={hapusEventTypeOpen} type="danger" title="Hapus Jenis Pengajuan"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: deletingEventType }}
                onClose={() => setHapusEventTypeOpen(false)} onCancel={() => setHapusEventTypeOpen(false)} onConfirm={handleHapusEventType}>
                <p>Hapus jenis pengajuan <span className="font-semibold">&ldquo;{eventTypeTerpilih?.nama}&rdquo;</span>? Tindakan ini tidak bisa dibatalkan.</p>
            </ConfirmDialog>
        </div>
    )
}
