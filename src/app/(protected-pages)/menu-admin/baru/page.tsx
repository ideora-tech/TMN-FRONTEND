'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Select, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { menuService, MenuItem } from '@/services/menu.service'

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function MenuAdminBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        nama_menu: '', path: '', id_menu_induk: '', icon: '', urutan: '1', aktif: true,
    })
    const [indukOptions, setIndukOptions] = useState<{ value: string; label: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors]   = useState<Partial<Record<keyof typeof form, string>>>({})

    useEffect(() => {
        menuService.list(1).then(res =>
            setIndukOptions(res.data
                .filter((m: MenuItem) => !m.id_menu_induk)
                .map((m: MenuItem) => ({ value: m.id_menu, label: m.nama_menu })))
        ).catch(() => {})
    }, [])

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.nama_menu.trim()) e.nama_menu = 'Nama menu wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setLoading(true)
        try {
            await menuService.create({
                nama_menu:     form.nama_menu,
                path:          form.path || null,
                id_menu_induk: form.id_menu_induk || null,
                icon:          form.icon || null,
                urutan:        Number(form.urutan) || 1,
                aktif:         form.aktif,
            })
            toast.push(<Notification type="success" title="Menu berhasil ditambahkan" />)
            router.push(ROUTES.MENU_ADMIN)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Tambah Menu</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Tambah item navigasi baru ke sidebar</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Nama Menu" asterisk invalid={!!errors.nama_menu} errorMessage={errors.nama_menu}>
                        <Input placeholder="Contoh: Armada" value={form.nama_menu} invalid={!!errors.nama_menu}
                            onChange={(e) => setForm(p => ({ ...p, nama_menu: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Path (URL)">
                        <Input placeholder="Contoh: /armada" value={form.path}
                            onChange={(e) => setForm(p => ({ ...p, path: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Menu Induk">
                        <Select placeholder="Pilih induk (opsional)..." options={indukOptions}
                            value={indukOptions.find(o => o.value === form.id_menu_induk) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, id_menu_induk: opt?.value ?? '' }))}
                            isClearable />
                    </FormItem>
                    <FormItem label="Icon">
                        <Input placeholder="Contoh: HiOutlineTruck" value={form.icon}
                            onChange={(e) => setForm(p => ({ ...p, icon: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Urutan">
                        <Input type="number" min={1} value={form.urutan}
                            onChange={(e) => setForm(p => ({ ...p, urutan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Status">
                        <Select isSearchable={false} options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, aktif: opt?.value === '1' }))} />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button type="submit" variant="solid" loading={loading}>Simpan</Button>
                </div>
            </form>
            </Card>
        </div>
    )
}
