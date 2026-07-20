'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Tag, Tooltip, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineExternalLink, HiOutlineEye } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { klienService, Klien, KlienProyek } from '@/services/klien.service'
import { fakturService, Faktur } from '@/services/faktur.service'

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

const PROYEK_STATUS_CLASS: Record<string, string> = {
    draft:   'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    aktif:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    batal:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

const FAKTUR_STATUS_CLASS: Record<string, string> = {
    draft:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    terkirim: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    lunas:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    batal:    'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

export default function KlienDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id }    = use(params)
    const router    = useRouter()

    const [klien, setKlien]     = useState<Klien | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Klien>>({})
    const [errors, setErrors]   = useState<Partial<Record<keyof typeof form, string>>>({})
    const [saving, setSaving]   = useState(false)

    const [proyekSummary, setProyekSummary]     = useState<KlienProyek[]>([])
    const [proyekLoading, setProyekLoading]     = useState(false)
    const [fakturList, setFakturList]         = useState<Faktur[]>([])
    const [fakturLoading, setFakturLoading]   = useState(false)

    const [proyekTableList, setProyekTableList]       = useState<KlienProyek[]>([])
    const [proyekTableLoading, setProyekTableLoading] = useState(false)
    const [proyekPage, setProyekPage]                 = useState(1)
    const [proyekMeta, setProyekMeta]                 = useState({ total: 0, totalPages: 1 })

    useEffect(() => {
        klienService.get(id)
            .then(k => { setKlien(k); setForm(k) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    // Ringkasan (dipakai kartu statistik) — ambil sampel proyek terbaru terlepas dari halaman tabel di bawah
    const fetchProyekSummary = useCallback(async () => {
        setProyekLoading(true)
        try {
            const res = await klienService.listProyek(id, 1, 100)
            setProyekSummary(res.data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setProyekLoading(false) }
    }, [id])

    // Tabel "Riwayat Proyek" — paginated dari backend. Menerima `page` secara eksplisit
    // (bukan bergantung pada state proyekPage) supaya tidak ada race saat id klien berganti.
    const fetchProyekTable = useCallback(async (page: number) => {
        setProyekPage(page)
        setProyekTableLoading(true)
        try {
            const res = await klienService.listProyek(id, page, 10)
            setProyekTableList(res.data)
            setProyekMeta({ total: res.meta.total, totalPages: res.meta.totalPages })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setProyekTableLoading(false) }
    }, [id])

    const fetchFaktur = useCallback(async () => {
        setFakturLoading(true)
        try {
            const res = await fakturService.listByKlien(id)
            setFakturList(res.data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setFakturLoading(false) }
    }, [id])

    useEffect(() => { fetchProyekSummary() }, [fetchProyekSummary])
    // fetchProyekTable diambil ulang identitasnya setiap `id` berganti (lihat useCallback di atas),
    // sehingga effect ini otomatis reset ke halaman 1 setiap kali klien berganti — tanpa effect terpisah
    // yang bisa balapan dengan effect fetch berbasis proyekPage.
    useEffect(() => { fetchProyekTable(1) }, [fetchProyekTable])
    useEffect(() => { fetchFaktur() }, [fetchFaktur])

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.kode_klien?.trim()) e.kode_klien = 'Kode klien wajib diisi'
        if (!form.nama_klien?.trim()) e.nama_klien = 'Nama klien wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setSaving(true)
        try {
            const updated = await klienService.update(id, form)
            setKlien(updated); setEditing(false); setErrors({})
            toast.push(<Notification type="success" title="Data klien berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setSaving(false) }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!klien)  return <div className="p-6 text-red-500">Klien tidak ditemukan.</div>

    const initial = klien.nama_klien?.charAt(0).toUpperCase() ?? 'K'

    const totalFaktur   = fakturList.reduce((s, f) => s + f.total, 0)
    const lunasFaktur   = fakturList.filter(f => f.status === 'lunas').reduce((s, f) => s + f.total, 0)

    // "Proyek Aktif" dihitung dari sampel listProyek(id,1,100) — jujurkan dengan awalan "≥" bila
    // total proyek klien melebihi jumlah baris sampel yang diambil (artinya sampel tidak lengkap).
    const proyekAktifSampleCount = proyekSummary.filter(p => p.status === 'aktif').length
    const proyekAktifIsEstimate  = proyekMeta.total > proyekSummary.length
    const proyekAktifDisplay: string | number = proyekAktifIsEstimate ? `≥${proyekAktifSampleCount}` : proyekAktifSampleCount

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.KLIEN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{klien.nama_klien}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kode: {klien.kode_klien}</p>
                </div>
            </div>

            {/* Summary stats */}
            {!proyekLoading && !fakturLoading && (proyekSummary.length > 0 || fakturList.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Proyek',    value: proyekMeta.total as string | number, color: 'text-gray-700 dark:text-gray-200', tooltip: undefined as string | undefined },
                        { label: 'Proyek Aktif',    value: proyekAktifDisplay, color: 'text-emerald-600 dark:text-emerald-400', tooltip: proyekAktifIsEstimate ? 'Dihitung dari 100 proyek terbaru' : undefined },
                        { label: 'Total Tagihan',   value: formatRupiah(totalFaktur) as string | number, color: 'text-yellow-700 dark:text-yellow-400', tooltip: undefined as string | undefined },
                        { label: 'Total Lunas',     value: formatRupiah(lunasFaktur) as string | number, color: 'text-blue-600 dark:text-blue-400', tooltip: undefined as string | undefined },
                    ].map(({ label, value, color, tooltip }) => (
                        <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 text-center">
                            {tooltip ? (
                                <Tooltip title={tooltip}>
                                    <p className={`text-lg font-bold ${color} truncate cursor-help`}>{value}</p>
                                </Tooltip>
                            ) : (
                                <p className={`text-lg font-bold ${color} truncate`}>{value}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Klien */}
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{klien.nama_klien}</p>
                                    <p className="text-sm text-gray-500 mt-1">Kode: {klien.kode_klien}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${klien.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {klien.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Kode Klien',  value: klien.kode_klien },
                                { label: 'Nama Klien',  value: klien.nama_klien },
                                { label: 'Email',       value: klien.email ?? <span className="text-gray-400">—</span> },
                                { label: 'Telepon',     value: klien.telepon ?? <span className="text-gray-400">—</span> },
                                { label: 'Kontak PIC',  value: klien.kontak_pic ?? <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                        {klien.alamat && (
                            <div className="mt-5">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Alamat</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line">{klien.alamat}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama_klien?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Klien</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi klien di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                <FormItem label="Kode Klien" asterisk invalid={!!errors.kode_klien} errorMessage={errors.kode_klien}>
                                    <Input value={form.kode_klien ?? ''} invalid={!!errors.kode_klien}
                                        onChange={e => setForm(p => ({ ...p, kode_klien: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Nama Klien" asterisk invalid={!!errors.nama_klien} errorMessage={errors.nama_klien}>
                                    <Input value={form.nama_klien ?? ''} invalid={!!errors.nama_klien}
                                        onChange={e => setForm(p => ({ ...p, nama_klien: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Email">
                                    <Input type="email" value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Telepon">
                                    <Input value={form.telepon ?? ''} onChange={e => setForm(p => ({ ...p, telepon: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Kontak PIC">
                                    <Input value={form.kontak_pic ?? ''} onChange={e => setForm(p => ({ ...p, kontak_pic: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Status">
                                    <Select isSearchable={false} options={AKTIF_OPTIONS}
                                        value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                                        onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === '1' }))} />
                                </FormItem>
                                <div className="sm:col-span-2">
                                    <FormItem label="Alamat">
                                        <Input textArea rows={3} value={form.alamat ?? ''}
                                            onChange={e => setForm(p => ({ ...p, alamat: e.target.value }))} />
                                    </FormItem>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(klien); setErrors({}) }}>Batal</Button>
                                <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                            </div>
                        </form>
                    </>
                )}
            </Card>

            {/* Riwayat Proyek */}
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Proyek</p>
                        <p className="text-xs text-gray-400 mt-0.5">Semua proyek yang pernah dikerjakan untuk klien ini</p>
                    </div>
                    <Button size="sm" variant="solid" onClick={() => router.push(ROUTES.PROYEK_BARU)}>+ Proyek Baru</Button>
                </div>

                {proyekTableLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : proyekTableList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada proyek</p>
                ) : (
                    <>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Kode Proyek</th>
                                        <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Nama Proyek</th>
                                        <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Status</th>
                                        <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Tanggal Mulai</th>
                                        <th className="py-2.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {proyekTableList.map(p => (
                                        <tr key={p.id_proyek}>
                                            <td className="py-3 pr-4 font-mono text-xs text-gray-500">{p.kode_proyek}</td>
                                            <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{p.nama_proyek}</td>
                                            <td className="py-3 pr-4">
                                                <Tag className={`text-xs font-semibold ${PROYEK_STATUS_CLASS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {p.status}
                                                </Tag>
                                            </td>
                                            <td className="py-3 pr-4 text-gray-500 whitespace-nowrap text-xs">
                                                {p.tanggal_mulai ? dayjs(p.tanggal_mulai).format('DD MMM YYYY') : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="py-3 text-right">
                                                <Tooltip title="Detail">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                        onClick={() => router.push(ROUTES.PROYEK_DETAIL(p.id_proyek))}
                                                    >
                                                        <HiOutlineEye className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {proyekMeta.totalPages > 1 && (
                            <div className="flex items-center justify-end gap-3 mt-4">
                                <span className="text-xs text-gray-400">Halaman {proyekPage} dari {proyekMeta.totalPages}</span>
                                <Button size="xs" variant="plain" disabled={proyekPage <= 1}
                                    onClick={() => fetchProyekTable(proyekPage - 1)}>Sebelumnya</Button>
                                <Button size="xs" variant="plain" disabled={proyekPage >= proyekMeta.totalPages}
                                    onClick={() => fetchProyekTable(proyekPage + 1)}>Selanjutnya</Button>
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* Riwayat Faktur */}
            <Card>
                <div className="mb-1">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Faktur</p>
                    <p className="text-xs text-gray-400 mt-0.5">Semua faktur yang pernah dibuat untuk klien ini</p>
                </div>

                {fakturLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : fakturList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada faktur untuk klien ini</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">No. Faktur</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Tanggal</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Jatuh Tempo</th>
                                    <th className="py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Total</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {fakturList.map(f => (
                                    <tr key={f.id_faktur}>
                                        <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{f.nomor_faktur}</td>
                                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap text-xs">
                                            {f.tanggal_faktur ? dayjs(f.tanggal_faktur).format('DD MMM YYYY') : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap text-xs">
                                            {f.jatuh_tempo ? dayjs(f.jatuh_tempo).format('DD MMM YYYY') : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-right font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {formatRupiah(f.total)}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Tag className={`text-xs font-semibold ${FAKTUR_STATUS_CLASS[f.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {f.status}
                                            </Tag>
                                        </td>
                                        <td className="py-3 text-right">
                                            <Button size="xs" variant="plain" icon={<HiOutlineExternalLink />}
                                                onClick={() => router.push(ROUTES.FAKTUR_DETAIL(f.id_faktur))} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
