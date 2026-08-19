'use client'
import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Card, Tag, Tooltip, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiOutlineEye, HiOutlineExternalLink } from 'react-icons/hi'
import DetailPengajuanDialog from './DetailPengajuanDialog'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { arusKasService, PengajuanPengeluaran, StatusPengajuan } from '@/services/arusKas.service'
import { KATEGORI_LABEL, STATUS_LABEL, STATUS_TAG } from './pengajuanMeta'

type Option = { value: string; label: string }

const STATUS_OPTIONS: Option[] = [
    { value: '', label: 'Semua Status' },
    ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

export default function PengeluaranTab() {
    const [list, setList]       = useState<PengajuanPengeluaran[]>([])
    const [loading, setLoading] = useState(false)
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
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
                            <a href={ROUTES.TRIP_DETAIL(p.id_trip)} target="_blank" rel="noreferrer" className="w-fit">
                                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 cursor-pointer hover:opacity-80">
                                    Dari Trip <HiOutlineExternalLink className="text-xs" />
                                </Tag>
                            </a>
                        )}
                        {p.id_perawatan && (
                            <a href={p.id_armada_perawatan
                                ? `${ROUTES.PERAWATAN_ARMADA}?armada=${p.id_armada_perawatan}&detail=${p.id_perawatan}`
                                : ROUTES.PERAWATAN_ARMADA} target="_blank" rel="noreferrer" className="w-fit">
                                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300 cursor-pointer hover:opacity-80">
                                    Dari Perawatan <HiOutlineExternalLink className="text-xs" />
                                </Tag>
                            </a>
                        )}
                        {p.id_pembelian && (
                            <a href={ROUTES.PEMBELIAN_SPAREPART_DETAIL(p.id_pembelian)} target="_blank" rel="noreferrer" className="w-fit">
                                <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-lime-100 text-lime-600 dark:bg-lime-500/20 dark:text-lime-300 cursor-pointer hover:opacity-80">
                                    Dari Pembelian <HiOutlineExternalLink className="text-xs" />
                                </Tag>
                            </a>
                        )}
                        {p.id_periode && (
                            <a href={ROUTES.PAYROLL_DETAIL(p.id_periode)} target="_blank" rel="noreferrer" className="w-fit">
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
        { header: 'Penerima', accessorKey: 'penerima', size: 160 },
        {
            header: 'Nominal', accessorKey: 'nominal', size: 140,
            cell: ({ row }) => <span className="tabular-nums font-semibold">{formatRupiah(row.original.nominal)}</span>,
        },
        {
            header: 'Status', id: 'status', size: 150,
            cell: ({ row }) => {
                const p = row.original
                const tag = <Tag className={`text-xs font-semibold ${STATUS_TAG[p.status]}`}>{STATUS_LABEL[p.status]}</Tag>
                return p.status === 'ditolak' && p.alasan_ditolak ? <Tooltip title={p.alasan_ditolak}>{tag}</Tooltip> : tag
            },
        },
        {
            header: '', id: 'aksi', size: 60,
            cell: ({ row }) => (
                <div className="flex items-center justify-end">
                    <Tooltip title="Lihat Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => setDetailTarget(row.original)}>
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
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

            <DetailPengajuanDialog pengajuan={detailTarget} onClose={() => setDetailTarget(null)} readOnly />
        </div>
    )
}
