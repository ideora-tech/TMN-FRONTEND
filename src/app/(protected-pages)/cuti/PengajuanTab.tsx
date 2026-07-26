'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Input, Tag, Tooltip, Dialog, Button, FormItem, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineReply, HiPlusCircle } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { cutiService, PengajuanCuti, JenisCuti, StatusPengajuanCuti } from '@/services/cuti.service'
import { karyawanService } from '@/services/karyawan.service'
import { supirService } from '@/services/supir.service'

type Option = { value: string; label: string }

const STATUS_OPTIONS: Option[] = [
    { value: '',           label: 'Semua Status' },
    { value: 'menunggu',   label: 'Menunggu' },
    { value: 'disetujui',  label: 'Disetujui' },
    { value: 'ditolak',    label: 'Ditolak' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
]

const STATUS_TAG: Record<StatusPengajuanCuti, string> = {
    menunggu:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100',
    disetujui:  'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    ditolak:    'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
    dibatalkan: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

const STATUS_LABEL: Record<StatusPengajuanCuti, string> = {
    menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak', dibatalkan: 'Dibatalkan',
}

const FORM_KOSONG = {
    tipe_orang: 'karyawan' as 'karyawan' | 'supir',
    id_orang: '',
    id_jenis_cuti: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    alasan: '',
}

export default function PengajuanTab() {
    const [list, setList]       = useState<PengajuanCuti[]>([])
    const [loading, setLoading] = useState(false)

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const [jenisOptions, setJenisOptions]       = useState<Option[]>([])
    const [jenisList, setJenisList]             = useState<JenisCuti[]>([])
    const [karyawanOptions, setKaryawanOptions] = useState<Option[]>([])
    const [supirOptions, setSupirOptions]       = useState<Option[]>([])

    const [formOpen, setFormOpen]   = useState(false)
    const [form, setForm]           = useState(FORM_KOSONG)
    const [saldoSisa, setSaldoSisa] = useState<number | null>(null)
    const [saving, setSaving]       = useState(false)

    const [tolakTarget, setTolakTarget]   = useState<PengajuanCuti | null>(null)
    const [catatanTolak, setCatatanTolak] = useState('')
    const [prosesId, setProsesId]         = useState<string | null>(null)
    const [batalTarget, setBatalTarget]   = useState<PengajuanCuti | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await cutiService.listPengajuan({
                page: currentPage, limit: pageSize,
                status: statusFilter || undefined,
                search: search || undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, statusFilter, search])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        cutiService.listJenis({ limit: 100 }).then(res => {
            setJenisList(res.data)
            setJenisOptions(res.data.filter(j => j.aktif).map(j => ({ value: j.id_jenis_cuti, label: j.nama_jenis })))
        }).catch(() => {})
        karyawanService.list(1, 500).then(res =>
            setKaryawanOptions(res.data.filter(k => k.aktif).map(k => ({ value: k.id_karyawan, label: `${k.nik} — ${k.nama_karyawan}` })))
        ).catch(() => {})
        supirService.list(1, 500, undefined, 'aktif').then(res =>
            setSupirOptions(res.data.map(s => ({ value: s.id_supir, label: s.nama })))
        ).catch(() => {})
    }, [])

    useEffect(() => {
        if (!form.id_orang) { setSaldoSisa(null); return }
        const tahun = form.tanggal_mulai ? Number(dayjs(form.tanggal_mulai).format('YYYY')) : Number(dayjs().format('YYYY'))
        cutiService.saldo(form.tipe_orang === 'karyawan'
            ? { id_karyawan: form.id_orang, tahun }
            : { id_supir: form.id_orang, tahun })
            .then(info => setSaldoSisa(info.sisa))
            .catch(() => setSaldoSisa(null))
    }, [form.id_orang, form.tipe_orang, form.tanggal_mulai])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const jumlahHari = form.tanggal_mulai && form.tanggal_selesai
        ? dayjs(form.tanggal_selesai).diff(dayjs(form.tanggal_mulai), 'day') + 1
        : null

    const jenisDipilih = jenisList.find(j => j.id_jenis_cuti === form.id_jenis_cuti)

    const handleSubmit = async () => {
        if (!form.id_orang || !form.id_jenis_cuti || !form.tanggal_mulai || !form.tanggal_selesai) return
        setSaving(true)
        try {
            await cutiService.createPengajuan({
                id_karyawan: form.tipe_orang === 'karyawan' ? form.id_orang : null,
                id_supir:    form.tipe_orang === 'supir' ? form.id_orang : null,
                id_jenis_cuti: form.id_jenis_cuti,
                tanggal_mulai: form.tanggal_mulai,
                tanggal_selesai: form.tanggal_selesai,
                alasan: form.alasan || null,
            })
            toast.push(<Notification type="success" title="Pengajuan cuti berhasil dibuat" />)
            setFormOpen(false)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleSetujui = async (row: PengajuanCuti) => {
        setProsesId(row.id_pengajuan)
        try {
            await cutiService.setujui(row.id_pengajuan)
            toast.push(<Notification type="success" title="Pengajuan disetujui" />)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setProsesId(null)
        }
    }

    const handleTolak = async () => {
        if (!tolakTarget) return
        setProsesId(tolakTarget.id_pengajuan)
        try {
            await cutiService.tolak(tolakTarget.id_pengajuan, catatanTolak || null)
            toast.push(<Notification type="success" title="Pengajuan ditolak" />)
            setTolakTarget(null)
            setCatatanTolak('')
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setProsesId(null)
        }
    }

    const handleBatalkan = async () => {
        if (!batalTarget) return
        setProsesId(batalTarget.id_pengajuan)
        try {
            await cutiService.batalkan(batalTarget.id_pengajuan)
            toast.push(<Notification type="success" title="Pengajuan dibatalkan" />)
            setBatalTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setProsesId(null)
        }
    }

    const columns: ColumnDef<PengajuanCuti>[] = [
        {
            header: 'Nama', accessorKey: 'nama_orang', size: 170,
            cell: ({ row }: CellContext<PengajuanCuti, unknown>) => (
                <div>
                    <p className="font-medium">{row.original.nama_orang ?? '—'}</p>
                    <p className="text-xs text-gray-400 capitalize">{row.original.tipe_orang}</p>
                </div>
            ),
        },
        { header: 'Jenis', accessorKey: 'nama_jenis', size: 130 },
        {
            header: 'Tanggal', accessorKey: 'tanggal_mulai', size: 190,
            cell: ({ row }: CellContext<PengajuanCuti, unknown>) => (
                <div>
                    <p className="text-xs">
                        {dayjs(row.original.tanggal_mulai).format('DD MMM YYYY')} – {dayjs(row.original.tanggal_selesai).format('DD MMM YYYY')}
                    </p>
                    <p className="text-xs text-gray-400">{row.original.jumlah_hari} hari</p>
                </div>
            ),
        },
        {
            header: 'Alasan', accessorKey: 'alasan', size: 180,
            cell: ({ row }: CellContext<PengajuanCuti, unknown>) => (
                <div>
                    <p className="text-xs truncate max-w-44">{row.original.alasan ?? <span className="text-gray-400">—</span>}</p>
                    {row.original.status === 'ditolak' && row.original.catatan_proses && (
                        <p className="text-xs text-red-500 truncate max-w-44">Ditolak: {row.original.catatan_proses}</p>
                    )}
                </div>
            ),
        },
        {
            header: 'Status', accessorKey: 'status', size: 110,
            cell: ({ row }: CellContext<PengajuanCuti, unknown>) => (
                <Tag className={STATUS_TAG[row.original.status]}>{STATUS_LABEL[row.original.status]}</Tag>
            ),
        },
        {
            header: '', id: 'action', size: 130,
            cell: ({ row }: CellContext<PengajuanCuti, unknown>) => {
                const r = row.original
                const sibuk = prosesId === r.id_pengajuan
                return (
                    <div className="flex items-center justify-end gap-1">
                        {r.status === 'menunggu' && (
                            <>
                                <Tooltip title="Setujui">
                                    <span
                                        className={`cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors ${sibuk ? 'opacity-50 pointer-events-none' : ''}`}
                                        onClick={() => handleSetujui(r)}>
                                        <HiOutlineCheckCircle className="text-lg" />
                                    </span>
                                </Tooltip>
                                <Tooltip title="Tolak">
                                    <span
                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                        onClick={() => { setTolakTarget(r); setCatatanTolak('') }}>
                                        <HiOutlineXCircle className="text-lg" />
                                    </span>
                                </Tooltip>
                            </>
                        )}
                        {r.status === 'disetujui' && (
                            <Tooltip title="Batalkan (kembalikan saldo)">
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                    onClick={() => setBatalTarget(r)}>
                                    <HiOutlineReply className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nama karyawan/supir... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-full sm:w-44 shrink-0">
                        <Select<Option>
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={(opt) => { setStatusFilter((opt as Option).value); setCurrentPage(1) }}
                        />
                    </div>
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />} className="shrink-0"
                        onClick={() => { setForm(FORM_KOSONG); setSaldoSisa(null); setFormOpen(true) }}>
                        Ajukan Cuti
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

            {/* Dialog Ajukan Cuti */}
            <Dialog isOpen={formOpen} onRequestClose={() => setFormOpen(false)} onClose={() => setFormOpen(false)}>
                <h5 className="font-bold mb-4">Ajukan Cuti</h5>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Untuk" asterisk>
                        <Select isSearchable={false}
                            options={[{ value: 'karyawan', label: 'Karyawan' }, { value: 'supir', label: 'Supir' }]}
                            value={{ value: form.tipe_orang, label: form.tipe_orang === 'karyawan' ? 'Karyawan' : 'Supir' }}
                            onChange={opt => setForm(p => ({ ...p, tipe_orang: (opt?.value as 'karyawan' | 'supir') ?? 'karyawan', id_orang: '' }))} />
                    </FormItem>
                    <FormItem label={form.tipe_orang === 'karyawan' ? 'Karyawan' : 'Supir'} asterisk>
                        <Select isSearchable placeholder="Pilih..."
                            options={form.tipe_orang === 'karyawan' ? karyawanOptions : supirOptions}
                            value={(form.tipe_orang === 'karyawan' ? karyawanOptions : supirOptions).find(o => o.value === form.id_orang) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_orang: opt?.value ?? '' }))} />
                        {saldoSisa !== null && (
                            <p className={`text-xs mt-1 ${saldoSisa <= 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                Sisa saldo cuti: <span className="font-semibold">{saldoSisa} hari</span>
                            </p>
                        )}
                    </FormItem>
                    <FormItem label="Jenis Cuti" asterisk>
                        <Select isSearchable={false} placeholder="Pilih jenis..."
                            options={jenisOptions}
                            value={jenisOptions.find(o => o.value === form.id_jenis_cuti) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_jenis_cuti: opt?.value ?? '' }))} />
                        {jenisDipilih && (
                            <p className="text-xs text-gray-400 mt-1">
                                {jenisDipilih.mengurangi_saldo ? 'Memotong saldo cuti' : 'Tidak memotong saldo'}
                            </p>
                        )}
                    </FormItem>
                    <div className="hidden sm:block" />
                    <FormItem label="Tanggal Mulai" asterisk>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_mulai ? dayjs(form.tanggal_mulai).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Tanggal Selesai" asterisk>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_selesai ? dayjs(form.tanggal_selesai).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                        {jumlahHari !== null && jumlahHari > 0 && (
                            <p className="text-xs text-gray-500 mt-1">{jumlahHari} hari cuti</p>
                        )}
                    </FormItem>
                    <div className="sm:col-span-2">
                        <FormItem label="Alasan">
                            <Input textArea rows={2} placeholder="Alasan cuti (opsional)..."
                                value={form.alasan}
                                onChange={e => setForm(p => ({ ...p, alasan: e.target.value }))} />
                        </FormItem>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => setFormOpen(false)}>Batal</Button>
                    <Button type="submit" variant="solid" loading={saving}
                        disabled={!form.id_orang || !form.id_jenis_cuti || !form.tanggal_mulai || !form.tanggal_selesai}>
                        Ajukan
                    </Button>
                </div>
                </form>
            </Dialog>

            {/* Dialog Tolak */}
            <Dialog isOpen={!!tolakTarget} onRequestClose={() => setTolakTarget(null)} onClose={() => setTolakTarget(null)}>
                <h5 className="font-bold mb-1">Tolak Pengajuan</h5>
                <p className="text-sm text-gray-500 mb-4">
                    {tolakTarget?.nama_orang} · {tolakTarget?.nama_jenis} · {tolakTarget ? dayjs(tolakTarget.tanggal_mulai).format('DD MMM') : ''}–{tolakTarget ? dayjs(tolakTarget.tanggal_selesai).format('DD MMM YYYY') : ''}
                </p>
                <form onSubmit={e => { e.preventDefault(); handleTolak() }}>
                    <FormItem label="Catatan penolakan">
                        <Input textArea rows={2} placeholder="Alasan penolakan (opsional)..."
                            value={catatanTolak}
                            onChange={e => setCatatanTolak(e.target.value)} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setTolakTarget(null)}>Batal</Button>
                        <Button type="submit" variant="solid" className="bg-red-600 hover:bg-red-700" loading={prosesId === tolakTarget?.id_pengajuan}>
                            Tolak Pengajuan
                        </Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog
                isOpen={!!batalTarget}
                type="danger"
                title="Batalkan Cuti"
                confirmText="Ya, Batalkan"
                cancelText="Tutup"
                onClose={() => setBatalTarget(null)}
                onCancel={() => setBatalTarget(null)}
                onConfirm={handleBatalkan}
                confirmButtonProps={{ loading: prosesId === batalTarget?.id_pengajuan }}
            >
                <p>Batalkan cuti {batalTarget?.nama_jenis} milik {batalTarget?.nama_orang}?
                    {batalTarget?.mengurangi_saldo ? ' Saldo yang terpotong akan dikembalikan.' : ''}</p>
            </ConfirmDialog>
        </div>
    )
}
