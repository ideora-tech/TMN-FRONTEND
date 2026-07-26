'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Input, Tag, Tooltip, Dialog, Button, FormItem, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineAdjustments, HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { cutiService, RekapSaldoRow } from '@/services/cuti.service'

type Option = { value: string; label: string }

const TAHUN_SEKARANG = Number(dayjs().format('YYYY'))
const TAHUN_OPTIONS: Option[] = [TAHUN_SEKARANG - 1, TAHUN_SEKARANG, TAHUN_SEKARANG + 1]
    .map(t => ({ value: String(t), label: String(t) }))

export default function SaldoTab() {
    const [rows, setRows]       = useState<RekapSaldoRow[]>([])
    const [loading, setLoading] = useState(false)
    const [tahun, setTahun]     = useState(TAHUN_SEKARANG)

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    const [target, setTarget]       = useState<RekapSaldoRow | null>(null)
    const [jumlahHari, setJumlahHari] = useState('')
    const [keterangan, setKeterangan] = useState('')
    const [saving, setSaving]         = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await cutiService.rekapSaldo({
                tahun,
                page: currentPage,
                limit: pageSize,
                search: search || undefined,
            })
            setRows(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [tahun, currentPage, pageSize, search])

    useEffect(() => { fetchData() }, [fetchData])

    const handlePenyesuaian = async () => {
        if (!target || !jumlahHari || Number(jumlahHari) === 0) return
        setSaving(true)
        try {
            await cutiService.penyesuaian({
                id_karyawan: target.tipe === 'karyawan' ? target.id : null,
                id_supir:    target.tipe === 'supir' ? target.id : null,
                tahun,
                jumlah_hari: Number(jumlahHari),
                keterangan: keterangan || null,
            })
            toast.push(<Notification type="success" title="Penyesuaian saldo tersimpan" />)
            setTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const columns: ColumnDef<RekapSaldoRow>[] = [
        {
            header: 'Nama', accessorKey: 'nama', size: 200,
            cell: ({ row }: CellContext<RekapSaldoRow, unknown>) => (
                <span className="font-medium">{row.original.nama}</span>
            ),
        },
        {
            header: 'Tipe', accessorKey: 'tipe', size: 110,
            cell: ({ row }: CellContext<RekapSaldoRow, unknown>) => (
                <Tag className={row.original.tipe === 'supir'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}>
                    {row.original.tipe === 'supir' ? 'Supir' : 'Karyawan'}
                </Tag>
            ),
        },
        { header: 'Jatah', accessorKey: 'jatah', size: 80 },
        {
            header: 'Penyesuaian', accessorKey: 'penyesuaian', size: 110,
            cell: ({ row }: CellContext<RekapSaldoRow, unknown>) =>
                row.original.penyesuaian !== 0
                    ? <span className={row.original.penyesuaian > 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {row.original.penyesuaian > 0 ? '+' : ''}{row.original.penyesuaian}
                      </span>
                    : <span className="text-gray-400">0</span>,
        },
        { header: 'Terpakai', accessorKey: 'terpakai', size: 90 },
        {
            header: 'Sisa', accessorKey: 'sisa', size: 80,
            cell: ({ row }: CellContext<RekapSaldoRow, unknown>) => (
                <span className={`font-bold ${row.original.sisa <= 0 ? 'text-red-500' : ''}`}>{row.original.sisa}</span>
            ),
        },
        {
            header: '', id: 'action', size: 60,
            cell: ({ row }: CellContext<RekapSaldoRow, unknown>) => (
                <Tooltip title="Penyesuaian saldo">
                    <span
                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                        onClick={() => { setTarget(row.original); setJumlahHari(''); setKeterangan('') }}>
                        <HiOutlineAdjustments className="text-lg" />
                    </span>
                </Tooltip>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nama... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-32 shrink-0">
                        <Select<Option>
                            isSearchable={false}
                            options={TAHUN_OPTIONS}
                            value={TAHUN_OPTIONS.find(o => o.value === String(tahun)) ?? null}
                            onChange={(opt) => { setTahun(Number((opt as Option).value)); setCurrentPage(1) }}
                        />
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={rows as unknown[]}
                    loading={loading}
                    noData={!loading && rows.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>

            <Dialog isOpen={!!target} onRequestClose={() => setTarget(null)} onClose={() => setTarget(null)} width={440}>
                <h5 className="font-bold mb-1">Penyesuaian Saldo</h5>
                <p className="text-sm text-gray-500 mb-4">{target?.nama} · tahun {tahun} · sisa saat ini {target?.sisa} hari</p>
                <form onSubmit={e => { e.preventDefault(); handlePenyesuaian() }}>
                    <FormItem label="Jumlah Hari" asterisk
                        extra={<span className="text-xs text-gray-400">Positif menambah saldo, negatif mengurangi (misal -2)</span>}>
                        <Input type="number" placeholder="Misal: 3 atau -2" value={jumlahHari}
                            onChange={e => setJumlahHari(e.target.value)} />
                    </FormItem>
                    <FormItem label="Keterangan">
                        <Input textArea rows={2} placeholder="Misal: carry forward 2025..."
                            value={keterangan}
                            onChange={e => setKeterangan(e.target.value)} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setTarget(null)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}
                            disabled={!jumlahHari || Number(jumlahHari) === 0}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    )
}
