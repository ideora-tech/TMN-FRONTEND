'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Tag, Tooltip, Dialog, FormItem, Input, toast, Notification, Spinner, Upload } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineRefresh, HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineSearch, HiOutlineX, HiOutlineDownload, HiOutlineUpload } from 'react-icons/hi'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { payrollService, PayrollPeriode, PayrollSlip, RingkasanPayroll, ImportResultPayroll } from '@/services/payroll.service'

type EditForm = {
    tunjangan_lain: string
    keterangan_tunjangan: string
    uang_makan: string
    uang_makan_mingguan: string
    kasbon: string
    uang_jalan_terpakai: string
    tilangan: string
    potongan_lain: string
    keterangan_potongan: string
    pph21: string
    catatan: string
}

const EDIT_FORM_KOSONG: EditForm = {
    tunjangan_lain: '', keterangan_tunjangan: '', uang_makan: '', uang_makan_mingguan: '',
    kasbon: '', uang_jalan_terpakai: '', tilangan: '', potongan_lain: '', keterangan_potongan: '',
    pph21: '', catatan: '',
}

export default function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [periode, setPeriode]     = useState<PayrollPeriode | null>(null)
    const [ringkasan, setRingkasan] = useState<RingkasanPayroll | null>(null)
    const [slips, setSlips]         = useState<PayrollSlip[]>([])
    const [loading, setLoading]     = useState(true)
    const [prosesAksi, setProsesAksi] = useState(false)

    const [editTarget, setEditTarget] = useState<PayrollSlip | null>(null)
    const [editForm, setEditForm]     = useState<EditForm>(EDIT_FORM_KOSONG)
    const [savingEdit, setSavingEdit] = useState(false)

    const [konfirmasiFinal, setKonfirmasiFinal] = useState(false)
    const [konfirmasiGenerate, setKonfirmasiGenerate] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<ImportResultPayroll | null>(null)
    const [downloadingTemplate, setDownloadingTemplate] = useState(false)

    const [cari, setCari]               = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [downloadingId, setDownloadingId] = useState<string | null>(null)

    const handleDownloadSlip = async (s: PayrollSlip) => {
        setDownloadingId(s.id_slip)
        try {
            const res = await axios.get(API_ENDPOINTS.PAYROLL_SLIP_PDF(s.id_slip), { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = `slip-gaji-${s.karyawan_nik}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingId(null)
        }
    }

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await payrollService.detailPeriode(id)
            setPeriode(res.periode)
            setRingkasan(res.ringkasan)
            setSlips(res.slips)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { fetchData() }, [fetchData])

    const jalankan = async (aksi: () => Promise<unknown>, pesanSukses: string) => {
        setProsesAksi(true)
        try {
            await aksi()
            toast.push(<Notification type="success" title={pesanSukses} />)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setProsesAksi(false)
        }
    }

    const bukaEdit = (s: PayrollSlip) => {
        setEditTarget(s)
        setEditForm({
            tunjangan_lain: String(s.tunjangan_lain || ''),
            keterangan_tunjangan: s.keterangan_tunjangan ?? '',
            uang_makan: String(s.uang_makan || ''),
            uang_makan_mingguan: String(s.uang_makan_mingguan || ''),
            kasbon: String(s.kasbon || ''),
            uang_jalan_terpakai: String(s.uang_jalan_terpakai || ''),
            tilangan: String(s.tilangan || ''),
            potongan_lain: String(s.potongan_lain || ''),
            keterangan_potongan: s.keterangan_potongan ?? '',
            pph21: String(s.pph21 || ''),
            catatan: s.catatan ?? '',
        })
    }

    const handleSimpanEdit = async () => {
        if (!editTarget) return
        setSavingEdit(true)
        try {
            await payrollService.updateSlip(editTarget.id_slip, {
                tunjangan_lain: editForm.tunjangan_lain ? Number(editForm.tunjangan_lain) : 0,
                keterangan_tunjangan: editForm.keterangan_tunjangan || null,
                uang_makan: editForm.uang_makan ? Number(editForm.uang_makan) : 0,
                uang_makan_mingguan: editForm.uang_makan_mingguan ? Number(editForm.uang_makan_mingguan) : 0,
                kasbon: editForm.kasbon ? Number(editForm.kasbon) : 0,
                uang_jalan_terpakai: editForm.uang_jalan_terpakai ? Number(editForm.uang_jalan_terpakai) : 0,
                tilangan: editForm.tilangan ? Number(editForm.tilangan) : 0,
                potongan_lain: editForm.potongan_lain ? Number(editForm.potongan_lain) : 0,
                keterangan_potongan: editForm.keterangan_potongan || null,
                pph21: editForm.pph21 ? Number(editForm.pph21) : 0,
                catatan: editForm.catatan || null,
            })
            toast.push(<Notification type="success" title="Slip diperbarui" />)
            setEditTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingEdit(false)
        }
    }

    const handleImportFile = async (files: File[]) => {
        const file = files[0]
        if (!file) return
        setImporting(true)
        try {
            const result = await payrollService.importExcel(id, file)
            setImportResult(result)
            if (result.berhasil > 0 && result.gagal.length === 0) {
                toast.push(<Notification type="success" title={`${result.berhasil} slip berhasil diimport`} />)
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setImporting(false)
        }
    }

    const handleCloseImportResult = () => {
        const berhasil = importResult?.berhasil ?? 0
        setImportResult(null)
        if (berhasil > 0) fetchData()
    }

    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true)
        try {
            const res = await axios.get(API_ENDPOINTS.PAYROLL_IMPORT_TEMPLATE(id), { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = `template-gaji-${periode?.nama ?? 'periode'}.xlsx`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingTemplate(false)
        }
    }

    if (loading && !periode) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!periode) return <div className="p-6 text-red-500">Periode tidak ditemukan.</div>

    const draft = periode.status === 'draft'

    const slipsTersaring = slips.filter(s =>
        !cari
        || s.nama_karyawan.toLowerCase().includes(cari.toLowerCase())
        || s.karyawan_nik.toLowerCase().includes(cari.toLowerCase())
    )
    const slipsHalaman = slipsTersaring.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const strip = <span className="text-gray-300 dark:text-gray-600">—</span>

    const columns: ColumnDef<PayrollSlip>[] = [
        {
            header: 'Karyawan', accessorKey: 'nama_karyawan', size: 180,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) => (
                <div>
                    <p className="font-medium">{row.original.nama_karyawan}</p>
                    <p className="text-xs text-gray-400 font-mono">{row.original.karyawan_nik}</p>
                    {row.original.proyek && (
                        <p className="text-xs text-gray-400 truncate max-w-40">
                            {row.original.proyek}{row.original.tipe_truck ? ` · ${row.original.tipe_truck}` : ''}
                        </p>
                    )}
                    {row.original.catatan && (
                        <Tooltip title={row.original.catatan}>
                            <p className="text-xs text-amber-600 dark:text-amber-400 truncate max-w-40">{row.original.catatan}</p>
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            header: 'Gaji Pokok', accessorKey: 'gaji_pokok', size: 120,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) => formatRupiah(row.original.gaji_pokok),
        },
        {
            header: 'Lembur', accessorKey: 'upah_lembur', size: 120,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) =>
                row.original.upah_lembur > 0 ? (
                    <div>
                        <p>{formatRupiah(row.original.upah_lembur)}</p>
                        <p className="text-xs text-gray-400">{Math.floor(row.original.menit_lembur / 60)}j {row.original.menit_lembur % 60}m</p>
                    </div>
                ) : strip,
        },
        {
            header: 'Tunjangan', accessorKey: 'tunjangan_lain', size: 110,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) =>
                row.original.tunjangan_lain > 0
                    ? <span className="text-emerald-600">{formatRupiah(row.original.tunjangan_lain)}</span>
                    : strip,
        },
        {
            header: 'Uang Makan', accessorKey: 'uang_makan', size: 110,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) =>
                row.original.uang_makan > 0
                    ? <span className="text-emerald-600">{formatRupiah(row.original.uang_makan)}</span>
                    : strip,
        },
        {
            header: 'Pot. Absen', accessorKey: 'potongan_absen', size: 110,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) =>
                row.original.potongan_absen > 0 ? (
                    <div>
                        <p className="text-red-500">{formatRupiah(row.original.potongan_absen)}</p>
                        <p className="text-xs text-gray-400">{row.original.jumlah_alpha} alpha</p>
                    </div>
                ) : strip,
        },
        {
            header: 'BPJS', id: 'bpjs', size: 110,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) => {
                const total = Number(row.original.potongan_bpjs_kesehatan) + Number(row.original.potongan_bpjs_tk)
                return total > 0 ? <span className="text-red-500">{formatRupiah(total)}</span> : strip
            },
        },
        {
            header: 'PPh21', accessorKey: 'pph21', size: 100,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) =>
                row.original.pph21 > 0 ? <span className="text-red-500">{formatRupiah(row.original.pph21)}</span> : strip,
        },
        {
            header: 'Pot. Lain', accessorKey: 'potongan_lain', size: 100,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) =>
                row.original.potongan_lain > 0 ? <span className="text-red-500">{formatRupiah(row.original.potongan_lain)}</span> : strip,
        },
        {
            header: 'UM Mingguan', accessorKey: 'uang_makan_mingguan', size: 110,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) =>
                row.original.uang_makan_mingguan > 0 ? <span className="text-red-500">{formatRupiah(row.original.uang_makan_mingguan)}</span> : strip,
        },
        {
            header: 'Kasbon', accessorKey: 'kasbon', size: 100,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) =>
                row.original.kasbon > 0 ? <span className="text-red-500">{formatRupiah(row.original.kasbon)}</span> : strip,
        },
        {
            header: 'UJ Terpakai', accessorKey: 'uang_jalan_terpakai', size: 100,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) =>
                row.original.uang_jalan_terpakai > 0 ? <span className="text-red-500">{formatRupiah(row.original.uang_jalan_terpakai)}</span> : strip,
        },
        {
            header: 'Tilangan', accessorKey: 'tilangan', size: 100,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) =>
                row.original.tilangan > 0 ? <span className="text-red-500">{formatRupiah(row.original.tilangan)}</span> : strip,
        },
        {
            header: 'Gaji Bersih', accessorKey: 'gaji_bersih', size: 130,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) => (
                <span className="font-bold">{formatRupiah(row.original.gaji_bersih)}</span>
            ),
        },
        {
            header: '', id: 'action', size: 90,
            cell: ({ row }: CellContext<PayrollSlip, unknown>) => (
                <div className="flex items-center justify-end gap-1">
                    <Tooltip title="Download Slip PDF">
                        <span
                            className={`cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors ${downloadingId === row.original.id_slip ? 'opacity-50 pointer-events-none' : ''}`}
                            onClick={() => handleDownloadSlip(row.original)}>
                            <HiOutlineDownload className="text-lg" />
                        </span>
                    </Tooltip>
                    {draft && (
                        <Tooltip title="Koreksi slip">
                            <span
                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                onClick={() => bukaEdit(row.original)}>
                                <HiOutlinePencilAlt className="text-lg" />
                            </span>
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PAYROLL)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div className="flex-1 min-w-52">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold">Periode {periode.nama}</h3>
                        <Tag className={periode.status === 'final'
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100'}>
                            {periode.status === 'final' ? 'Final' : 'Draft'}
                        </Tag>
                    </div>
                    <p className="text-gray-500 text-sm mt-0.5">Slip gaji seluruh karyawan pada periode ini</p>
                </div>
                <div className="flex items-center gap-2">
                    {draft && (
                        <Button variant="default" size="sm" icon={<HiOutlineDownload />} loading={downloadingTemplate}
                            onClick={handleDownloadTemplate}>
                            Unduh Template
                        </Button>
                    )}
                    {draft && (
                        <Upload accept=".xlsx,.xls" showList={false} uploadLimit={1} onChange={handleImportFile}>
                            <Button type="button" variant="default" size="sm" icon={<HiOutlineUpload />} loading={importing}>
                                Import Excel
                            </Button>
                        </Upload>
                    )}
                    {draft && (
                        <Button variant="default" size="sm" icon={<HiOutlineRefresh />} loading={prosesAksi}
                            onClick={() => {
                                if (slips.length > 0) setKonfirmasiGenerate(true)
                                else jalankan(() => payrollService.generate(id), 'Slip berhasil digenerate')
                            }}>
                            {slips.length > 0 ? 'Generate Ulang' : 'Generate Slip'}
                        </Button>
                    )}
                    {draft ? (
                        <Button variant="solid" size="sm" icon={<HiOutlineLockClosed />} disabled={slips.length === 0 || prosesAksi}
                            onClick={() => setKonfirmasiFinal(true)}>
                            Finalisasi
                        </Button>
                    ) : (
                        <Button variant="default" size="sm" icon={<HiOutlineLockOpen />} loading={prosesAksi}
                            onClick={() => jalankan(() => payrollService.batalFinalisasi(id), 'Kembali ke draft')}>
                            Batal Finalisasi
                        </Button>
                    )}
                </div>
            </div>

            {ringkasan && slips.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: 'Jumlah Slip', value: `${ringkasan.jumlah_slip} karyawan` },
                        { label: 'Total Bruto', value: formatRupiah(ringkasan.total_bruto) },
                        { label: 'Total Potongan', value: formatRupiah(ringkasan.total_potongan) },
                        { label: 'Total Gaji Bersih', value: formatRupiah(ringkasan.total_gaji_bersih), highlight: true },
                    ].map(({ label, value, highlight }) => (
                        <div key={label} className={`rounded-lg p-3 ${highlight
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}`}>
                            <p className={`text-xs mb-1 ${highlight ? 'text-blue-500' : 'text-gray-500'}`}>{label}</p>
                            <p className={`font-semibold text-sm ${highlight ? 'text-blue-700 dark:text-blue-300' : ''}`}>{value}</p>
                        </div>
                    ))}
                </div>
            )}

            <Card bodyClass="p-0">
                {loading ? (
                    <div className="flex justify-center py-12"><Spinner size={36} /></div>
                ) : slips.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-10">
                        Belum ada slip — klik <span className="font-semibold">Generate Slip</span> untuk menghitung dari absensi,
                        atau <span className="font-semibold">Import Excel</span> untuk memuat dari file gaji.
                    </p>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <Input
                                className="flex-1 min-w-60"
                                placeholder="Cari nama atau NIK karyawan..."
                                suffix={cari
                                    ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setCari(''); setCurrentPage(1) }} />
                                    : <HiOutlineSearch className="text-gray-400 text-lg" />}
                                value={cari}
                                onChange={(e) => { setCari(e.target.value); setCurrentPage(1) }}
                            />
                        </div>
                        <DataTable
                            className="table-sticky-first"
                            columns={columns}
                            data={slipsHalaman as unknown[]}
                            loading={false}
                            noData={slipsTersaring.length === 0}
                            pagingData={{ total: slipsTersaring.length, pageIndex: currentPage, pageSize }}
                            onPaginationChange={setCurrentPage}
                            onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                        />
                    </>
                )}
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Batal</Button>
                </div>
            </Card>

            {/* Dialog Edit Slip */}
            <Dialog isOpen={!!editTarget} width={800} onRequestClose={() => setEditTarget(null)} onClose={() => setEditTarget(null)}>
                <h5 className="font-bold mb-1">Koreksi Slip — {editTarget?.nama_karyawan}</h5>
                <p className="text-xs text-gray-400 mb-4">
                    Gaji pokok, lembur, potongan absen & BPJS dihitung otomatis (generate ulang untuk menyegarkan). Di sini hanya komponen manual.
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSimpanEdit() }}>
                <div className="max-h-[65vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Tunjangan Lain (Rp)">
                            <Input type="number" min={0} value={editForm.tunjangan_lain}
                                onChange={e => setEditForm(p => ({ ...p, tunjangan_lain: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Keterangan Tunjangan">
                            <Input placeholder="Bonus, uang makan..." value={editForm.keterangan_tunjangan}
                                onChange={e => setEditForm(p => ({ ...p, keterangan_tunjangan: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Uang Makan (Rp)">
                            <Input type="number" min={0} value={editForm.uang_makan}
                                onChange={e => setEditForm(p => ({ ...p, uang_makan: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Uang Makan Mingguan (Rp)" extra={<span className="text-xs text-gray-400">Potongan</span>}>
                            <Input type="number" min={0} value={editForm.uang_makan_mingguan}
                                onChange={e => setEditForm(p => ({ ...p, uang_makan_mingguan: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Kasbon (Rp)">
                            <Input type="number" min={0} value={editForm.kasbon}
                                onChange={e => setEditForm(p => ({ ...p, kasbon: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Uang Jalan Terpakai (Rp)">
                            <Input type="number" min={0} value={editForm.uang_jalan_terpakai}
                                onChange={e => setEditForm(p => ({ ...p, uang_jalan_terpakai: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Tilangan (Rp)">
                            <Input type="number" min={0} value={editForm.tilangan}
                                onChange={e => setEditForm(p => ({ ...p, tilangan: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Potongan Lain (Rp)">
                            <Input type="number" min={0} value={editForm.potongan_lain}
                                onChange={e => setEditForm(p => ({ ...p, potongan_lain: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Keterangan Potongan">
                            <Input placeholder="Kasbon, cicilan..." value={editForm.keterangan_potongan}
                                onChange={e => setEditForm(p => ({ ...p, keterangan_potongan: e.target.value }))} />
                        </FormItem>
                        <FormItem label="PPh21 (Rp)" extra={<span className="text-xs text-gray-400">Boleh dikoreksi manual bila perlu</span>}>
                            <Input type="number" min={0} value={editForm.pph21}
                                onChange={e => setEditForm(p => ({ ...p, pph21: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Catatan" className="sm:col-span-2">
                            <Input value={editForm.catatan}
                                onChange={e => setEditForm(p => ({ ...p, catatan: e.target.value }))} />
                        </FormItem>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => setEditTarget(null)}>Batal</Button>
                    <Button type="submit" variant="solid" loading={savingEdit}>Simpan</Button>
                </div>
                </form>
            </Dialog>

            <ConfirmDialog
                isOpen={konfirmasiGenerate}
                type="warning"
                title="Generate Ulang Slip"
                confirmText="Ya, Generate Ulang"
                cancelText="Batal"
                onClose={() => setKonfirmasiGenerate(false)}
                onCancel={() => setKonfirmasiGenerate(false)}
                onConfirm={() => { setKonfirmasiGenerate(false); jalankan(() => payrollService.generate(id), 'Slip berhasil digenerate') }}
            >
                <p>Semua slip pada periode ini akan dihapus lalu dihitung ulang dari data absensi — termasuk hasil <span className="font-semibold">Import Excel</span> dan koreksi manual. Lanjutkan?</p>
            </ConfirmDialog>

            <Dialog isOpen={!!importResult} onRequestClose={handleCloseImportResult} onClose={handleCloseImportResult} width={560}>
                <h5 className="text-base font-semibold mb-4">Hasil Import Gaji</h5>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {importResult?.berhasil ?? 0} slip berhasil diimport
                </p>
                {importResult && importResult.gagal.length > 0 && (
                    <div className="overflow-x-auto mt-4 max-h-80 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Baris</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Nama</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Alasan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {importResult.gagal.map((g, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{g.baris}</td>
                                        <td className="py-2.5 px-3 text-xs text-gray-800 dark:text-gray-200">{g.nama || '-'}</td>
                                        <td className="py-2.5 px-3 text-red-500">{g.alasan}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex justify-end mt-6">
                    <Button variant="solid" onClick={handleCloseImportResult}>Tutup</Button>
                </div>
            </Dialog>

            <ConfirmDialog
                isOpen={konfirmasiFinal}
                type="warning"
                title="Finalisasi Periode"
                confirmText="Ya, Finalisasi"
                cancelText="Batal"
                onClose={() => setKonfirmasiFinal(false)}
                onCancel={() => setKonfirmasiFinal(false)}
                onConfirm={() => { setKonfirmasiFinal(false); jalankan(() => payrollService.finalisasi(id), 'Periode difinalisasi') }}
            >
                <p>Finalisasi periode {periode.nama}? Setelah final, slip terkunci dan tidak bisa digenerate ulang atau dikoreksi (kecuali finalisasi dibatalkan).</p>
            </ConfirmDialog>
        </div>
    )
}
