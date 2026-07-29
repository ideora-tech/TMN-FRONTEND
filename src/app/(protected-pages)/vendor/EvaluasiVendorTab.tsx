'use client'
import { useEffect, useState } from 'react'
import { Card, Dialog, Tag, Tooltip, toast, Notification, Spinner } from '@/components/ui'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiOutlineEye } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { evaluasiService, RekapEvaluasiVendor, EvaluasiVendorItem } from '@/services/evaluasi.service'

function warnaRata(nilai: number) {
    if (nilai >= 4) return 'text-emerald-600 dark:text-emerald-400'
    if (nilai >= 3) return 'text-amber-500 dark:text-amber-400'
    return 'text-red-500 dark:text-red-400'
}

function NilaiCell({ nilai }: { nilai: number | null }) {
    if (nilai == null) return <span className="text-gray-400">—</span>
    return <span className="tabular-nums">{formatNum(Number(nilai), 1)}</span>
}

const KRITERIA_DETAIL: { key: keyof EvaluasiVendorItem; label: string }[] = [
    { key: 'nilai_ketepatan_waktu', label: 'Waktu' },
    { key: 'nilai_kualitas',        label: 'Kualitas' },
    { key: 'nilai_harga',           label: 'Harga' },
    { key: 'nilai_responsif',       label: 'Responsif' },
    { key: 'nilai_armada',          label: 'Armada' },
    { key: 'nilai_supir',           label: 'Supir' },
]

export default function EvaluasiVendorTab() {
    const [list, setList]       = useState<RekapEvaluasiVendor[]>([])
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]                    = useState(15)

    const [detailTarget, setDetailTarget]   = useState<RekapEvaluasiVendor | null>(null)
    const [detailList, setDetailList]       = useState<EvaluasiVendorItem[]>([])
    const [detailLoading, setDetailLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        evaluasiService.rekapVendor()
            .then(setList)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [])

    const handleOpenDetail = async (vendor: RekapEvaluasiVendor) => {
        setDetailTarget(vendor)
        setDetailLoading(true)
        try {
            const data = await evaluasiService.listByVendor(vendor.id_vendor)
            setDetailList(data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDetailLoading(false)
        }
    }

    const handleCloseDetail = () => {
        setDetailTarget(null)
        setDetailList([])
    }

    const columns: ColumnDef<RekapEvaluasiVendor>[] = [
        {
            header: 'Vendor', accessorKey: 'nama_vendor',
            cell: ({ row }) => <span className="font-semibold">{row.original.nama_vendor}</span>,
        },
        {
            header: 'Jumlah Evaluasi', accessorKey: 'jumlah_evaluasi', size: 140,
            cell: ({ row }) => <span className="tabular-nums">{formatNum(Number(row.original.jumlah_evaluasi))}</span>,
        },
        {
            header: 'Ketepatan Waktu', accessorKey: 'rata_ketepatan_waktu', size: 150,
            cell: ({ row }) => <NilaiCell nilai={row.original.rata_ketepatan_waktu} />,
        },
        {
            header: 'Kualitas', accessorKey: 'rata_kualitas', size: 110,
            cell: ({ row }) => <NilaiCell nilai={row.original.rata_kualitas} />,
        },
        {
            header: 'Harga', accessorKey: 'rata_harga', size: 100,
            cell: ({ row }) => <NilaiCell nilai={row.original.rata_harga} />,
        },
        {
            header: 'Responsif', accessorKey: 'rata_responsif', size: 110,
            cell: ({ row }) => <NilaiCell nilai={row.original.rata_responsif} />,
        },
        {
            header: 'Rata-rata', accessorKey: 'rata_keseluruhan', size: 110,
            cell: ({ row }) => {
                const nilai = row.original.rata_keseluruhan
                if (nilai == null) return <span className="text-gray-400">—</span>
                return (
                    <span className={`font-bold tabular-nums ${warnaRata(Number(nilai))}`}>
                        {formatNum(Number(nilai), 1)}
                    </span>
                )
            },
        },
        {
            header: '', id: 'aksi', size: 70,
            cell: ({ row }) => (
                <div className="flex items-center justify-end">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => handleOpenDetail(row.original)}
                        >
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
    ]

    const pagedList = list.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                {!loading && list.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm">
                        Belum ada evaluasi vendor.
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={pagedList as unknown[]}
                        loading={loading}
                        pagingData={{ total: list.length, pageIndex: currentPage, pageSize }}
                        onPaginationChange={setCurrentPage}
                    />
                )}
            </Card>

            <Dialog isOpen={!!detailTarget} onRequestClose={handleCloseDetail} onClose={handleCloseDetail} width={640}>
                <h5 className="text-base font-semibold mb-1">Riwayat Evaluasi</h5>
                <p className="text-sm text-gray-500 mb-5">{detailTarget?.nama_vendor}</p>

                {detailLoading ? (
                    <div className="flex justify-center py-8"><Spinner /></div>
                ) : detailList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-8 text-center">Belum ada evaluasi untuk vendor ini.</p>
                ) : (
                    <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
                        {detailList.map(item => (
                            <div key={item.id_evaluasi} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                                        {item.nama_proyek ?? <span className="text-gray-400 font-normal">—</span>}
                                    </p>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                        {item.tanggal_tugas ? dayjs(item.tanggal_tugas).format('DD MMM YYYY') : '—'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                    {KRITERIA_DETAIL.filter(k => item[k.key] != null).map(k => (
                                        <Tag key={k.key} className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 text-xs">
                                            {k.label} {formatNum(Number(item[k.key]))}/5
                                        </Tag>
                                    ))}
                                </div>
                                {item.catatan && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2.5">{item.catatan}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Dialog>
        </div>
    )
}
