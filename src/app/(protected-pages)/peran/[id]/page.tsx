'use client'
import { Fragment, use, useEffect, useState, useCallback } from 'react'
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

type GrupMenu = { root: MenuItem; items: MenuItem[] }

export default function PeranDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [peran, setPeran]     = useState<Peran | null>(null)
    const [grup, setGrup]       = useState<GrupMenu[]>([])
    const [perms, setPerms]     = useState<Record<string, boolean>>({})
    const [permsAwal, setPermsAwal] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving]   = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [p, menuRes] = await Promise.all([
                peranService.get(id),
                menuService.list(1, 200),
            ])
            setPeran(p)

            // Izin dipakai middleware per PATH menu — jadi baris matriks adalah
            // menu ber-path (menu anak + root berpath seperti Dashboard),
            // dikelompokkan di bawah nama grupnya. Grup tanpa path hanya jadi header.
            const aktif = menuRes.data.filter((m: MenuItem) => m.aktif)
            const roots = aktif
                .filter((m: MenuItem) => !m.id_menu_induk)
                .sort((a: MenuItem, b: MenuItem) => a.urutan - b.urutan)
            const grupList: GrupMenu[] = roots
                .map((root: MenuItem) => ({
                    root,
                    items: [
                        ...(root.path ? [root] : []),
                        ...aktif
                            .filter((m: MenuItem) => m.id_menu_induk === root.id_menu && m.path)
                            .sort((a: MenuItem, b: MenuItem) => a.urutan - b.urutan),
                    ],
                }))
                .filter(g => g.items.length > 0)
            setGrup(grupList)

            const izin: IzinPeran[] = await izinPeranService.listByPeran(p.kode_peran)
            const map: Record<string, boolean> = {}
            grupList.forEach(g => g.items.forEach(m => {
                AKSI.forEach(a => { map[permKey(m.id_menu, a)] = false })
            }))
            izin.forEach(i => {
                const key = permKey(i.id_menu, i.aksi)
                if (key in map) map[key] = i.diizinkan
            })
            setPerms(map)
            setPermsAwal({ ...map })
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
            // Kirim HANYA sel yang berubah — menyimpan seluruh matriks akan
            // menulis baris revoke per-perusahaan utk semua sel kosong dan
            // mengalahkan baseline global (mis. izin mobile supir).
            const permissions = grup.flatMap(g => g.items).flatMap(m =>
                AKSI.map(a => permKey(m.id_menu, a))
                    .filter(key => (perms[key] ?? false) !== (permsAwal[key] ?? false))
                    .map(key => ({
                        id_menu:    m.id_menu,
                        aksi:       key.split('::')[1],
                        diizinkan:  perms[key] ?? false,
                    }))
            )
            if (permissions.length === 0) {
                toast.push(<Notification type="info" title="Tidak ada perubahan untuk disimpan" />)
                setSaving(false)
                return
            }
            await izinPeranService.bulkUpsert(peran.kode_peran, permissions)
            setPermsAwal({ ...perms })
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
                        <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium">{value}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Permission Matrix */}
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h5 className="font-semibold">Izin Akses</h5>
                            <p className="text-gray-400 text-xs mt-0.5">Centang aksi yang diizinkan per menu</p>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant="plain" icon={<HiOutlineRefresh />} onClick={loadData}>Reset</Button>
                            <Button type="submit" size="sm" variant="solid" icon={<HiOutlineSave />} loading={saving}>
                                Simpan
                            </Button>
                        </div>
                    </div>

                    {grup.length === 0 ? (
                        <p className="text-gray-400 text-sm py-4 text-center">Belum ada menu terdaftar</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr>
                                        <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide w-48">Menu</th>
                                        <th className="py-2.5 px-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide w-20">Semua</th>
                                        {AKSI.map(a => (
                                            <th key={a} className="py-2.5 px-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide w-20">{a}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {grup.map(g => {
                                        const adaAnak = g.items.some(m => m.id_menu !== g.root.id_menu)
                                        return (
                                            <Fragment key={g.root.id_menu}>
                                                {adaAnak && (
                                                    <tr className="bg-gray-50/70 dark:bg-gray-800/40">
                                                        <td colSpan={2 + AKSI.length} className="py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                            {g.root.nama_menu}
                                                        </td>
                                                    </tr>
                                                )}
                                                {g.items.map(m => {
                                                    const allOn = AKSI.every(a => perms[permKey(m.id_menu, a)])
                                                    const someOn = AKSI.some(a => perms[permKey(m.id_menu, a)])
                                                    return (
                                                        <tr key={m.id_menu} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                            <td className={`py-2.5 px-3 font-medium ${adaAnak ? 'pl-8' : ''}`}>
                                                                {m.nama_menu}
                                                                <span className="text-xs text-gray-400 font-normal font-mono ml-2">{m.path}</span>
                                                            </td>
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
                                            </Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </form>
            </Card>
        </div>
    )
}
