'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Dialog, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineLockClosed } from 'react-icons/hi'
import axios from 'axios'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { penggunaService, Pengguna } from '@/services/pengguna.service'
import { Peran } from '@/services/peran.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function PenggunaDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]     = useState<Pengguna | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Pengguna>>({})
    const [saving, setSaving]   = useState(false)
    const [peranOptions, setPeranOptions] = useState<{ value: string; label: string }[]>([])

    const [pwOpen, setPwOpen]   = useState(false)
    const [pwForm, setPwForm]   = useState({ kata_sandi_baru: '', konfirmasi: '' })
    const [pwErrors, setPwErrors] = useState<Record<string, string>>({})
    const [pwSaving, setPwSaving] = useState(false)

    useEffect(() => {
        Promise.all([
            penggunaService.get(id),
            axios.get(API_ENDPOINTS.PERAN, { params: { limit: 999 } }),
        ]).then(([p, pRes]) => {
            setData(p); setForm(p)
            setPeranOptions((pRes.data.data as Peran[]).map(r => ({ value: r.kode_peran, label: r.nama_peran })))
        }).catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
          .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await penggunaService.update(id, {
                username:   form.username,
                email:      form.email,
                kode_peran: form.kode_peran ?? null,
                aktif:      form.aktif,
            })
            setData(updated); setEditing(false)
            toast.push(<Notification type="success" title="Pengguna berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async () => {
        const e: Record<string, string> = {}
        if (!pwForm.kata_sandi_baru.trim()) e.kata_sandi_baru = 'Kata sandi baru wajib diisi'
        else if (pwForm.kata_sandi_baru.length < 6) e.kata_sandi_baru = 'Minimal 6 karakter'
        if (pwForm.kata_sandi_baru !== pwForm.konfirmasi) e.konfirmasi = 'Kata sandi tidak cocok'
        setPwErrors(e)
        if (Object.keys(e).length > 0) return

        setPwSaving(true)
        try {
            await axios.post(API_ENDPOINTS.PENGGUNA_CHANGE_PASSWORD(id), { kata_sandi_baru: pwForm.kata_sandi_baru })
            toast.push(<Notification type="success" title="Kata sandi berhasil diubah" />)
            setPwOpen(false)
            setPwForm({ kata_sandi_baru: '', konfirmasi: '' })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setPwSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Pengguna tidak ditemukan.</div>

    const initial = data.username?.charAt(0).toUpperCase() ?? 'U'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PENGGUNA)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.username}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{data.email}</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.username}</p>
                                    <p className="text-sm text-gray-500 mt-1">{data.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${data.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {data.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Username',      value: data.username },
                                { label: 'Email',         value: data.email },
                                { label: 'Peran',         value: peranOptions.find(o => o.value === data.kode_peran)?.label ?? data.kode_peran ?? <span className="text-gray-400">—</span> },
                                { label: 'Login Terakhir', value: data.login_terakhir ? dayjs(data.login_terakhir).format('DD MMM YYYY HH:mm') : <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                            <Button variant="plain" icon={<HiOutlineLockClosed />} onClick={() => setPwOpen(true)}>Ganti Kata Sandi</Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.username?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Pengguna</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi pengguna di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Username">
                                <Input value={form.username ?? ''} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Email">
                                <Input type="email" value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Peran">
                                <Select isClearable isSearchable placeholder="Pilih peran..."
                                    options={peranOptions}
                                    value={peranOptions.find(o => o.value === form.kode_peran) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, kode_peran: opt?.value ?? null }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(data) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>

            <Dialog isOpen={pwOpen} onClose={() => setPwOpen(false)}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                            <HiOutlineLockClosed className="text-xl text-indigo-600" />
                        </div>
                        <div>
                            <h5 className="font-bold">Ganti Kata Sandi</h5>
                            <p className="text-gray-500 text-sm">{data.username}</p>
                        </div>
                    </div>
                    <form onSubmit={e => { e.preventDefault(); handleChangePassword() }}>
                    <div className="flex flex-col gap-4">
                        <FormItem label="Kata Sandi Baru" asterisk invalid={!!pwErrors.kata_sandi_baru} errorMessage={pwErrors.kata_sandi_baru}>
                            <Input type="password" placeholder="Min. 6 karakter" value={pwForm.kata_sandi_baru}
                                invalid={!!pwErrors.kata_sandi_baru}
                                onChange={e => setPwForm(p => ({ ...p, kata_sandi_baru: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Konfirmasi Kata Sandi" asterisk invalid={!!pwErrors.konfirmasi} errorMessage={pwErrors.konfirmasi}>
                            <Input type="password" placeholder="Ulangi kata sandi baru" value={pwForm.konfirmasi}
                                invalid={!!pwErrors.konfirmasi}
                                onChange={e => setPwForm(p => ({ ...p, konfirmasi: e.target.value }))} />
                        </FormItem>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="plain" onClick={() => setPwOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={pwSaving}>Ubah Kata Sandi</Button>
                    </div>
                    </form>
                </div>
            </Dialog>
        </div>
    )
}