'use client'
import { useEffect, useMemo, useState } from 'react'
import { Card, Button, Checkbox, Tag, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { parseApiError } from '@/utils/error.util'
import { aksesMenuService, MenuAkses } from '@/services/aksesMenu.service'
import { peranService, Peran } from '@/services/peran.service'

type Option = { value: string; label: string }

export default function AksesMenuPage() {
    const [menus, setMenus]           = useState<MenuAkses[]>([])
    const [peranOptions, setPeranOptions] = useState<Option[]>([])
    const [kodePeran, setKodePeran]   = useState('')
    const [checked, setChecked]       = useState<Set<string>>(new Set())
    const [loading, setLoading]       = useState(true)
    const [saving, setSaving]         = useState(false)

    const muatData = () => {
        setLoading(true)
        Promise.all([aksesMenuService.list(), peranService.list(1, 100)])
            .then(([menuList, peranRes]) => {
                setMenus(menuList.filter(m => m.aktif))
                setPeranOptions((peranRes.data as Peran[])
                    .filter(p => p.aktif)
                    .map(p => ({ value: p.kode_peran.toUpperCase(), label: `${p.kode_peran} — ${p.nama_peran}` })))
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }

    useEffect(() => { muatData() }, [])

    const bolehLihat = (m: MenuAkses, kode: string) =>
        m.kode_peran.length === 0 || m.kode_peran.includes(kode)

    useEffect(() => {
        if (!kodePeran) { setChecked(new Set()); return }
        setChecked(new Set(menus.filter(m => bolehLihat(m, kodePeran)).map(m => m.id_menu)))
    }, [kodePeran, menus])

    const grupList = useMemo(() => {
        const roots = menus
            .filter(m => m.id_menu_induk === null)
            .sort((a, b) => a.urutan - b.urutan)
        return roots.map(root => ({
            root,
            children: menus
                .filter(m => m.id_menu_induk === root.id_menu)
                .sort((a, b) => a.urutan - b.urutan),
        }))
    }, [menus])

    const toggleMenu = (m: MenuAkses, anak: MenuAkses[]) => {
        setChecked(prev => {
            const next = new Set(prev)
            const nyalakan = !next.has(m.id_menu)
            if (nyalakan) {
                next.add(m.id_menu)
                anak.forEach(a => next.add(a.id_menu))
                if (m.id_menu_induk) next.add(m.id_menu_induk)
            } else {
                next.delete(m.id_menu)
                anak.forEach(a => next.delete(a.id_menu))
            }
            return next
        })
    }

    const toggleSemua = (nyalakan: boolean) => {
        setChecked(nyalakan ? new Set(menus.map(m => m.id_menu)) : new Set())
    }

    const handleSimpan = async () => {
        if (!kodePeran) return
        setSaving(true)
        try {
            await aksesMenuService.simpan(kodePeran, [...checked])
            toast.push(<Notification type="success" title={`Akses menu untuk ${kodePeran} berhasil disimpan`} />)
            const menuList = await aksesMenuService.list()
            setMenus(menuList.filter(m => m.aktif))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const jumlahTerpilih = checked.size

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Akses Menu per Peran</h3>
                <p className="text-gray-500 text-sm mt-0.5">Atur menu apa saja yang dapat diakses tiap peran — centang menu lalu simpan</p>
            </div>

            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-full sm:w-96">
                        <Select<Option>
                            placeholder="Pilih peran yang mau diatur..."
                            options={peranOptions}
                            value={peranOptions.find(o => o.value === kodePeran) ?? null}
                            onChange={opt => setKodePeran((opt as Option | null)?.value ?? '')}
                        />
                    </div>
                    {kodePeran && (
                        <div className="flex items-center gap-3 sm:ml-auto">
                            <span className="text-xs text-gray-500">{jumlahTerpilih} dari {menus.length} menu dipilih</span>
                            <Button size="xs" variant="default" onClick={() => toggleSemua(true)}>Pilih Semua</Button>
                            <Button size="xs" variant="default" onClick={() => toggleSemua(false)}>Kosongkan</Button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-16"><Spinner size={36} /></div>
                ) : !kodePeran ? (
                    <p className="text-gray-400 text-sm text-center py-12">Pilih peran di atas untuk mulai mengatur akses menu.</p>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {grupList.map(({ root, children }) => (
                            <div key={root.id_menu} className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        checked={checked.has(root.id_menu)}
                                        onChange={() => toggleMenu(root, children)}
                                    />
                                    <span className="font-semibold">{root.nama_menu}</span>
                                    {root.kode_peran.length === 0 && (
                                        <Tag className="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300 text-xs">
                                            semua peran
                                        </Tag>
                                    )}
                                </div>
                                {children.length > 0 && (
                                    <div className="mt-2 ml-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
                                        {children.map(anak => (
                                            <label key={anak.id_menu} className="flex items-center gap-3 cursor-pointer">
                                                <Checkbox
                                                    checked={checked.has(anak.id_menu)}
                                                    onChange={() => toggleMenu(anak, [])}
                                                />
                                                <span className="text-sm">{anak.nama_menu}</span>
                                                {anak.kode_peran.length === 0 && (
                                                    <Tag className="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300 text-xs">
                                                        semua peran
                                                    </Tag>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {kodePeran && !loading && (
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-400">
                        Menu bertanda &quot;semua peran&quot; belum pernah dibatasi — sekali disimpan dengan centang dilepas, batasannya mulai berlaku.
                    </p>
                    <Button variant="solid" loading={saving} onClick={handleSimpan}>
                        Simpan Akses
                    </Button>
                </div>
            )}
        </div>
    )
}
