'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { absensiService, RekapAbsensiRow } from '@/services/absensi.service'

type Option = { value: string; label: string }

const BULAN_OPTIONS: Option[] = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
].map((nama, i) => ({ value: String(i + 1).padStart(2, '0'), label: nama }))

const TAHUN_SEKARANG = Number(dayjs().format('YYYY'))
const TAHUN_OPTIONS: Option[] = [TAHUN_SEKARANG - 1, TAHUN_SEKARANG, TAHUN_SEKARANG + 1]
    .map(t => ({ value: String(t), label: String(t) }))

export default function RekapBulananTab() {
    const [rows, setRows]       = useState<RekapAbsensiRow[]>([])
    const [loading, setLoading] = useState(false)
    const [bulan, setBulan]     = useState(dayjs().format('MM'))
    const [tahun, setTahun]     = useState(String(TAHUN_SEKARANG))

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await absensiService.rekap({
                bulan: `${tahun}-${bulan}`,
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
    }, [bulan, tahun, currentPage, pageSize, search])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const angka = (v: number, warna: string) =>
        v > 0 ? <span className={`font-semibold ${warna}`}>{v}</span> : <span className="text-gray-300 dark:text-gray-600">0</span>

    const columns: ColumnDef<RekapAbsensiRow>[] = [
        {
            header: 'Karyawan', accessorKey: 'nama', size: 200,
            cell: ({ row }: CellContext<RekapAbsensiRow, unknown>) => (
                <div>
                    <p className="font-medium">{row.original.nama}</p>
                    <p className="text-xs text-gray-400 font-mono">{row.original.nik}</p>
                </div>
            ),
        },
        {
            header: 'Hadir', accessorKey: 'hadir', size: 80,
            cell: ({ row }: CellContext<RekapAbsensiRow, unknown>) => angka(row.original.hadir, 'text-emerald-600'),
        },
        {
            header: 'Terlambat', accessorKey: 'terlambat', size: 95,
            cell: ({ row }: CellContext<RekapAbsensiRow, unknown>) => angka(row.original.terlambat, 'text-amber-600'),
        },
        {
            header: 'Izin', accessorKey: 'izin', size: 70,
            cell: ({ row }: CellContext<RekapAbsensiRow, unknown>) => angka(row.original.izin, 'text-blue-600'),
        },
        {
            header: 'Sakit', accessorKey: 'sakit', size: 75,
            cell: ({ row }: CellContext<RekapAbsensiRow, unknown>) => angka(row.original.sakit, 'text-purple-600'),
        },
        {
            header: 'Cuti', accessorKey: 'cuti', size: 70,
            cell: ({ row }: CellContext<RekapAbsensiRow, unknown>) => angka(row.original.cuti, 'text-blue-600'),
        },
        {
            header: 'Alpha', accessorKey: 'alpha', size: 75,
            cell: ({ row }: CellContext<RekapAbsensiRow, unknown>) => angka(row.original.alpha, 'text-red-500'),
        },
        {
            header: 'Lembur', accessorKey: 'lembur_menit', size: 130,
            cell: ({ row }: CellContext<RekapAbsensiRow, unknown>) => {
                const menit = row.original.lembur_menit
                if (menit <= 0) return <span className="text-gray-300 dark:text-gray-600">—</span>
                const jam = Math.floor(menit / 60)
                const sisa = menit % 60
                return (
                    <div>
                        <p className="font-semibold text-amber-600">
                            {jam > 0 ? `${jam}j ` : ''}{sisa > 0 ? `${sisa}m` : ''}
                        </p>
                        <p className="text-xs text-gray-500">{formatRupiah(row.original.lembur_rupiah)}</p>
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
                        className="flex-1 min-w-52"
                        placeholder="Cari nama atau NIK... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-40 shrink-0">
                        <Select<Option>
                            isSearchable={false}
                            options={BULAN_OPTIONS}
                            value={BULAN_OPTIONS.find(o => o.value === bulan) ?? null}
                            onChange={(opt) => { setBulan((opt as Option).value); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-28 shrink-0">
                        <Select<Option>
                            isSearchable={false}
                            options={TAHUN_OPTIONS}
                            value={TAHUN_OPTIONS.find(o => o.value === tahun) ?? null}
                            onChange={(opt) => { setTahun((opt as Option).value); setCurrentPage(1) }}
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
        </div>
    )
}
