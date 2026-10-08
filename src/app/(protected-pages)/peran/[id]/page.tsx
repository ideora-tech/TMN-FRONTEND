'use client'
import { Fragment, use, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Tag, Spinner, Dialog, FormItem, Switcher, Tooltip, toast, Notification } from '@/components/ui'
import { HiArrowLeft, HiCheckCircle, HiOutlineExclamationCircle, HiOutlineSearch, HiOutlineX, HiOutlinePencilAlt } from 'react-icons/hi'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { peranService, Peran } from '@/services/peran.service'
import { izinPeranService } from '@/services/izinPeran.service'
import { menuService, MenuItem } from '@/services/menu.service'

const AKSI = ['lihat', 'tambah', 'ubah', 'hapus'] as const

const LABEL_AKSI: Record<string, string> = { lihat: 'Lihat', tambah: 'Tambah', ubah: 'Ubah', hapus: 'Hapus' }

function permKey(idMenu: string, aksi: string) {
    return `${idMenu}::${aksi}`
}

async function muatPetaIzin(kodePeran: string, kunci: string[]) {
    const izin = await izinPeranService.listByPeran(kodePeran)
    const map: Record<string, boolean> = {}
    kunci.forEach(k => { map[k] = false })
    izin.forEach(i => {
        const key = permKey(i.id_menu, i.aksi)
        if (key in map) map[key] = i.diizinkan
    })
    return map
}

type GrupMenu = { root: MenuItem; label: string; items: MenuItem[] }

type StatusSimpan = 'diam' | 'menyimpan' | 'tersimpan' | 'gagal'

type CentangMassal = { aksi: string | null; nyala: boolean; idMenu: string[] }

export default function PeranDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [peran, setPeran]     = useState<Peran | null>(null)
    const [ubahOpen, setUbahOpen] = useState(false)
    const [formUbah, setFormUbah] = useState({ nama_peran: '', aktif: true })
    const [errorNama, setErrorNama] = useState('')
    const [menyimpanUbah, setMenyimpanUbah] = useState(false)
    const [grup, setGrup]       = useState<GrupMenu[]>([])
    const [perms, setPerms]     = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(true)
    const [statusSimpan, setStatusSimpan] = useState<StatusSimpan>('diam')
    const [massal, setMassal]   = useState<CentangMassal | null>(null)
    const [massalOpen, setMassalOpen] = useState(false)
    const [cariMenuInput, setCariMenuInput] = useState('')
    const [cariMenu, setCariMenu] = useState('')
    const permsRef     = useRef<Record<string, boolean>>({})
    const tersimpanRef = useRef<Record<string, boolean>>({})
    const menyinkron   = useRef(false)

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
            const aktif: MenuItem[] = menuRes.data.filter((m: MenuItem) => m.aktif)
            const anakDari = (idInduk: string | null) => aktif
                .filter(m => (m.id_menu_induk ?? null) === idInduk)
                .sort((a, b) => a.urutan - b.urutan)
            const grupList: GrupMenu[] = []
            const telusuri = (node: MenuItem, jejak: string[]) => {
                const anak = anakDari(node.id_menu)
                const items = [
                    ...(node.path && jejak.length === 0 ? [node] : []),
                    ...anak.filter(m => m.path),
                ]
                const jejakBaru = [...jejak, node.nama_menu]
                if (items.length > 0) grupList.push({ root: node, label: jejakBaru.join(' › '), items })
                anak.forEach(m => telusuri(m, jejakBaru))
            }
            anakDari(null).forEach(root => telusuri(root, []))
            setGrup(grupList)

            const kunci = grupList.flatMap(g => g.items.flatMap(m => AKSI.map(a => permKey(m.id_menu, a))))
            const map = await muatPetaIzin(p.kode_peran, kunci)
            permsRef.current = map
            tersimpanRef.current = { ...map }
            setPerms(map)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { loadData() }, [loadData])

    useEffect(() => {
        const tahan = (e: BeforeUnloadEvent) => { if (menyinkron.current) e.preventDefault() }
        window.addEventListener('beforeunload', tahan)
        return () => window.removeEventListener('beforeunload', tahan)
    }, [])

    const selisih = () => {
        const target = permsRef.current
        return Object.keys(target).filter(k => target[k] !== (tersimpanRef.current[k] ?? false))
    }

    const sinkron = async () => {
        if (menyinkron.current || !peran) return
        menyinkron.current = true
        setStatusSimpan('menyimpan')
        try {
            let berubah = selisih()
            while (berubah.length > 0) {
                const target = permsRef.current
                await izinPeranService.bulkUpsert(peran.kode_peran, berubah.map(k => {
                    const [id_menu, aksi] = k.split('::')
                    return { id_menu, aksi, diizinkan: target[k] }
                }))
                const tersimpan = { ...tersimpanRef.current }
                berubah.forEach(k => { tersimpan[k] = target[k] })
                tersimpanRef.current = tersimpan
                berubah = selisih()
            }
            setStatusSimpan('tersimpan')
        } catch (err) {
            toast.push(
                <Notification type="danger" title="Perubahan izin gagal disimpan">
                    {parseApiError(err)} — centang dikembalikan ke data yang tersimpan.
                </Notification>
            )
            tersimpanRef.current = await muatPetaIzin(peran.kode_peran, Object.keys(tersimpanRef.current))
                .catch(() => tersimpanRef.current)
            permsRef.current = { ...tersimpanRef.current }
            setPerms(permsRef.current)
            setStatusSimpan('gagal')
        } finally {
            menyinkron.current = false
        }
    }

    const terapkan = (ubah: (sekarang: Record<string, boolean>) => Record<string, boolean>) => {
        const next = ubah(permsRef.current)
        permsRef.current = next
        setPerms(next)
        sinkron()
    }

    const toggle = (idMenu: string, aksi: string) => {
        const key = permKey(idMenu, aksi)
        terapkan(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const toggleAll = (idMenu: string) => {
        terapkan(prev => {
            const allOn = AKSI.every(a => prev[permKey(idMenu, a)])
            const next = { ...prev }
            AKSI.forEach(a => { next[permKey(idMenu, a)] = !allOn })
            return next
        })
    }

    const handleCariMenuSubmit = () => setCariMenu(cariMenuInput.trim())
    const handleCariMenuClear  = () => { setCariMenuInput(''); setCariMenu('') }

    // Filter pencarian: cocokkan nama grup (tampilkan seluruh isinya) atau
    // nama/path menu; grup tanpa hasil disembunyikan.
    const grupTampil = useMemo(() => {
        const q = cariMenu.trim().toLowerCase()
        if (!q) return grup
        return grup
            .map(g => g.label.toLowerCase().includes(q)
                ? g
                : {
                    ...g,
                    items: g.items.filter(m =>
                        m.nama_menu.toLowerCase().includes(q) || (m.path ?? '').toLowerCase().includes(q)),
                })
            .filter(g => g.items.length > 0)
    }, [grup, cariMenu])

    // Checkbox "Semua"/per-kolom di header bekerja pada baris yang TAMPIL —
    // saat pencarian aktif, centang massal tidak menyentuh menu yang tersembunyi.
    const semuaItem = grupTampil.flatMap(g => g.items)

    const toggleKolom = (aksi: string) => {
        const allOn = semuaItem.every(m => perms[permKey(m.id_menu, aksi)])
        setMassal({ aksi, nyala: !allOn, idMenu: semuaItem.map(m => m.id_menu) })
        setMassalOpen(true)
    }

    const toggleMatrix = () => {
        const allOn = semuaItem.every(m => AKSI.every(a => perms[permKey(m.id_menu, a)]))
        setMassal({ aksi: null, nyala: !allOn, idMenu: semuaItem.map(m => m.id_menu) })
        setMassalOpen(true)
    }

    const terapkanMassal = () => {
        if (!massal) return
        const { aksi, nyala, idMenu } = massal
        setMassalOpen(false)
        const daftarAksi: readonly string[] = aksi ? [aksi] : AKSI
        terapkan(prev => {
            const next = { ...prev }
            idMenu.forEach(idItem => daftarAksi.forEach(a => { next[permKey(idItem, a)] = nyala }))
            return next
        })
    }

    const bukaUbah = () => {
        if (!peran) return
        setFormUbah({ nama_peran: peran.nama_peran, aktif: peran.aktif })
        setErrorNama('')
        setUbahOpen(true)
    }

    const simpanUbah = async () => {
        const nama = formUbah.nama_peran.trim()
        if (!nama) {
            setErrorNama('Nama peran wajib diisi')
            return
        }
        setMenyimpanUbah(true)
        try {
            const hasil = await peranService.update(id, { nama_peran: nama, aktif: formUbah.aktif })
            setPeran(hasil)
            setUbahOpen(false)
            toast.push(<Notification type="success" title="Peran berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenyimpanUbah(false)
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
                <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold">Informasi Peran</h5>
                    <Tooltip title="Ubah">
                        <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={bukaUbah} />
                    </Tooltip>
                </div>
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
                <div>
                    <div className="mb-4">
                        <h5 className="font-semibold">Izin Akses</h5>
                        <p className="text-gray-400 text-xs mt-0.5">Centang aksi yang diizinkan per menu — setiap perubahan langsung tersimpan, tanpa tombol Simpan.</p>
                        <p className="text-gray-400 text-xs mt-0.5">Centang &quot;Lihat&quot; juga menentukan menu yang tampil di sidebar peran ini.</p>
                    </div>

                    <div className="mb-4">
                        <Input
                            className="max-w-sm"
                            size="sm"
                            placeholder="Cari menu atau path... (tekan Enter)"
                            suffix={cariMenuInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleCariMenuClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleCariMenuSubmit} />}
                            value={cariMenuInput}
                            onChange={e => setCariMenuInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCariMenuSubmit() } }}
                        />
                    </div>

                    {grup.length === 0 ? (
                        <p className="text-gray-400 text-sm py-4 text-center">Belum ada menu terdaftar</p>
                    ) : grupTampil.length === 0 ? (
                        <p className="text-gray-400 text-sm py-4 text-center">
                            Tidak ada menu yang cocok dengan &quot;{cariMenu}&quot;
                        </p>
                    ) : (
                        <div className="overflow-x-auto lg:overflow-x-visible">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr>
                                        <th className="sticky top-24 z-10 bg-blue-50 dark:bg-gray-800 py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide w-48 border-b border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <span>Menu</span>
                                                <span aria-live="polite" className="flex items-center gap-1 normal-case tracking-normal font-normal whitespace-nowrap">
                                                    {statusSimpan === 'menyimpan' && (
                                                        <><Spinner size="14px" /><span className="text-gray-500 dark:text-gray-300">Menyimpan…</span></>
                                                    )}
                                                    {statusSimpan === 'tersimpan' && (
                                                        <><HiCheckCircle className="text-base text-emerald-600 dark:text-emerald-400" /><span className="text-emerald-700 dark:text-emerald-400">Tersimpan</span></>
                                                    )}
                                                    {statusSimpan === 'gagal' && (
                                                        <><HiOutlineExclamationCircle className="text-base text-red-500" /><span className="text-red-600 dark:text-red-400">Gagal disimpan</span></>
                                                    )}
                                                </span>
                                            </div>
                                        </th>
                                        <th className="sticky top-24 z-10 bg-blue-50 dark:bg-gray-800 py-2.5 px-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide w-20 border-b border-gray-200 dark:border-gray-700">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span>Semua</span>
                                                <input
                                                    type="checkbox"
                                                    checked={semuaItem.length > 0 && semuaItem.every(m => AKSI.every(a => perms[permKey(m.id_menu, a)]))}
                                                    ref={el => {
                                                        if (el) {
                                                            const some = semuaItem.some(m => AKSI.some(a => perms[permKey(m.id_menu, a)]))
                                                            const all = semuaItem.every(m => AKSI.every(a => perms[permKey(m.id_menu, a)]))
                                                            el.indeterminate = some && !all
                                                        }
                                                    }}
                                                    onChange={toggleMatrix}
                                                    className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                                                />
                                            </div>
                                        </th>
                                        {AKSI.map(a => (
                                            <th key={a} className="sticky top-24 z-10 bg-blue-50 dark:bg-gray-800 py-2.5 px-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide w-20 border-b border-gray-200 dark:border-gray-700">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span>{a}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={semuaItem.length > 0 && semuaItem.every(m => perms[permKey(m.id_menu, a)])}
                                                        ref={el => {
                                                            if (el) {
                                                                const some = semuaItem.some(m => perms[permKey(m.id_menu, a)])
                                                                const all = semuaItem.every(m => perms[permKey(m.id_menu, a)])
                                                                el.indeterminate = some && !all
                                                            }
                                                        }}
                                                        onChange={() => toggleKolom(a)}
                                                        className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                                                    />
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {grupTampil.map(g => {
                                        const adaAnak = g.items.some(m => m.id_menu !== g.root.id_menu)
                                        return (
                                            <Fragment key={g.root.id_menu}>
                                                {adaAnak && (
                                                    <tr className="bg-gray-50/70 dark:bg-gray-800/40">
                                                        <td colSpan={2 + AKSI.length} className="py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                            {g.label}
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
                </div>
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Kembali</Button>
                </div>
            </Card>
            <ConfirmDialog isOpen={massalOpen} type={massal?.nyala ? 'info' : 'danger'}
                title={massal?.nyala
                    ? `Izinkan ${massal.aksi ? LABEL_AKSI[massal.aksi] : 'semua aksi'} untuk ${massal.idMenu.length} menu?`
                    : `Cabut ${massal?.aksi ? LABEL_AKSI[massal.aksi] : 'semua aksi'} dari ${massal?.idMenu.length ?? 0} menu?`}
                confirmText={massal?.nyala ? 'Ya, Izinkan' : 'Ya, Cabut'} cancelText="Batal"
                onClose={() => setMassalOpen(false)} onCancel={() => setMassalOpen(false)} onConfirm={terapkanMassal}>
                <p className="text-sm">
                    Perubahan langsung tersimpan untuk peran <span className="font-semibold">{peran.nama_peran}</span>
                    {cariMenu ? ' dan hanya berlaku pada menu hasil pencarian yang sedang tampil.' : ' dan berlaku pada seluruh menu di daftar.'}
                </p>
            </ConfirmDialog>
            <Dialog isOpen={ubahOpen} onClose={() => setUbahOpen(false)} onRequestClose={() => setUbahOpen(false)}>
                <h5 className="mb-4">Ubah Peran</h5>
                <form onSubmit={e => { e.preventDefault(); simpanUbah() }}>
                    <FormItem label="Kode Peran">
                        <Input value={peran.kode_peran} disabled />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Kode tidak bisa diubah karena dipakai akun pengguna dan izin akses.</p>
                    </FormItem>
                    <FormItem label="Nama Peran" asterisk invalid={!!errorNama} errorMessage={errorNama}>
                        <Input value={formUbah.nama_peran} maxLength={100} invalid={!!errorNama}
                            onChange={e => { setFormUbah(p => ({ ...p, nama_peran: e.target.value })); setErrorNama('') }} />
                    </FormItem>
                    <FormItem label="Status">
                        <div className="flex items-center gap-2">
                            <Switcher checked={formUbah.aktif} onChange={v => setFormUbah(p => ({ ...p, aktif: v }))} />
                            <span className="text-sm">{formUbah.aktif ? 'Aktif' : 'Nonaktif'}</span>
                        </div>
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="plain" onClick={() => setUbahOpen(false)}>Kembali</Button>
                        <Button type="submit" variant="solid" loading={menyimpanUbah}>Simpan</Button>
                    </div>
                </form>
            </Dialog>
        </div>
    )
}
