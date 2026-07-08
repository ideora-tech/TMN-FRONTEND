'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Tag, Spinner, toast, Notification } from '@/components/ui'
import { HiArrowLeft, HiOutlineSave, HiOutlineRefresh } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { peranService, Peran } from '@/services/peran.service'
import { izinPeranService, IzinPeran } from '@/services/izinPeran.service'
import { menuService, MenuItem } from '@/services/menu.service'

const AKSI = ['lihat', 'tambah', 'ubah', 'hapus'] as const

function permKey(idMenu: string, aksi: string) {
    return `${idMenu}::${aksi}`
}

export default function PeranDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [peran, setPeran]     = useState<Peran | null>(null)
    const [menus, setMenus]     = useState<MenuItem[]>([])
    const [perms, setPerms]     = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving]   = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [p, menuRes] = await Promise.all([
                peranService.get(id),
                menuService.list(1),
            ])
            setPeran(p)

            // only root menus for cleaner matrix
            const rootMenus = menuRes.data.filter((m: MenuItem) => !m.id_menu_induk)
            setMenus(rootMenus)

            const izin: IzinPeran[] = await izinPeranService.listByPeran(p.kode_peran)
            const map: Record<string, boolean> = {}
            // initialise all false
            rootMenus.forEach((m: MenuItem) => {
                AKSI.forEach(a => { map[permKey(m.id_menu, a)] = false })
            })
            // apply existing permissions
            izin.forEach(i => {
                const key = permKey(i.id_menu, i.aksi)
                if (key in map) map[key] = i.diizinkan
            })
            setPerms(map)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { loadData() }, [loadData])

    const toggle = (idMenu: string, aksi: string) => {
        const key = permKey(idMenu, aksi)
        setPerms(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const toggleAll = (idMenu: string) => {
        const allOn = AKSI.every(a => perms[permKey(idMenu, a)])
        setPerms(prev => {
            const next = { ...prev }
            AKSI.forEach(a => { next[permKey(idMenu, a)] = !allOn })
            return next
        })
    }

    const handleSave = async () => {
        if (!peran) return
        setSaving(true)
        try {
            const permissions = menus.flatMap(m =>
                AKSI.map(a => ({
                    id_menu:    m.id_menu,
                    aksi:       a,
                    diizinkan:  perms[permKey(m.id_menu, a)] ?? false,
                }))
            )
            await izinPeranService.bulkUpsert(peran.kode_peran, permissions)
            toast.push(<Notification type="success" title="Izin akses berhasil disimpan" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <Spinner size="40px" />
        </div>
    )
    if (!peran) return <div className="p-6 text-red-500">Peran tidak ditemukan.</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PERAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{peran.nama_peran}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kode: {peran.kode_peran}</p>
                </div>
            </div>

            {/* Peran Info */}
            <Card>
                <div className="flex flex-col gap-0">
                    {[
                        { label: 'Kode Peran',  value: <span className="font-mono text-sm">{peran.kode_peran}</span> },
                        { label: 'Nama Peran',  value: peran.nama_peran },
                        {
                            label: 'Tipe', value: (
                                <Tag className={peran.is_platform
                                    ? 'bg-purple-100 text-purple-600'
                                    : 'bg-blue-100 text-blue-600'}>
                                    {peran.is_platform ? 'Platform' : 'Perusahaan'}
                                </Tag>
                            )
                        },
                        {
                            label: 'Status', value: (
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${peran.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {peran.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                            )
                        },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center py-2 border-b last:border-b-0">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium">{value}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Permission Matrix */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h5 className="font-semibold">Izin Akses</h5>
                        <p className="text-gray-400 text-xs mt-0.5">Centang aksi yang diizinkan per menu</p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="plain" icon={<HiOutlineRefresh />} onClick={loadData}>Reset</Button>
                        <Button size="sm" variant="solid" icon={<HiOutlineSave />} loading={saving} onClick={handleSave}>
                            Simpan
                        </Button>
                    </div>
                </div>

                {menus.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4 text-center">Belum ada menu terdaftar</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-gray-500 text-xs">
                                    <th className="text-left py-2 pr-4 font-medium w-48">Menu</th>
                                    <th className="py-2 px-3 text-center font-medium w-20">Semua</th>
                                    {AKSI.map(a => (
                                        <th key={a} className="py-2 px-3 text-center font-medium capitalize w-20">{a}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {menus.map(m => {
                                    const allOn = AKSI.every(a => perms[permKey(m.id_menu, a)])
                                    const someOn = AKSI.some(a => perms[permKey(m.id_menu, a)])
                                    return (
                                        <tr key={m.id_menu} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="py-2.5 pr-4 font-medium">{m.nama_menu}</td>
                                            <td className="py-2.5 px-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={allOn}
                                                    ref={el => { if (el) el.indeterminate = someOn && !allOn }}
                                                    onChange={() => toggleAll(m.id_menu)}
                                                    className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                                                />
                                            </td>
                                            {AKSI.map(a => (
                                                <td key={a} className="py-2.5 px-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={perms[permKey(m.id_menu, a)] ?? false}
                                                        onChange={() => toggle(m.id_menu, a)}
                                                        className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
