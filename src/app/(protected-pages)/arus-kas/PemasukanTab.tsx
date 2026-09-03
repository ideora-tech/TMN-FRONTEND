'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Card, Button, Dialog, FormItem, Input, Tag, Tooltip, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiOutlineEye, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import DetailTransaksiDialog, { DetailTransaksi } from './DetailTransaksiDialog'
import { KATEGORI_PEMASUKAN_META, INVOICE_TAG, PEMASUKAN_MANUAL_TAG } from './pemasukanMeta'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import { ROUTES } from '@/constants/route.constant'
import { arusKasService, KategoriPemasukan, PemasukanRow } from '@/services/arusKas.service'

type Option = { value: string; label: string }

const MAX_FILE_SIZE = 5 * 1024 * 1024

const KATEGORI_KEYS = Object.keys(KATEGORI_PEMASUKAN_META) as KategoriPemasukan[]

const FILTER_OPTIONS: Option[] = [
    { value: '',        label: 'Semua' },
    { value: 'invoice', label: 'Invoice' },
    ...KATEGORI_KEYS.map(value => ({ value, label: KATEGORI_PEMASUKAN_META[value].label })),
]

const KATEGORI_OPTIONS: { value: KategoriPemasukan; label: string }[] =
    KATEGORI_KEYS.map(value => ({ value, label: KATEGORI_PEMASUKAN_META[value].label }))

type PemasukanForm = {
    kategori: KategoriPemasukan | ''
    nominal: string
    tanggal: string
    sumber_dana: string
    keterangan: string
}

const emptyForm = (): PemasukanForm => ({
    kategori: '',
    nominal: '',
    tanggal: dayjs().format('YYYY-MM-DD'),
    sumber_dana: '',
    keterangan: '',
})

export default function PemasukanTab({ tambahTrigger = 0 }: { tambahTrigger?: number }) {
    const { session } = useCurrentSession()
    const authority = ((session?.user?.authority ?? []) as string[]).map(a => a.toLowerCase())
    const bolehKelola = ['keuangan', 'superadmin'].some(r => authority.includes(r))

    const [dari, setDari]     = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
    const [sampai, setSampai] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
    const [filter, setFilter] = useState('')

    const [list, setList]             = useState<PemasukanRow[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)

    const [showForm, setShowForm]     = useState(false)
    const [editTarget, setEditTarget] = useState<PemasukanRow | null>(null)
    const [form, setForm]             = useState<PemasukanForm>(emptyForm())
    const [file, setFile]             = useState<File | null>(null)

    const [deleteTarget, setDeleteTarget] = useState<PemasukanRow | null>(null)
    const [detailTarget, setDetailTarget] = useState<DetailTransaksi | null>(null)

    const reqRef = useRef(0)
    const fetchData = useCallback(async () => {
        const reqId = ++reqRef.current
        setLoading(true)
        try {
            const data = await arusKasService.listPemasukan({
                dari,
                sampai,
                jenis: filter === 'invoice' ? 'invoice' : undefined,
                kategori: filter && filter !== 'invoice' ? (filter as KategoriPemasukan) : undefined,
            })
            if (reqRef.current !== reqId) return
            setList(data)
            setCurrentPage(1)
        } catch (err) {
            if (reqRef.current !== reqId) return
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (reqRef.current === reqId) setLoading(false)
        }
    }, [dari, sampai, filter])

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

    const openAdd = useCallback(() => { setEditTarget(null); setForm(emptyForm()); setFile(null); setShowForm(true) }, [])

    useEffect(() => {
        if (tambahTrigger > 0) openAdd()
    }, [tambahTrigger, openAdd])

    const openEdit = (p: PemasukanRow) => {
        setEditTarget(p)
        setForm({
            kategori: p.kategori ?? '',
            nominal: String(p.nominal),
            tanggal: p.tanggal,
            sumber_dana: p.sumber_dana ?? '',
            keterangan: p.keterangan ?? '',
        })
        setFile(null)
        setShowForm(true)
    }

    const closeForm = () => { setShowForm(false); setEditTarget(null) }

    const validasiFile = (f: File | null) => {
        if (f && f.size > MAX_FILE_SIZE) {
            toast.push(<Notification type="danger" title={`Ukuran file maksimal 5 MB (file dipilih: ${(f.size / 1024 / 1024).toFixed(1)} MB)`} />)
            return
        }
        setFile(f)
    }

    const handleSubmitForm = () => {
        if (!form.kategori || !form.nominal || !form.tanggal || !form.sumber_dana.trim()) return
        const payload = {
            kategori: form.kategori as KategoriPemasukan,
            nominal: Number(form.nominal),
            tanggal: form.tanggal,
            sumber_dana: form.sumber_dana.trim(),
            keterangan: form.keterangan.trim() || null,
        }
        if (editTarget) {
            jalankan(() => arusKasService.updatePemasukan(editTarget.id, payload, file), 'Pemasukan berhasil diperbarui', closeForm)
        } else {
            jalankan(() => arusKasService.createPemasukan(payload, file), 'Pemasukan berhasil dicatat', closeForm)
        }
    }

    const handleDelete = () => {
        if (!deleteTarget) return
        jalankan(() => arusKasService.deletePemasukan(deleteTarget.id), 'Pemasukan berhasil dihapus').finally(() => setDeleteTarget(null))
    }

    const bukaDetail = (p: PemasukanRow) => {
        setDetailTarget({
            tanggal: p.tanggal,
            arah: 'masuk',
            sumberLabel: p.jenis === 'invoice' ? 'Invoice' : 'Pemasukan Manual',
            sumberTagClass: p.jenis === 'invoice' ? INVOICE_TAG : PEMASUKAN_MANUAL_TAG,
            kategoriLabel: p.kategori ? KATEGORI_PEMASUKAN_META[p.kategori].label : null,
            nomor: p.nomor,
            referensiHref: p.jenis === 'invoice' ? ROUTES.FAKTUR_DETAIL(p.id) : null,
            sumberDana: p.sumber_dana,
            keterangan: p.keterangan,
            nominal: p.nominal,
            url_bukti: p.url_bukti,
        })
    }

    const paged = list.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const columns: ColumnDef<PemasukanRow>[] = [
        {
            header: 'No', id: 'no', size: 50,
            cell: ({ row }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Tanggal', accessorKey: 'tanggal', size: 120,
            cell: ({ row }) => <span className="whitespace-nowrap">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>,
        },
        {
            header: 'Sumber', id: 'sumber', size: 140,
            cell: ({ row }) => {
                const p = row.original
                if (p.jenis === 'invoice') {
                    return <Tag className={`text-xs font-semibold ${INVOICE_TAG}`}>Invoice</Tag>
                }
                const km = p.kategori ? KATEGORI_PEMASUKAN_META[p.kategori] : null
                return km
                    ? <Tag className={`text-xs font-semibold ${km.tag}`}>{km.label}</Tag>
                    : <Tag className={`text-xs font-semibold ${PEMASUKAN_MANUAL_TAG}`}>Pemasukan Manual</Tag>
            },
        },
        {
            header: 'Nomor', accessorKey: 'nomor', size: 170,
            cell: ({ row }) => {
                const p = row.original
                if (p.jenis === 'invoice') {
                    return (
                        <a href={ROUTES.FAKTUR_DETAIL(p.id)} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline">{p.nomor}</a>
                    )
                }
                return <span className="font-mono font-semibold text-xs">{p.nomor}</span>
            },
        },
        {
            header: 'Sumber Dana', accessorKey: 'sumber_dana', size: 160,
            cell: ({ row }) => row.original.sumber_dana ?? '—',
        },
        {
            header: 'Keterangan', accessorKey: 'keterangan', size: 200,
            cell: ({ row }) => row.original.keterangan ?? '—',
        },
        {
            header: 'Nominal', id: 'nominal', size: 150,
            cell: ({ row }) => (
                <span className="tabular-nums font-semibold whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                    + {formatRupiah(row.original.nominal)}
                </span>
            ),
        },
        {
            header: '', id: 'aksi', size: 130,
            cell: ({ row }) => {
                const p = row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Lihat Detail">
                            <span
                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                onClick={() => bukaDetail(p)}>
                                <HiOutlineEye className="text-lg" />
                            </span>
                        </Tooltip>
                        {p.dapat_diubah && bolehKelola && (
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
                    <div className="flex items-center gap-2">
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40"
                            value={dari ? dayjs(dari).toDate() : null}
                            onChange={date => setDari(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        <span className="text-gray-400 text-sm">s/d</span>
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40"
                            value={sampai ? dayjs(sampai).toDate() : null}
                            onChange={date => setSampai(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </div>
                    <div className="w-full sm:w-48 shrink-0">
                        <Select
                            isSearchable={false}
                            options={FILTER_OPTIONS}
                            value={FILTER_OPTIONS.find(o => o.value === filter) ?? FILTER_OPTIONS[0]}
                            onChange={opt => setFilter((opt as Option | null)?.value ?? '')}
                        />
                    </div>
                    {loading && <Spinner size={20} />}
                </div>
                <DataTable
                    columns={columns}
                    data={paged as unknown[]}
                    loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total: list.length, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>

            <Dialog isOpen={showForm} onRequestClose={closeForm} onClose={closeForm} width={640}>
                <h5 className="text-base font-semibold mb-5">{editTarget ? 'Edit Pemasukan' : 'Tambah Pemasukan'}</h5>
                <form onSubmit={e => { e.preventDefault(); handleSubmitForm() }}>
                    <div className="max-h-[65vh] overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                            <FormItem label="Kategori" asterisk>
                                <Select
                                    isSearchable={false}
                                    placeholder="Pilih kategori..."
                                    options={KATEGORI_OPTIONS}
                                    value={KATEGORI_OPTIONS.find(o => o.value === form.kategori) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, kategori: ((opt as { value: KategoriPemasukan } | null)?.value) ?? '' }))}
                                />
                            </FormItem>
                            <FormItem label="Nominal" asterisk>
                                <Input prefix="Rp" placeholder="0"
                                    value={form.nominal ? formatNum(Number(form.nominal)) : ''}
                                    onChange={e => setForm(p => ({ ...p, nominal: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Tanggal" asterisk>
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={form.tanggal ? dayjs(form.tanggal).toDate() : null}
                                    onChange={date => setForm(p => ({ ...p, tanggal: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="Sumber Dana" asterisk>
                                <Input placeholder="Nama pemberi / asal dana" value={form.sumber_dana}
                                    onChange={e => setForm(p => ({ ...p, sumber_dana: e.target.value }))} />
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
                                        onChange={validasiFile}
                                    />
                                </FormItem>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={closeForm}>Batal</Button>
                        <Button type="submit" variant="solid" loading={submitting}
                            disabled={!form.kategori || !form.nominal || !form.tanggal || !form.sumber_dana.trim()}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            <DetailTransaksiDialog transaksi={detailTarget} onClose={() => setDetailTarget(null)} />

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Pemasukan"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus pemasukan {deleteTarget?.nomor}? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>
        </div>
    )
}
