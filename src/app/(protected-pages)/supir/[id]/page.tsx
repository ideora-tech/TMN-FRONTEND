'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, Tag, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineExclamationCircle, HiOutlineExternalLink } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { supirService, Supir } from '@/services/supir.service'
import { jadwalService, Jadwal } from '@/services/jadwal.service'
import { penugasanService, Penugasan } from '@/services/penugasan.service'
import { armadaService, Armada } from '@/services/armada.service'

const JENIS_SIM_OPTIONS = ['A', 'B1', 'B2', 'C', 'D'].map(j => ({ value: j, label: j }))

const STATUS_OPTIONS = [
    { value: 'aktif',    label: 'Aktif' },
    { value: 'nonaktif', label: 'Nonaktif' },
]

const statusClass: Record<string, string> = {
    aktif:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    nonaktif: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

const JADWAL_STATUS_CLASS: Record<string, string> = {
    terjadwal:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    berjalan:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    selesai:    'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    dibatalkan: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

export default function SupirDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router  = useRouter()

    // supir
    const [supir, setSupir]     = useState<Supir | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Supir>>({})
    const [saving, setSaving]   = useState(false)

    // jadwal history
    const [jadwalList, setJadwalList]       = useState<Jadwal[]>([])
    const [jadwalLoading, setJadwalLoading] = useState(false)
    const [jadwalTotal, setJadwalTotal]     = useState(0)

    // penugasan (armada) history
    const [penugasanList, setPenugasanList]       = useState<Penugasan[]>([])
    const [penugasanLoading, setPenugasanLoading] = useState(false)
    const [armadaMap, setArmadaMap]               = useState<Record<string, Armada>>({})

    useEffect(() => {
        supirService.get(id)
            .then(s => { setSupir(s); setForm(s) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const fetchJadwal = useCallback(async () => {
        setJadwalLoading(true)
        try {
            const res = await jadwalService.listBySupir(id)
            setJadwalList(res.data)
            setJadwalTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setJadwalLoading(false)
        }
    }, [id])

    useEffect(() => { fetchJadwal() }, [fetchJadwal])

    const fetchPenugasan = useCallback(async () => {
        setPenugasanLoading(true)
        try {
            const res = await penugasanService.listBySupir(id)
            setPenugasanList(res.data)
            // fetch armada details for display
            const ids = [...new Set(res.data.map(p => p.id_armada).filter(Boolean))] as string[]
            if (ids.length > 0) {
                const armadas = await Promise.all(ids.map(aid => armadaService.get(aid).catch(() => null)))
                const map: Record<string, Armada> = {}
                armadas.forEach(a => { if (a) map[a.id_armada] = a })
                setArmadaMap(map)
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setPenugasanLoading(false) }
    }, [id])

    useEffect(() => { fetchPenugasan() }, [fetchPenugasan])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await supirService.update(id, form)
            setSupir(updated); setEditing(false)
            toast.push(<Notification type="success" title="Data supir berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setSaving(false) }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!supir)  return <div className="p-6 text-red-500">Supir tidak ditemukan.</div>

    const daysLeft   = supir.tgl_kadaluarsa_sim
        ? Math.ceil((new Date(supir.tgl_kadaluarsa_sim).getTime() - Date.now()) / 86400000)
        : null
    const simWarning = daysLeft !== null && daysLeft < 30
    const initial    = supir.nama?.charAt(0).toUpperCase() ?? '?'

    const aktif   = jadwalList.filter(j => j.status === 'berjalan').length
    const selesai = jadwalList.filter(j => j.status === 'selesai').length

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.SUPIR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{supir.nama}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan pengelolaan data supir</p>
                </div>
            </div>

            {/* SIM expiry warning */}
            {simWarning && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                    <HiOutlineExclamationCircle className="text-lg flex-shrink-0" />
                    <span>
                        SIM kadaluarsa dalam <strong>{daysLeft} hari</strong> ({supir.tgl_kadaluarsa_sim})
                    </span>
                </div>
            )}

            {/* Ringkasan statistik */}
            {!jadwalLoading && jadwalTotal > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Total Jadwal', value: jadwalTotal, color: 'text-gray-700 dark:text-gray-200' },
                        { label: 'Sedang Berjalan', value: aktif, color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'Selesai', value: selesai, color: 'text-blue-600 dark:text-blue-400' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 text-center">
                            <p className={`text-2xl font-bold ${color}`}>{value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Supir */}
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{supir.nama}</p>
                                    <p className="text-sm text-gray-500 mt-1">SIM {supir.jenis_sim ?? '-'} · {supir.no_sim ?? '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Tag className={`text-xs font-semibold ${statusClass[supir.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {supir.status}
                                </Tag>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Nomor SIM', value: supir.no_sim ?? '—' },
                                { label: 'Jenis SIM', value: supir.jenis_sim ?? '—' },
                                {
                                    label: 'Kadaluarsa SIM',
                                    value: supir.tgl_kadaluarsa_sim
                                        ? <span className={simWarning ? 'text-amber-600 font-semibold dark:text-amber-400' : ''}>
                                            {dayjs(supir.tgl_kadaluarsa_sim).format('DD MMM YYYY')}
                                          </span>
                                        : <span className="text-gray-400">—</span>,
                                },
                                { label: 'Telepon', value: supir.telepon ?? <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base">Edit Data Supir</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi supir di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                <FormItem label="Nama">
                                    <Input value={form.nama ?? ''} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Telepon">
                                    <Input value={form.telepon ?? ''} onChange={e => setForm(p => ({ ...p, telepon: e.target.value }))} />
                                </FormItem>
                                <FormItem label="No SIM">
                                    <Input value={form.no_sim ?? ''} onChange={e => setForm(p => ({ ...p, no_sim: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Jenis SIM">
                                    <Select isSearchable={false}
                                        value={JENIS_SIM_OPTIONS.find(o => o.value === form.jenis_sim) ?? null}
                                        options={JENIS_SIM_OPTIONS}
                                        onChange={opt => opt && setForm(p => ({ ...p, jenis_sim: opt.value }))} />
                                </FormItem>
                                <FormItem label="Tgl Kadaluarsa SIM">
                                    <DatePicker
                                        value={form.tgl_kadaluarsa_sim ? new Date(form.tgl_kadaluarsa_sim) : null}
                                        onChange={date => setForm(p => ({ ...p, tgl_kadaluarsa_sim: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                                </FormItem>
                                <FormItem label="Status">
                                    <Select isSearchable={false}
                                        value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                                        options={STATUS_OPTIONS}
                                        onChange={opt => opt && setForm(p => ({ ...p, status: opt.value as 'aktif' | 'nonaktif' }))} />
                                </FormItem>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(supir) }}>Batal</Button>
                                <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                            </div>
                        </form>
                    </>
                )}
            </Card>

            {/* Riwayat Armada (Penugasan) */}
            <Card>
                <div className="mb-1">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Armada</p>
                    <p className="text-xs text-gray-400 mt-0.5">Armada yang pernah ditugaskan ke supir ini</p>
                </div>

                {penugasanLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : penugasanList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada riwayat penugasan armada</p>
                ) : (
                    <div className="overflow-x-auto -mx-5 mt-4">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Armada</th>
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Tanggal</th>
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                                    <th className="py-3 px-5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {penugasanList.map(p => {
                                    const arm = p.id_armada ? armadaMap[p.id_armada] : null
                                    return (
                                        <tr key={p.id_penugasan} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="py-3 px-5">
                                                {arm ? (
                                                    <div>
                                                        <p className="font-semibold text-gray-800 dark:text-gray-100">{arm.nopol}</p>
                                                        <p className="text-xs text-gray-400">{arm.merk} {arm.model ?? ''}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">{p.id_armada ?? '—'}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-5 text-gray-600 dark:text-gray-400">
                                                {p.tanggal_tugas ? dayjs(p.tanggal_tugas).format('DD MMM YYYY') : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="py-3 px-5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    p.status === 'aktif'   ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    p.status === 'selesai' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    p.status === 'batal'   ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>{p.status}</span>
                                            </td>
                                            <td className="py-3 px-5 text-right">
                                                <Button size="xs" variant="plain" icon={<HiOutlineExternalLink />}
                                                    onClick={() => router.push(ROUTES.PENUGASAN_DETAIL(p.id_penugasan))} />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Riwayat Jadwal */}
            <Card>
                <div className="mb-1">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Jadwal Perjalanan</p>
                    <p className="text-xs text-gray-400 mt-0.5">Semua jadwal yang pernah ditugaskan ke supir ini</p>
                </div>

                {jadwalLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : jadwalList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada riwayat perjalanan</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Waktu Berangkat</th>
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Estimasi Tiba</th>
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Rute</th>
                                    <th className="pb-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Status</th>
                                    <th className="pb-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {jadwalList.map(j => (
                                    <tr key={j.id_jadwal}>
                                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {j.tgl_keberangkatan
                                                ? dayjs(j.tgl_keberangkatan).format('DD MMM YYYY HH:mm')
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                                            {j.estimasi_tiba
                                                ? dayjs(j.estimasi_tiba).format('DD MMM YYYY HH:mm')
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                                            {j.rute ?? <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Tag className={`text-xs font-semibold ${JADWAL_STATUS_CLASS[j.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {j.status}
                                            </Tag>
                                        </td>
                                        <td className="py-3 text-right">
                                            <Button size="xs" variant="plain" icon={<HiOutlineExternalLink />}
                                                onClick={() => router.push(ROUTES.JADWAL_DETAIL(j.id_jadwal))} />
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
