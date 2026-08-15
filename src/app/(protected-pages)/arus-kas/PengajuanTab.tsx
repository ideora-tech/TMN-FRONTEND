'use client'
import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Card, Button, Dialog, FormItem, Input, Tag, Tooltip, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UploadBerkas from '@/components/shared/UploadBerkas'
import {
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineCash,
    HiOutlineEye,
    HiOutlinePencilAlt,
    HiOutlineTrash,
    HiOutlineExternalLink,
} from 'react-icons/hi'
import DetailPengajuanDialog from './DetailPengajuanDialog'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import { ROUTES } from '@/constants/route.constant'
import {
    arusKasService,
    KategoriPengajuan,
    PengajuanPengeluaran,
    StatusPengajuan,
} from '@/services/arusKas.service'

type Option = { value: string; label: string }

const MAX_FILE_SIZE = 5 * 1024 * 1024

const KATEGORI_LABEL: Record<KategoriPengajuan, string> = {
    uang_jalan: 'Uang Jalan',
    legalitas:  'Legalitas',
    perawatan:  'Perawatan',
    sparepart:  'Sparepart',
    penggajian: 'Penggajian',
    lainnya:    'Lainnya',
}

const KATEGORI_OPTIONS: { value: KategoriPengajuan; label: string }[] = [
    { value: 'uang_jalan', label: 'Uang Jalan' },
    { value: 'legalitas',  label: 'Legalitas' },
    { value: 'perawatan',  label: 'Perawatan' },
    { value: 'lainnya',    label: 'Lainnya' },
]

const STATUS_LABEL: Record<StatusPengajuan, string> = {
    diajukan:   'Diajukan',
    dicek:      'Dicek',
    disetujui:  'Disetujui',
    ditolak:    'Ditolak',
    ditransfer: 'Ditransfer',
}

const STATUS_TAG: Record<StatusPengajuan, string> = {
    diajukan:   'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    dicek:      'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    disetujui:  'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-100',
    ditolak:    'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
    ditransfer: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
}

const STATUS_OPTIONS: Option[] = [
    { value: '', label: 'Semua Status' },
    ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

type PengajuanForm = {
    kategori: KategoriPengajuan | ''
    nominal: string
    tanggal_pengajuan: string
    penerima: string
    keterangan: string
}

const emptyForm = (): PengajuanForm => ({
    kategori: '',
    nominal: '',
    tanggal_pengajuan: dayjs().format('YYYY-MM-DD'),
    penerima: '',
    keterangan: '',
})

export default function PengajuanTab({ tambahTrigger = 0 }: { tambahTrigger?: number }) {
    const { session } = useCurrentSession()
    const authority = ((session?.user?.authority ?? []) as string[]).map(a => a.toLowerCase())
    const punyaPeran = (...roles: string[]) => roles.some(r => authority.includes(r))
    const bolehKeuangan = punyaPeran('keuangan', 'superadmin')
    const bolehManager  = punyaPeran('manager', 'superadmin')
    const bolehKelola   = punyaPeran('admin', 'manager', 'keuangan', 'superadmin')

    const [list, setList]       = useState<PengajuanPengeluaran[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)

    const [showForm, setShowForm]     = useState(false)
    const [editTarget, setEditTarget] = useState<PengajuanPengeluaran | null>(null)
    const [form, setForm]             = useState<PengajuanForm>(emptyForm())
    const [file, setFile]             = useState<File | null>(null)

    const [transferTarget, setTransferTarget]   = useState<PengajuanPengeluaran | null>(null)
    const [tanggalTransfer, setTanggalTransfer] = useState('')
    const [buktiTransfer, setBuktiTransfer]     = useState<File | null>(null)

    const [tolakTarget, setTolakTarget] = useState<PengajuanPengeluaran | null>(null)
    const [alasan, setAlasan]           = useState('')
    const [errAlasan, setErrAlasan]     = useState('')

    const [deleteTarget, setDeleteTarget] = useState<PengajuanPengeluaran | null>(null)
    const [detailTarget, setDetailTarget] = useState<PengajuanPengeluaran | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const data = await arusKasService.listPengajuan(statusFilter ? (statusFilter as StatusPengajuan) : undefined)
            setList(data)
            setCurrentPage(1)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [statusFilter])

    useEffect(() => { fetchData() }, [fetchData])

    const jalankan = async (aksi: () => Promise<unknown>, pesanSukses: string, tutup?: () => void) => {
        setSubmitting(true)
        try {
            await aksi()
            toast.push(<Notification type="success" title={pesanSukses} />)
            tutup?.()
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const openAdd = useCallback(() => { setForm(emptyForm()); setFile(null); setShowForm(true) }, [])

    useEffect(() => {
        if (tambahTrigger > 0) openAdd()
    }, [tambahTrigger, openAdd])

    const openEdit = (p: PengajuanPengeluaran) => {
        setEditTarget(p)
        setForm({
            kategori: p.kategori,
            nominal: String(p.nominal),
            tanggal_pengajuan: p.tanggal_pengajuan,
            penerima: p.penerima,
            keterangan: p.keterangan ?? '',
        })
        setFile(null)
    }

    const closeForm = () => { setShowForm(false); setEditTarget(null) }

    const handleSubmitForm = () => {
        if (!form.kategori || !form.nominal || !form.tanggal_pengajuan || !form.penerima.trim()) return
        const payload = {
            kategori: form.kategori as KategoriPengajuan,
            nominal: Number(form.nominal),
            tanggal_pengajuan: form.tanggal_pengajuan,
            penerima: form.penerima.trim(),
            keterangan: form.keterangan.trim() || null,
        }
        if (editTarget) {
            jalankan(() => arusKasService.updatePengajuan(editTarget.id_pengajuan, payload, file), 'Pengajuan berhasil diperbarui', closeForm)
        } else {
            jalankan(() => arusKasService.createPengajuan(payload, file), 'Pengajuan berhasil dibuat', closeForm)
        }
    }

    const openTransfer = (p: PengajuanPengeluaran) => {
        setTransferTarget(p)
        setTanggalTransfer(dayjs().format('YYYY-MM-DD'))
        setBuktiTransfer(null)
    }

    const handleTransfer = () => {
        if (!transferTarget || !tanggalTransfer) return
        jalankan(
            () => arusKasService.transfer(transferTarget.id_pengajuan, tanggalTransfer, buktiTransfer),
            'Pengajuan berhasil ditransfer',
            () => setTransferTarget(null),
        )
    }

    const openTolak = (p: PengajuanPengeluaran) => { setTolakTarget(p); setAlasan(''); setErrAlasan('') }

    const handleTolak = () => {
        if (!tolakTarget) return
        if (!alasan.trim()) { setErrAlasan('Alasan penolakan wajib diisi'); return }
        jalankan(
            () => arusKasService.tolak(tolakTarget.id_pengajuan, alasan.trim()),
            'Pengajuan ditolak',
            () => setTolakTarget(null),
        )
    }

    const handleDelete = () => {
        if (!deleteTarget) return
        jalankan(() => arusKasService.deletePengajuan(deleteTarget.id_pengajuan), 'Pengajuan berhasil dihapus', () => setDeleteTarget(null))
    }

    const validasiFile = (f: File | null, set: (f: File | null) => void) => {
        if (f && f.size > MAX_FILE_SIZE) {
            toast.push(<Notification type="danger" title={`Ukuran file maksimal 5 MB (file dipilih: ${(f.size / 1024 / 1024).toFixed(1)} MB)`} />)
            return
        }
        set(f)
    }

    const isFormOpen = showForm || editTarget !== null
    const editOtomatis = !!(editTarget && (editTarget.id_trip || editTarget.id_perawatan || editTarget.id_pembelian || editTarget.id_periode))
    const kategoriFormOptions = editOtomatis && form.kategori
        ? [{ value: form.kategori, label: KATEGORI_LABEL[form.kategori] }]
        : KATEGORI_OPTIONS
    const pagedList = list.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const columns: ColumnDef<PengajuanPengeluaran>[] = [
        {
            header: 'No', id: 'no', size: 50,
            cell: ({ row }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Nomor', accessorKey: 'nomor_pengajuan', size: 160,
            cell: ({ row }) => {
                const p = row.original
                return (
                    <div className="flex flex-col gap-1">
                        <span className="font-mono font-semibold text-xs">{p.nomor_pengajuan}</span>
                        {p.id_trip && (
                            <a href={ROUTES.TRIP_DETAIL(p.id_trip)} target="_blank" rel="noreferrer"
                                className="w-fit">
                                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 cursor-pointer hover:opacity-80">
                                    Dari Trip <HiOutlineExternalLink className="text-xs" />
                                </Tag>
                            </a>
                        )}
                        {p.id_perawatan && (
                            <a href={p.id_armada_perawatan
                                ? `${ROUTES.PERAWATAN_ARMADA}?armada=${p.id_armada_perawatan}&detail=${p.id_perawatan}`
                                : ROUTES.PERAWATAN_ARMADA} target="_blank" rel="noreferrer"
                                className="w-fit">
                                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300 cursor-pointer hover:opacity-80">
                                    Dari Perawatan <HiOutlineExternalLink className="text-xs" />
                                </Tag>
                            </a>
                        )}
                        {p.id_pembelian && (
                            <a href={ROUTES.PEMBELIAN_SPAREPART_DETAIL(p.id_pembelian)} target="_blank" rel="noreferrer"
                                className="w-fit">
                                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-lime-100 text-lime-600 dark:bg-lime-500/20 dark:text-lime-300 cursor-pointer hover:opacity-80">
                                    Dari Pembelian <HiOutlineExternalLink className="text-xs" />
                                </Tag>
                            </a>
                        )}
                        {p.id_periode && (
                            <a href={ROUTES.PAYROLL_DETAIL(p.id_periode)} target="_blank" rel="noreferrer"
                                className="w-fit">
                                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 cursor-pointer hover:opacity-80">
                                    Dari Payroll <HiOutlineExternalLink className="text-xs" />
                                </Tag>
                            </a>
                        )}
                    </div>
                )
            },
        },
        {
            header: 'Kategori', accessorKey: 'kategori', size: 120,
            cell: ({ row }) => KATEGORI_LABEL[row.original.kategori] ?? row.original.kategori,
        },
        {
            header: 'Tanggal', accessorKey: 'tanggal_pengajuan', size: 120,
            cell: ({ row }) => dayjs(row.original.tanggal_pengajuan).format('DD MMM YYYY'),
        },
        {
            header: 'Penerima', accessorKey: 'penerima', size: 160,
        },
        {
            header: 'Nominal', accessorKey: 'nominal', size: 140,
            cell: ({ row }) => <span className="tabular-nums font-semibold">{formatRupiah(row.original.nominal)}</span>,
        },
        {
            header: 'Status', id: 'status', size: 130,
            cell: ({ row }) => {
                const p = row.original
                const tag = <Tag className={`text-xs font-semibold ${STATUS_TAG[p.status]}`}>{STATUS_LABEL[p.status]}</Tag>
                return p.status === 'ditolak' && p.alasan_ditolak ? <Tooltip title={p.alasan_ditolak}>{tag}</Tooltip> : tag
            },
        },
        {
            header: '', id: 'aksi', size: 220,
            cell: ({ row }) => {
                const p = row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Lihat Detail">
                            <span
                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                onClick={() => setDetailTarget(p)}>
                                <HiOutlineEye className="text-lg" />
                            </span>
                        </Tooltip>
                        {p.status === 'diajukan' && bolehKeuangan && (
                            <Tooltip title="Cek">
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                    onClick={() => jalankan(() => arusKasService.cek(p.id_pengajuan), 'Pengajuan ditandai sudah dicek')}>
                                    <HiOutlineCheckCircle className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {p.status === 'dicek' && bolehManager && (
                            <Tooltip title="Setujui">
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors"
                                    onClick={() => jalankan(() => arusKasService.setujui(p.id_pengajuan), 'Pengajuan disetujui')}>
                                    <HiOutlineCheckCircle className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {(p.status === 'diajukan' || p.status === 'dicek') && bolehManager && (
                            <Tooltip title="Tolak">
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                    onClick={() => openTolak(p)}>
                                    <HiOutlineXCircle className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {p.status === 'disetujui' && bolehKeuangan && (
                            <Tooltip title="Transfer">
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 transition-colors"
                                    onClick={() => openTransfer(p)}>
                                    <HiOutlineCash className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {p.status === 'diajukan' && bolehKelola && (
                            <>
                                <Tooltip title="Edit">
                                    <span
                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                        onClick={() => openEdit(p)}>
                                        <HiOutlinePencilAlt className="text-lg" />
                                    </span>
                                </Tooltip>
                                <Tooltip title="Hapus">
                                    <span
                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                        onClick={() => setDeleteTarget(p)}>
                                        <HiOutlineTrash className="text-lg" />
                                    </span>
                                </Tooltip>
                            </>
                        )}
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                    <div className="w-full sm:w-48 shrink-0">
                        <Select
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={opt => setStatusFilter((opt as Option | null)?.value ?? '')}
                        />
                    </div>
                    {loading && <Spinner size={20} />}
                </div>
                <DataTable
                    columns={columns}
                    data={pagedList as unknown[]}
                    loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total: list.length, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>

            <Dialog isOpen={isFormOpen} onRequestClose={closeForm} onClose={closeForm} width={640}>
                <h5 className="text-base font-semibold mb-5">{editTarget ? 'Edit Pengajuan' : 'Tambah Pengajuan'}</h5>
                <form onSubmit={e => { e.preventDefault(); handleSubmitForm() }}>
                    <div className="max-h-[65vh] overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                            <FormItem label="Kategori" asterisk>
                                <Select
                                    isSearchable={false}
                                    isDisabled={editOtomatis}
                                    placeholder="Pilih kategori..."
                                    options={kategoriFormOptions}
                                    value={kategoriFormOptions.find(o => o.value === form.kategori) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, kategori: ((opt as { value: KategoriPengajuan } | null)?.value) ?? '' }))}
                                />
                                {editOtomatis && (
                                    <p className="text-xs text-gray-400 mt-1">Kategori pengajuan otomatis tidak dapat diubah</p>
                                )}
                            </FormItem>
                            <FormItem label="Nominal" asterisk>
                                <Input prefix="Rp" placeholder="0"
                                    value={form.nominal ? formatNum(Number(form.nominal)) : ''}
                                    onChange={e => setForm(p => ({ ...p, nominal: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Tanggal Pengajuan" asterisk>
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={form.tanggal_pengajuan ? dayjs(form.tanggal_pengajuan).toDate() : null}
                                    onChange={date => setForm(p => ({ ...p, tanggal_pengajuan: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="Penerima" asterisk>
                                <Input placeholder="Nama penerima dana" value={form.penerima}
                                    onChange={e => setForm(p => ({ ...p, penerima: e.target.value }))} />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Keterangan (opsional)">
                                    <Input textArea rows={3} placeholder="Catatan tambahan..." value={form.keterangan}
                                        onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                                </FormItem>
                            </div>
                            <div className="sm:col-span-2">
                                <FormItem label="Bukti (opsional)">
                                    <UploadBerkas
                                        file={file}
                                        label={editTarget ? 'Ganti file (opsional)' : 'Pilih file'}
                                        existingUrl={editTarget?.url_bukti ?? null}
                                        existingLabel="Bukti saat ini"
                                        emptyText={editTarget ? 'Belum ada bukti tersimpan' : null}
                                        onChange={f => validasiFile(f, setFile)}
                                    />
                                </FormItem>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={closeForm}>Batal</Button>
                        <Button type="submit" variant="solid" loading={submitting}
                            disabled={!form.kategori || !form.nominal || !form.tanggal_pengajuan || !form.penerima.trim()}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={!!transferTarget} onRequestClose={() => setTransferTarget(null)} onClose={() => setTransferTarget(null)} width={520}>
                <h5 className="text-base font-semibold mb-5">Transfer Pengajuan</h5>
                <form onSubmit={e => { e.preventDefault(); handleTransfer() }}>
                    {transferTarget?.id_pembelian && (
                        <p className="text-xs text-gray-400 mb-4">
                            Transfer sebelum realisasi = uang muka sebesar nominal saat ini; selisih dengan nota dicatat di detail pembelian.
                        </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                        <FormItem label="Tanggal Transfer" asterisk>
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={tanggalTransfer ? dayjs(tanggalTransfer).toDate() : null}
                                onChange={date => setTanggalTransfer(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        </FormItem>
                        <FormItem label="Bukti Transfer (opsional)">
                            <UploadBerkas
                                file={buktiTransfer}
                                onChange={f => validasiFile(f, setBuktiTransfer)}
                            />
                        </FormItem>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setTransferTarget(null)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={submitting} disabled={!tanggalTransfer}>Transfer</Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={!!tolakTarget} onRequestClose={() => setTolakTarget(null)} onClose={() => setTolakTarget(null)} width={420}>
                <h5 className="text-base font-semibold mb-5">Tolak Pengajuan</h5>
                <form onSubmit={e => { e.preventDefault(); handleTolak() }}>
                    <FormItem label="Alasan Penolakan" asterisk invalid={!!errAlasan} errorMessage={errAlasan}>
                        <Input textArea rows={3} placeholder="Jelaskan alasan penolakan..."
                            value={alasan} onChange={e => { setAlasan(e.target.value); setErrAlasan('') }} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setTolakTarget(null)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={submitting}>Tolak Pengajuan</Button>
                    </div>
                </form>
            </Dialog>

            <DetailPengajuanDialog pengajuan={detailTarget} onClose={() => setDetailTarget(null)} />

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Pengajuan"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus pengajuan {deleteTarget?.nomor_pengajuan}? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>
        </div>
    )
}
