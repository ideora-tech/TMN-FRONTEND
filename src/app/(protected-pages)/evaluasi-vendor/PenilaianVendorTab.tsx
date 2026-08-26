'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, Button, Dialog, FormItem, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiOutlinePencilAlt, HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { evaluasiService, PenugasanUntukEvaluasi, EvaluasiPayload } from '@/services/evaluasi.service'

type NilaiKey = 'nilai_ketepatan_waktu' | 'nilai_kualitas' | 'nilai_harga' | 'nilai_responsif'

const KRITERIA: { key: NilaiKey; label: string }[] = [
    { key: 'nilai_ketepatan_waktu', label: 'Ketepatan Waktu' },
    { key: 'nilai_kualitas',        label: 'Kualitas Layanan' },
    { key: 'nilai_harga',           label: 'Harga' },
    { key: 'nilai_responsif',       label: 'Responsif' },
]

const NILAI_OPTIONS = [1, 2, 3, 4, 5].map(n => ({ value: n, label: String(n) }))

export default function PenilaianVendorTab({ onTersimpan }: { onTersimpan?: () => void }) {
    const [list, setList]               = useState<PenugasanUntukEvaluasi[]>([])
    const [loading, setLoading]         = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    const [target, setTarget]   = useState<PenugasanUntukEvaluasi | null>(null)
    const [form, setForm]       = useState<EvaluasiPayload>({})
    const [error, setError]     = useState('')
    const [saving, setSaving]   = useState(false)

    const fetchList = useCallback(async () => {
        setLoading(true)
        try {
            const res = await evaluasiService.listPenugasanUntukEvaluasi(currentPage, pageSize, search)
            setList(res.data)
            setTotal(res.meta?.total ?? 0)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search])

    useEffect(() => { fetchList() }, [fetchList])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const bukaDialog = (row: PenugasanUntukEvaluasi) => {
        setTarget(row)
        setForm({
            nilai_ketepatan_waktu: row.nilai_ketepatan_waktu,
            nilai_kualitas:        row.nilai_kualitas,
            nilai_harga:           row.nilai_harga,
            nilai_responsif:       row.nilai_responsif,
            catatan:               row.catatan,
        })
        setError('')
    }

    const tutupDialog = () => { setTarget(null); setError('') }

    const handleSave = async () => {
        if (!target) return
        if (!KRITERIA.some(k => form[k.key] != null)) {
            setError('Isi minimal satu nilai')
            return
        }
        setError('')
        setSaving(true)
        try {
            const payload: EvaluasiPayload = { catatan: form.catatan?.trim() || null }
            KRITERIA.forEach(k => { payload[k.key] = form[k.key] ?? null })
            if (target.id_evaluasi) {
                await evaluasiService.update(target.id_evaluasi, payload)
            } else {
                await evaluasiService.create(target.id_penugasan, payload)
            }
            toast.push(<Notification type="success" title="Evaluasi berhasil disimpan" />)
            tutupDialog()
            fetchList()
            onTersimpan?.()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const columns: ColumnDef<PenugasanUntukEvaluasi>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Tanggal', accessorKey: 'tanggal_tugas', size: 120,
            cell: ({ row }) => row.original.tanggal_tugas
                ? dayjs(row.original.tanggal_tugas).format('DD MMM YYYY')
                : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Vendor', accessorKey: 'nama_vendor', size: 170,
            cell: ({ row }) => <span className="font-semibold">{row.original.nama_vendor}</span>,
        },
        {
            header: 'Proyek', accessorKey: 'nama_proyek', size: 190,
            cell: ({ row }) => (
                <div>
                    <p className="text-gray-800 dark:text-gray-200">{row.original.nama_proyek ?? '—'}</p>
                    {row.original.kode_proyek && (
                        <p className="text-xs text-gray-400">{row.original.kode_proyek}</p>
                    )}
                </div>
            ),
        },
        {
            header: 'Unit & Supir', id: 'unit', size: 170,
            cell: ({ row }) => (
                <div>
                    <p className="font-mono text-gray-800 dark:text-gray-200">{row.original.nopol ?? '—'}</p>
                    {row.original.nama_supir && (
                        <p className="text-xs text-gray-400">{row.original.nama_supir}</p>
                    )}
                </div>
            ),
        },
        {
            header: 'Status Penilaian', id: 'status', size: 150,
            cell: ({ row }) => row.original.id_evaluasi ? (
                <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100 border-0">
                    Sudah dinilai
                </Tag>
            ) : (
                <Tag className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100 border-0">
                    Belum dinilai
                </Tag>
            ),
        },
        {
            header: '', id: 'aksi', size: 80,
            cell: ({ row }) => (
                <div className="flex items-center justify-end">
                    {row.original.id_evaluasi ? (
                        <Tooltip title="Ubah Penilaian">
                            <span
                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                onClick={() => bukaDialog(row.original)}
                            >
                                <HiOutlinePencilAlt className="text-lg" />
                            </span>
                        </Tooltip>
                    ) : (
                        <Button size="sm" variant="solid" onClick={() => bukaDialog(row.original)}>
                            Nilai
                        </Button>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari vendor, proyek, atau nopol... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
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

            <Dialog isOpen={!!target} onRequestClose={tutupDialog} onClose={tutupDialog} width={560}>
                <h5 className="text-base font-semibold mb-1">
                    {target?.id_evaluasi ? 'Ubah Penilaian Vendor' : 'Nilai Vendor'}
                </h5>
                <p className="text-sm text-gray-500 mb-5">
                    {target?.nama_vendor}
                    {target?.nama_proyek && ` — ${target.nama_proyek}`}
                    {target?.tanggal_tugas && ` · ${dayjs(target.tanggal_tugas).format('DD MMM YYYY')}`}
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        {KRITERIA.map(k => (
                            <FormItem key={k.key} label={k.label}>
                                <Select isClearable isSearchable={false} placeholder="Pilih nilai..."
                                    options={NILAI_OPTIONS}
                                    value={NILAI_OPTIONS.find(o => o.value === form[k.key]) ?? null}
                                    onChange={opt => {
                                        setError('')
                                        setForm(p => ({ ...p, [k.key]: opt?.value ?? null }))
                                    }} />
                            </FormItem>
                        ))}
                        <FormItem label="Keterangan" className="sm:col-span-2">
                            <Input textArea rows={3} placeholder="Catatan tambahan (opsional)"
                                value={form.catatan ?? ''}
                                onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} />
                        </FormItem>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={tutupDialog}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                    </div>
                </form>
            </Dialog>
        </div>
    )
}
