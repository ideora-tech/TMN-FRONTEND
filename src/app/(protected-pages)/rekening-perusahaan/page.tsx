'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineTrash, HiOutlineEye, HiOutlineStar } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { rekeningPerusahaanService, RekeningPerusahaan } from '@/services/rekening-perusahaan.service'

export default function RekeningPerusahaanPage() {
    const router = useRouter()
    const [list, setList]             = useState<RekeningPerusahaan[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<RekeningPerusahaan | null>(null)
    const [utamaTarget, setUtamaTarget]   = useState<RekeningPerusahaan | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await rekeningPerusahaanService.list(currentPage, pageSize, search)
            if (res.data.length === 0 && currentPage > 1) {
                setCurrentPage(currentPage - 1)
                return
            }
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget || submitting) return
        setSubmitting(true)
        try {
            await rekeningPerusahaanService.delete(deleteTarget.id_rekening_perusahaan)
            toast.push(<Notification type="success" title="Rekening berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const handleJadikanUtama = async () => {
        if (!utamaTarget || submitting) return
        setSubmitting(true)
        try {
            await rekeningPerusahaanService.update(utamaTarget.id_rekening_perusahaan, { utama: true })
            toast.push(<Notification type="success" title="Rekening utama berhasil diganti" />)
            setUtamaTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setUtamaTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<RekeningPerusahaan>[] = [
        { header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<RekeningPerusahaan, unknown>) => (currentPage - 1) * pageSize + row.index + 1 },
        { header: 'Bank', accessorKey: 'nama_bank', size: 240,
            cell: ({ row }: CellContext<RekeningPerusahaan, unknown>) => {
                const initials = row.original.nama_bank.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {initials}
                        </div>
                        <span className="font-semibold">{row.original.nama_bank}</span>
                        {row.original.utama && (
                            <Tag className="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">Utama</Tag>
                        )}
                    </div>
                )
            },
        },
        { header: 'No. Rekening', accessorKey: 'nomor_rekening', size: 200,
            cell: ({ row }: CellContext<RekeningPerusahaan, unknown>) => (
                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{row.original.nomor_rekening}</span>
            ),
        },
        { header: 'Atas Nama', accessorKey: 'atas_nama_rekening', size: 260,
            cell: ({ row }: CellContext<RekeningPerusahaan, unknown>) => row.original.atas_nama_rekening
                ?? <span className="text-gray-400">—</span>,
        },
        { header: '', id: 'action', size: 130,
            cell: ({ row }: CellContext<RekeningPerusahaan, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    {!row.original.utama && (
                        <Tooltip title="Jadikan Rekening Utama">
                            <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 transition-colors"
                                onClick={() => setUtamaTarget(row.original)}>
                                <HiOutlineStar className="text-lg" />
                            </span>
                        </Tooltip>
                    )}
                    <Tooltip title="Detail">
                        <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.REKENING_PERUSAHAAN_DETAIL(row.original.id_rekening_perusahaan))}>
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                    {!(row.original.utama && total > 1) && (
                        <Tooltip title="Hapus">
                            <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                onClick={() => setDeleteTarget(row.original)}>
                                <HiOutlineTrash className="text-lg" />
                            </span>
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Rekening Perusahaan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Data master rekening bank perusahaan — rekening utama tercetak di invoice, semuanya bisa dipilih sebagai sumber pengisian kas kecil</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.REKENING_PERUSAHAAN_BARU)}>
                    Tambah Rekening
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input className="flex-1 min-w-60" placeholder="Cari bank, nomor rekening, atau atas nama... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }} />
                </div>
                <DataTable columns={columns} data={list as unknown[]} loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }} />
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Rekening?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}>
                <p className="text-sm">Rekening <span className="font-semibold">{deleteTarget?.nama_bank} {deleteTarget?.nomor_rekening}</span> akan dihapus dari master. Pengisian kas kecil yang sudah memakai rekening ini tetap menyimpan datanya.{deleteTarget?.utama ? ' Ini rekening utama — bila tidak ada rekening lain, invoice berikutnya tercetak tanpa rekening sampai rekening baru ditambahkan.' : ''}</p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={!!utamaTarget} type="info" title="Jadikan Rekening Utama?"
                confirmText="Ya, Jadikan Utama" cancelText="Batal"
                confirmButtonProps={{ loading: submitting }}
                onClose={() => setUtamaTarget(null)} onCancel={() => setUtamaTarget(null)} onConfirm={handleJadikanUtama}>
                <p className="text-sm">Rekening <span className="font-semibold">{utamaTarget?.nama_bank} {utamaTarget?.nomor_rekening}</span> akan menjadi rekening utama: tercetak di invoice berikutnya dan menjadi pilihan awal di pengisian kas kecil.</p>
            </ConfirmDialog>
        </div>
    )
}
