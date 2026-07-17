'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Select, toast, Notification } from '@/components/ui'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { menuService, MenuItem } from '@/services/menu.service'

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function MenuAdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [menu, setMenu]     = useState<MenuItem | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<MenuItem>>({})
    const [errors, setErrors]   = useState<Partial<Record<keyof typeof form, string>>>({})
    const [saving, setSaving]   = useState(false)
    const [indukOptions, setIndukOptions] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        Promise.all([menuService.get(id), menuService.list(1)]).then(([m, list]) => {
            setMenu(m)
            setForm(m)
            setIndukOptions(list.data
                .filter((item: MenuItem) => !item.id_menu_induk && item.id_menu !== id)
                .map((item: MenuItem) => ({ value: item.id_menu, label: item.nama_menu })))
        }).catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.nama_menu?.trim()) e.nama_menu = 'Nama menu wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) return
        setSaving(true)
        try {
            const updated = await menuService.update(id, {
                nama_menu:     form.nama_menu,
                path:          form.path || null,
                id_menu_induk: form.id_menu_induk || null,
                icon:          form.icon || null,
                urutan:        form.urutan,
                aktif:         form.aktif,
            })
            setMenu(updated)
            setEditing(false)
            setErrors({})
            toast.push(<Notification type="success" title="Menu berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!menu)   return <div className="p-6 text-red-500">Menu tidak ditemukan.</div>

    const initial = menu.nama_menu?.charAt(0).toUpperCase() ?? 'M'
    const tipe = menu.id_menu_induk ? 'Sub-menu' : 'Menu Root'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.MENU_ADMIN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{menu.nama_menu}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{tipe} &middot; Urutan {menu.urutan}</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{menu.nama_menu}</p>
                                    <p className="text-sm text-gray-500 mt-1">{tipe} &middot; Urutan {menu.urutan}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${menu.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {menu.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Nama Menu', value: menu.nama_menu },
                                { label: 'Tipe',      value: tipe },
                                { label: 'Path',      value: menu.path ? <span className="font-mono text-xs">{menu.path}</span> : <span className="text-gray-400">—</span> },
                                { label: 'Icon',      value: menu.icon ? <span className="font-mono text-xs">{menu.icon}</span> : <span className="text-gray-400">—</span> },
                                { label: 'Urutan',    value: String(menu.urutan) },
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
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama_menu?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Menu Navigasi</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi menu di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nama Menu" asterisk invalid={!!errors.nama_menu} errorMessage={errors.nama_menu}>
                                <Input value={form.nama_menu ?? ''} invalid={!!errors.nama_menu}
                                    onChange={(e) => setForm(p => ({ ...p, nama_menu: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Path (URL)">
                                <Input value={form.path ?? ''}
                                    onChange={(e) => setForm(p => ({ ...p, path: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Menu Induk">
                                <Select placeholder="Tanpa induk (root)..." options={indukOptions}
                                    value={indukOptions.find(o => o.value === form.id_menu_induk) ?? null}
                                    onChange={(opt) => setForm(p => ({ ...p, id_menu_induk: opt?.value ?? null }))}
                                    isClearable />
                            </FormItem>
                            <FormItem label="Icon">
                                <Input value={form.icon ?? ''}
                                    onChange={(e) => setForm(p => ({ ...p, icon: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Urutan">
                                <Input type="number" min={1} value={form.urutan ?? 1}
                                    onChange={(e) => setForm(p => ({ ...p, urutan: Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                                    onChange={(opt) => setForm(p => ({ ...p, aktif: opt?.value === '1' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(menu); setErrors({}) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    )
}