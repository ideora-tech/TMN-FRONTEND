'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineExclamationCircle } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { supirService, Supir } from '@/services/supir.service'

const JENIS_SIM_OPTIONS = ['A', 'B1', 'B2', 'C', 'D'].map(j => ({ value: j, label: j }))

const STATUS_OPTIONS = [
    { value: 'aktif',    label: 'Aktif' },
    { value: 'nonaktif', label: 'Nonaktif' },
]

const statusClass: Record<string, string> = {
    aktif:    'bg-emerald-100 text-emerald-600',
    nonaktif: 'bg-red-100 text-red-500',
}

export default function SupirDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [supir, setSupir]     = useState<Supir | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Supir>>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        supirService.get(id)
            .then(s => { setSupir(s); setForm(s) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await supirService.update(id, form)
            setSupir(updated)
            setEditing(false)
            toast.push(<Notification type="success" title="Data supir berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!supir)  return <div className="p-6 text-red-500">Supir tidak ditemukan.</div>

    const daysLeft = supir.tgl_kadaluarsa_sim
        ? Math.ceil((new Date(supir.tgl_kadaluarsa_sim).getTime() - Date.now()) / 86400000)
        : null
    const simWarning = daysLeft !== null && daysLeft < 30
    const initial = supir.nama?.charAt(0).toUpperCase() ?? '?'

    return (
        <div className="flex flex-col gap-4">
            {/* Page header */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.SUPIR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
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

            <Card>
                {!editing ? (
                    <>
                        {/* Profile header */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{supir.nama}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        SIM {supir.jenis_sim ?? '-'} &nbsp;·&nbsp; {supir.no_sim ?? '-'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass[supir.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {supir.status}
                                </span>
                                <Button
                                    variant="solid"
                                    size="sm"
                                    icon={<HiOutlinePencilAlt />}
                                    onClick={() => setEditing(true)}
                                >
                                    Edit
                                </Button>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                        {/* Info grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Nomor SIM',      value: supir.no_sim ?? '-' },
                                { label: 'Jenis SIM',      value: supir.jenis_sim ?? '-' },
                                {
                                    label: 'Kadaluarsa SIM',
                                    value: supir.tgl_kadaluarsa_sim
                                        ? <span className={simWarning ? 'text-amber-600 font-semibold dark:text-amber-400' : ''}>{supir.tgl_kadaluarsa_sim}</span>
                                        : <span className="text-gray-400">—</span>,
                                },
                                {
                                    label: 'Telepon',
                                    value: supir.telepon ?? <span className="text-gray-400">—</span>,
                                },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                                        {label}
                                    </p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Edit header */}
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Data Supir</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi supir di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />

                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nama">
                                <Input value={form.nama ?? ''} onChange={(e) => setForm(p => ({ ...p, nama: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Telepon">
                                <Input value={form.telepon ?? ''} onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                            </FormItem>
                            <FormItem label="No SIM">
                                <Input value={form.no_sim ?? ''} onChange={(e) => setForm(p => ({ ...p, no_sim: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Jenis SIM">
                                <Select
                                    isSearchable={false}
                                    value={JENIS_SIM_OPTIONS.find(o => o.value === form.jenis_sim) ?? null}
                                    options={JENIS_SIM_OPTIONS}
                                    onChange={(option) => option && setForm(p => ({ ...p, jenis_sim: option.value }))}
                                />
                            </FormItem>
                            <FormItem label="Tgl Kadaluarsa SIM">
                                <DatePicker
                                    value={form.tgl_kadaluarsa_sim ? new Date(form.tgl_kadaluarsa_sim) : null}
                                    onChange={(date) => setForm(p => ({ ...p, tgl_kadaluarsa_sim: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                                />
                            </FormItem>
                            <FormItem label="Status">
                                <Select
                                    isSearchable={false}
                                    value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                                    options={STATUS_OPTIONS}
                                    onChange={(option) => option && setForm(p => ({ ...p, status: option.value as 'aktif' | 'nonaktif' }))}
                                />
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
        </div>
    )
}