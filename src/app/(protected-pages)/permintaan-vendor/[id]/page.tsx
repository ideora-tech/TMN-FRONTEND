'use client'
import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Button, FormItem, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogApprovalDialog from '@/components/shared/LogApprovalDialog'
import AjukanApprovalDialog from '@/components/shared/AjukanApprovalDialog'
import dayjs from 'dayjs'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineDocumentText, HiOutlinePlus, HiOutlineClipboardList } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { permintaanVendorService, PermintaanVendor, itemUnitDiminta, ringkasanUnitDiminta, UnitDimintaPayload } from '@/services/permintaan-vendor.service'
import { projectService } from '@/services/project.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'

const MEKANISME_OPTIONS = [
    { value: 'unit_only',   label: 'Unit Only' },
    { value: 'unit_driver', label: 'Unit + Driver' },
    { value: 'full',        label: 'All In' },
]

const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'All In',
}

const STATUS_CLASS: Record<string, string> = {
    draft:             'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
    menunggu_approval: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    disetujui:         'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    ditolak:           'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
    dikontrakkan:      'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
}

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', menunggu_approval: 'Menunggu Approval', disetujui: 'Disetujui', ditolak: 'Ditolak', dikontrakkan: 'Dikontrakkan',
}

type FormState = {
    id_proyek: string
    mekanisme: string
    periode_dari: string
    periode_sampai: string
    catatan: string
}

const toFormState = (d: PermintaanVendor): FormState => ({
    id_proyek: d.id_proyek ?? '',
    mekanisme: d.mekanisme,
    periode_dari: d.periode_dari ?? '',
    periode_sampai: d.periode_sampai ?? '',
    catatan: d.catatan ?? '',
})

type UnitRow = { id_jenis_kendaraan: string; jumlah_unit: string }
const emptyUnitRow = (): UnitRow => ({ id_jenis_kendaraan: '', jumlah_unit: '1' })
const toUnitRows = (d: PermintaanVendor): UnitRow[] =>
    itemUnitDiminta(d).map(u => ({ id_jenis_kendaraan: u.id_jenis_kendaraan ?? '', jumlah_unit: String(u.jumlah_unit ?? 1) }))

export default function PermintaanVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const searchParams = useSearchParams()
    const [data, setData]       = useState<PermintaanVendor | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<FormState | null>(null)
    const [unitRows, setUnitRows] = useState<UnitRow[]>([emptyUnitRow()])
    const [errors, setErrors]   = useState<Record<string, string>>({})
    const [saving, setSaving]   = useState(false)
    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string }[]>([])
    const [jenisOptions, setJenisOptions]   = useState<{ value: string; label: string }[]>([])
    const [ajukanOpen, setAjukanOpen] = useState(false)
    const [logOpen, setLogOpen]       = useState(false)
    const [hapusOpen, setHapusOpen]   = useState(false)
    const [menghapus, setMenghapus]   = useState(false)

    const bisaUbah = data?.status === 'draft' || data?.status === 'ditolak'

    useEffect(() => {
        permintaanVendorService.get(id)
            .then(d => {
                setData(d)
                setForm(toFormState(d))
                setUnitRows(toUnitRows(d))
                if (searchParams.get('edit') === '1' && (d.status === 'draft' || d.status === 'ditolak')) {
                    setEditing(true)
                }
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id, searchParams])

    useEffect(() => {
        projectService.list(1, 200)
            .then(res => setProyekOptions(res.data.map(p => ({ value: p.id_proyek, label: p.nama_proyek }))))
            .catch(() => {})
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
    }, [])

    const ubahUnitRow = (i: number, patch: Partial<UnitRow>) =>
        setUnitRows(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
    const hapusUnitRow = (i: number) =>
        setUnitRows(prev => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))

    const handleSave = async () => {
        if (!form) return
        const e: Record<string, string> = {}
        if (!form.mekanisme) e.mekanisme = 'Mekanisme wajib dipilih'
        const jenisTerpakai = new Set<string>()
        unitRows.forEach((row, i) => {
            if (!row.jumlah_unit || Number(row.jumlah_unit) < 1) e[`unit_${i}_jumlah`] = 'Jumlah unit minimal 1'
            const key = row.id_jenis_kendaraan || '__kosong__'
            if (jenisTerpakai.has(key)) e.unit = 'Jenis kendaraan tidak boleh sama dengan baris lain (termasuk sama-sama kosong)'
            jenisTerpakai.add(key)
        })
        setErrors(e)
        if (Object.keys(e).length > 0) return
        setSaving(true)
        try {
            const unit: UnitDimintaPayload[] = unitRows.map(row => ({
                id_jenis_kendaraan: row.id_jenis_kendaraan || null,
                jumlah_unit: Number(row.jumlah_unit),
            }))
            const updated = await permintaanVendorService.update(id, {
                id_proyek: form.id_proyek || null,
                unit,
                mekanisme: form.mekanisme,
                periode_dari: form.periode_dari || null,
                periode_sampai: form.periode_sampai || null,
                catatan: form.catatan.trim() || null,
            })
            setData(updated)
            setForm(toFormState(updated))
            setUnitRows(toUnitRows(updated))
            setEditing(false)
            toast.push(<Notification type="success" title="Permintaan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setMenghapus(true)
        try {
            await permintaanVendorService.delete(id)
            toast.push(<Notification type="success" title="Permintaan berhasil dihapus" />)
            router.push(ROUTES.PERMINTAAN_VENDOR)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setHapusOpen(false)
            setMenghapus(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Permintaan tidak ditemukan.</div>

    const unitItems = itemUnitDiminta(data)
    const periode = (!data.periode_dari && !data.periode_sampai)
        ? null
        : `${data.periode_dari ? dayjs(data.periode_dari).format('DD/MM/YYYY') : '…'} – ${data.periode_sampai ? dayjs(data.periode_sampai).format('DD/MM/YYYY') : '…'}`

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PERMINTAAN_VENDOR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.nomor_permintaan}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Permintaan vendor — {MEKANISME_LABEL[data.mekanisme] ?? data.mekanisme}</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold text-xl flex-shrink-0 select-none">
                                    {data.nomor_permintaan.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nomor_permintaan}</p>
                                    <p className="text-sm text-gray-500 mt-1">{ringkasanUnitDiminta(data)} · {MEKANISME_LABEL[data.mekanisme] ?? data.mekanisme}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
                                <Tag className={`${STATUS_CLASS[data.status] ?? 'bg-gray-100 text-gray-600'} border-0`}>
                                    {STATUS_LABEL[data.status] ?? data.status}
                                </Tag>
                                {data.status === 'draft' && (
                                    <Button variant="solid" size="sm" onClick={() => setAjukanOpen(true)}>
                                        Ajukan Approval
                                    </Button>
                                )}
                                {data.status === 'disetujui' && (
                                    <Button variant="solid" size="sm" icon={<HiOutlineDocumentText />}
                                        onClick={() => router.push(`${ROUTES.KONTRAK_VENDOR_BARU}?id_permintaan=${id}`)}>
                                        Buat Kontrak
                                    </Button>
                                )}
                                {data.status === 'dikontrakkan' && data.id_kontrak_vendor && (
                                    <Button variant="solid" size="sm" icon={<HiOutlineDocumentText />}
                                        onClick={() => router.push(ROUTES.KONTRAK_VENDOR_DETAIL(data.id_kontrak_vendor!))}>
                                        Lihat Kontrak
                                    </Button>
                                )}
                                <Tooltip title="Log Approval">
                                    <Button variant="default" size="sm" icon={<HiOutlineClipboardList />} onClick={() => setLogOpen(true)} />
                                </Tooltip>
                                {bisaUbah && (
                                    <Tooltip title="Edit">
                                        <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)} />
                                    </Tooltip>
                                )}
                                {bisaUbah && (
                                    <Tooltip title="Hapus">
                                        <Button variant="default" size="sm" icon={<HiOutlineTrash />}
                                            className="text-red-500 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
                                            onClick={() => setHapusOpen(true)} />
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                        {data.status === 'ditolak' && data.alasan_ditolak && (
                            <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-sm text-red-600 dark:text-red-300">
                                Ditolak approver: {data.alasan_ditolak} — perbaiki lalu ajukan ulang.
                            </div>
                        )}
                        {data.status === 'menunggu_approval' && (
                            <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-sm text-violet-600 dark:text-violet-300">
                                Permintaan sedang menunggu keputusan approver — data tidak bisa diubah sampai ada keputusan.
                            </div>
                        )}
                        {data.status === 'disetujui' && (
                            <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-sm text-emerald-600 dark:text-emerald-300">
                                Permintaan disetujui — lanjutkan dengan membuat kontrak vendor dari permintaan ini.
                            </div>
                        )}
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'No. Permintaan',   value: data.nomor_permintaan },
                                { label: 'Status',           value: STATUS_LABEL[data.status] ?? data.status },
                                { label: 'Proyek',           value: data.nama_proyek ?? <span className="text-gray-400">—</span> },
                                { label: 'Mekanisme',        value: MEKANISME_LABEL[data.mekanisme] ?? data.mekanisme },
                                { label: 'Periode',          value: periode ?? <span className="text-gray-400">—</span> },
                                { label: 'Kontrak Terkait',  value: data.id_kontrak_vendor
                                    ? <span className="cursor-pointer text-blue-600 hover:underline"
                                        onClick={() => router.push(ROUTES.KONTRAK_VENDOR_DETAIL(data.id_kontrak_vendor!))}>
                                        {data.nomor_kontrak ?? 'Lihat kontrak'}
                                    </span>
                                    : <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                            <div className="sm:col-span-2">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Unit Diminta</p>
                                <ul className="flex flex-col gap-0.5">
                                    {unitItems.map((u, i) => (
                                        <li key={i} className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                            {u.nama_jenis_kendaraan ?? 'Unit'} × {u.jumlah_unit}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Catatan</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line">{data.catatan ?? '—'}</p>
                            </div>
                        </div>
                        <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.push(ROUTES.PERMINTAAN_VENDOR)}>Batal</Button>
                        </div>
                    </>
                ) : form && (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold text-xl flex-shrink-0 select-none">
                                {data.nomor_permintaan.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Permintaan Vendor</p>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {data.status === 'ditolak'
                                        ? 'Permintaan yang ditolak akan kembali ke Draft setelah disimpan — ajukan ulang setelah selesai'
                                        : 'Perbarui informasi permintaan di bawah ini'}
                                </p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Proyek (opsional)">
                                <Select isSearchable isClearable placeholder="Pilih proyek..."
                                    options={proyekOptions}
                                    value={proyekOptions.find(o => o.value === form.id_proyek) ?? null}
                                    onChange={opt => setForm(p => p && ({ ...p, id_proyek: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Mekanisme" asterisk invalid={!!errors.mekanisme} errorMessage={errors.mekanisme}>
                                <Select isSearchable={false} options={MEKANISME_OPTIONS}
                                    value={MEKANISME_OPTIONS.find(o => o.value === form.mekanisme) ?? null}
                                    onChange={opt => setForm(p => p && ({ ...p, mekanisme: opt?.value ?? 'unit_only' }))} />
                            </FormItem>
                            <FormItem label="Unit Diminta" asterisk className="sm:col-span-2" invalid={!!errors.unit} errorMessage={errors.unit}>
                                <div className="flex flex-col gap-2">
                                    {unitRows.map((row, i) => {
                                        const opsiJenis = jenisOptions.filter(o =>
                                            o.value === row.id_jenis_kendaraan ||
                                            !unitRows.some((r, idx) => idx !== i && r.id_jenis_kendaraan === o.value))
                                        return (
                                            <div key={i} className="flex items-start gap-2">
                                                <div className="flex-1">
                                                    <Select isSearchable isClearable placeholder="Jenis kendaraan (opsional)..."
                                                        options={opsiJenis}
                                                        value={opsiJenis.find(o => o.value === row.id_jenis_kendaraan) ?? null}
                                                        onChange={opt => ubahUnitRow(i, { id_jenis_kendaraan: opt?.value ?? '' })} />
                                                </div>
                                                <div className="w-28 flex-shrink-0">
                                                    <Input suffix="unit" placeholder="1" value={row.jumlah_unit} invalid={!!errors[`unit_${i}_jumlah`]}
                                                        onChange={e => ubahUnitRow(i, { jumlah_unit: e.target.value.replace(/\D/g, '') })} />
                                                    {errors[`unit_${i}_jumlah`] && <p className="text-red-500 text-xs mt-1">{errors[`unit_${i}_jumlah`]}</p>}
                                                </div>
                                                <button type="button" disabled={unitRows.length <= 1} onClick={() => hapusUnitRow(i)}
                                                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed dark:bg-red-500/20 dark:text-red-400 transition-colors flex-shrink-0">
                                                    <HiOutlineTrash />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                                <button type="button" onClick={() => setUnitRows(prev => [...prev, emptyUnitRow()])}
                                    className="mt-2 inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium">
                                    <HiOutlinePlus /> Tambah Jenis
                                </button>
                            </FormItem>
                            <FormItem label="Periode (opsional)" className="sm:col-span-2">
                                <DatePicker.DatePickerRange
                                    placeholder="Pilih rentang periode kebutuhan..."
                                    value={[
                                        form.periode_dari ? dayjs(form.periode_dari).toDate() : null,
                                        form.periode_sampai ? dayjs(form.periode_sampai).toDate() : null,
                                    ]}
                                    onChange={([awal, akhir]) => setForm(p => p && ({
                                        ...p,
                                        periode_dari: awal ? dayjs(awal).format('YYYY-MM-DD') : '',
                                        periode_sampai: akhir ? dayjs(akhir).format('YYYY-MM-DD') : '',
                                    }))} />
                            </FormItem>
                            <FormItem label="Catatan" className="sm:col-span-2">
                                <Input textArea rows={3} placeholder="Kebutuhan khusus, spesifikasi unit, dsb. (opsional)"
                                    value={form.catatan}
                                    onChange={e => setForm(p => p && ({ ...p, catatan: e.target.value }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => {
                                setEditing(false)
                                setForm(toFormState(data))
                                setUnitRows(toUnitRows(data))
                                setErrors({})
                            }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>

            <ConfirmDialog
                isOpen={hapusOpen}
                type="danger"
                title="Hapus Permintaan"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: menghapus, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setHapusOpen(false)}
                onCancel={() => setHapusOpen(false)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">Permintaan <span className="font-semibold">{data.nomor_permintaan}</span> akan dihapus secara permanen. Lanjutkan?</p>
            </ConfirmDialog>

            <LogApprovalDialog
                isOpen={logOpen}
                onClose={() => setLogOpen(false)}
                kode="permintaan_vendor"
                idReferensi={id}
                emptyMessage="Belum ada pengajuan approval untuk permintaan ini — ajukan dari tombol Ajukan Approval."
            />

            <AjukanApprovalDialog
                isOpen={ajukanOpen}
                onClose={() => setAjukanOpen(false)}
                kode="permintaan_vendor"
                idReferensi={id}
                nomor={data.nomor_permintaan}
                onAjukan={async () => {
                    const updated = await permintaanVendorService.ajukanApproval(id)
                    setData(updated)
                    setForm(toFormState(updated))
                    setUnitRows(toUnitRows(updated))
                }}
                onSukses={() => { }}
            />
        </div>
    )
}
