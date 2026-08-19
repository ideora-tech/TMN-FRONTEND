'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Card, Button, Dialog, FormItem, Input, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import Tabs from '@/components/ui/Tabs'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { arusKasService, KategoriPengajuan, PengajuanPengeluaran } from '@/services/arusKas.service'
import { KATEGORI_LABEL, KATEGORI_OPTIONS_FORM, KATEGORI_OPTIONS_FILTER } from '../arus-kas/pengajuanMeta'
import PengajuanBulkTable from './PengajuanBulkTable'

type Option = { value: string; label: string }

const MAX_FILE_SIZE = 5 * 1024 * 1024
type TabValue = 'menunggu' | 'disetujui' | 'ditolak' | 'ditransfer'

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

export default function ProsesPembayaranPage() {
    const [activeTab, setActiveTab] = useState<TabValue>('menunggu')
    const [list, setList]           = useState<PengajuanPengeluaran[]>([])
    const [loading, setLoading]     = useState(false)
    const [kategoriFilter, setKategoriFilter] = useState('')
    const [search, setSearch]       = useState('')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const data = await arusKasService.listPengajuan()
            setList(data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const filteredList = useMemo(() => {
        const q = search.trim().toLowerCase()
        return list.filter(p => {
            if (kategoriFilter && p.kategori !== kategoriFilter) return false
            if (q && !p.nomor_pengajuan.toLowerCase().includes(q) && !p.penerima.toLowerCase().includes(q)) return false
            return true
        })
    }, [list, kategoriFilter, search])

    const menunggu   = useMemo(() => filteredList.filter(p => p.status === 'diajukan' || p.status === 'dicek' || p.status === 'menunggu_approval'), [filteredList])
    const disetujui  = useMemo(() => filteredList.filter(p => p.status === 'disetujui'), [filteredList])
    const ditolak    = useMemo(() => filteredList.filter(p => p.status === 'ditolak'), [filteredList])
    const ditransfer = useMemo(() => filteredList.filter(p => p.status === 'ditransfer'), [filteredList])

    const [showForm, setShowForm]     = useState(false)
    const [editTarget, setEditTarget] = useState<PengajuanPengeluaran | null>(null)
    const [form, setForm]             = useState<PengajuanForm>(emptyForm())
    const [file, setFile]             = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<PengajuanPengeluaran | null>(null)

    const openAdd = () => { setEditTarget(null); setForm(emptyForm()); setFile(null); setShowForm(true) }

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
        setShowForm(true)
    }

    const closeForm = () => { setShowForm(false); setEditTarget(null) }

    const validasiFile = (f: File | null, set: (f: File | null) => void) => {
        if (f && f.size > MAX_FILE_SIZE) {
            toast.push(<Notification type="danger" title={`Ukuran file maksimal 5 MB (file dipilih: ${(f.size / 1024 / 1024).toFixed(1)} MB)`} />)
            return
        }
        set(f)
    }

    const handleSubmitForm = async () => {
        if (!form.kategori || !form.nominal || !form.tanggal_pengajuan || !form.penerima.trim()) return
        const payload = {
            kategori: form.kategori as KategoriPengajuan,
            nominal: Number(form.nominal),
            tanggal_pengajuan: form.tanggal_pengajuan,
            penerima: form.penerima.trim(),
            keterangan: form.keterangan.trim() || null,
        }
        setSubmitting(true)
        try {
            if (editTarget) {
                await arusKasService.updatePengajuan(editTarget.id_pengajuan, payload, file)
                toast.push(<Notification type="success" title="Pengajuan berhasil diperbarui" />)
            } else {
                await arusKasService.createPengajuan(payload, file)
                toast.push(<Notification type="success" title="Pengajuan berhasil dibuat" />)
            }
            closeForm()
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await arusKasService.deletePengajuan(deleteTarget.id_pengajuan)
            toast.push(<Notification type="success" title="Pengajuan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const editOtomatis = !!(editTarget && (editTarget.id_trip || editTarget.id_perawatan || editTarget.id_pembelian || editTarget.id_periode || editTarget.periode_dari))
    const kategoriFormOptions = editOtomatis && form.kategori
        ? [{ value: form.kategori, label: KATEGORI_LABEL[form.kategori] }]
        : KATEGORI_OPTIONS_FORM

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-bold">Proses Pembayaran</h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Buat, cek, setujui/tolak, dan transfer pengajuan pengeluaran — satu per satu atau sekaligus
                    </p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={openAdd}>
                    Tambah Pengajuan
                </Button>
            </div>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nomor pengajuan atau penerima..."
                        suffix={search
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => setSearch('')} />
                            : <HiOutlineSearch className="text-gray-400 text-lg" />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <div className="w-full sm:w-56 shrink-0">
                        <Select
                            isSearchable={false}
                            placeholder="Semua kategori"
                            isClearable
                            options={KATEGORI_OPTIONS_FILTER}
                            value={KATEGORI_OPTIONS_FILTER.find(o => o.value === kategoriFilter) ?? null}
                            onChange={opt => setKategoriFilter((opt as Option | null)?.value ?? '')}
                        />
                    </div>
                    {loading && <Spinner size={20} />}
                </div>

                <Tabs value={activeTab} onChange={val => setActiveTab(val as TabValue)}>
                    <Tabs.TabList>
                        <Tabs.TabNav value="menunggu">Menunggu ({menunggu.length})</Tabs.TabNav>
                        <Tabs.TabNav value="disetujui">Disetujui ({disetujui.length})</Tabs.TabNav>
                        <Tabs.TabNav value="ditolak">Ditolak ({ditolak.length})</Tabs.TabNav>
                        <Tabs.TabNav value="ditransfer">Sudah Transfer ({ditransfer.length})</Tabs.TabNav>
                    </Tabs.TabList>
                    <div className="p-4">
                        <Tabs.TabContent value="menunggu">
                            <PengajuanBulkTable
                                list={menunggu} loading={loading}
                                bulkActions={['cek', 'setuju', 'tolak']}
                                showStatusColumn
                                onRefresh={fetchData}
                                onEdit={openEdit}
                                onDelete={setDeleteTarget}
                            />
                        </Tabs.TabContent>
                        <Tabs.TabContent value="disetujui">
                            <PengajuanBulkTable
                                list={disetujui} loading={loading}
                                bulkActions={['transfer']}
                                showStatusColumn={false}
                                onRefresh={fetchData}
                            />
                        </Tabs.TabContent>
                        <Tabs.TabContent value="ditolak">
                            <PengajuanBulkTable
                                list={ditolak} loading={loading}
                                bulkActions={[]}
                                showStatusColumn={false}
                                extraColumn="ditolak"
                                onRefresh={fetchData}
                            />
                        </Tabs.TabContent>
                        <Tabs.TabContent value="ditransfer">
                            <PengajuanBulkTable
                                list={ditransfer} loading={loading}
                                bulkActions={[]}
                                showStatusColumn={false}
                                extraColumn="ditransfer"
                                onRefresh={fetchData}
                            />
                        </Tabs.TabContent>
                    </div>
                </Tabs>
            </Card>

            <Dialog isOpen={showForm} onRequestClose={closeForm} onClose={closeForm} width={640}>
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

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Pengajuan"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus pengajuan {deleteTarget?.nomor_pengajuan}? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>
        </div>
    )
}
