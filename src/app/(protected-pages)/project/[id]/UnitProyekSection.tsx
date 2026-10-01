'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Checkbox, Dialog, FormItem, Spinner, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiPlusCircle, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { proyekUnitService, type OpsiUnitProyek, type UnitProyek, type UnitProyekPayload } from '@/services/proyekUnit.service'

type Opsi = { value: string; label: string }

const SUMBER_TAG: Record<string, { label: string; tag: string }> = {
    internal: { label: 'Aset Milik', tag: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
    vendor:   { label: 'Vendor',     tag: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
}

const TH = 'py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4'

const MAKS_UNIT = 50

const kunciUnit = (u: OpsiUnitProyek) => `${u.sumber}:${u.sumber === 'vendor' ? u.id_armada_vendor : u.id_armada}`

const ringkasUnit = (u: OpsiUnitProyek) => [u.nama_jenis, u.merk].filter(Boolean).join(' · ')

const labelOpsi = (u: OpsiUnitProyek) => [
    u.nopol ?? '—',
    ringkasUnit(u),
    u.sumber === 'vendor' ? (u.nama_vendor ?? 'Vendor') : null,
    u.nama_supir ? `Supir: ${u.nama_supir}` : 'Belum ada pemegang',
].filter(Boolean).join(' — ')

const kePayload = (u: OpsiUnitProyek): UnitProyekPayload => (u.sumber === 'vendor'
    ? { sumber: 'vendor', id_armada_vendor: u.id_armada_vendor ?? undefined }
    : { sumber: 'internal', id_armada: u.id_armada ?? undefined })

export default function UnitProyekSection({ idProyek }: { idProyek: string }) {
    const [daftar, setDaftar]         = useState<UnitProyek[]>([])
    const [memuat, setMemuat]         = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [opsi, setOpsi]             = useState<OpsiUnitProyek[]>([])
    const [memuatOpsi, setMemuatOpsi] = useState(false)
    const [galatOpsi, setGalatOpsi]   = useState(false)
    const [terpilih, setTerpilih]     = useState<string[]>([])
    const [menyimpan, setMenyimpan]   = useState(false)
    const [hapusTarget, setHapusTarget] = useState<UnitProyek | null>(null)
    const [menghapus, setMenghapus]   = useState(false)
    const [dicentang, setDicentang]   = useState<Record<string, boolean>>({})
    const [hapusMassalOpen, setHapusMassalOpen] = useState(false)
    const [menghapusMassal, setMenghapusMassal] = useState(false)

    const idTercentang = daftar.filter(u => dicentang[u.id_proyek_unit]).map(u => u.id_proyek_unit)
    const semuaTercentang = daftar.length > 0 && idTercentang.length === daftar.length

    const muatDaftar = useCallback(() => {
        setMemuat(true)
        proyekUnitService.list(idProyek)
            .then(setDaftar)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setMemuat(false))
    }, [idProyek])

    useEffect(() => { muatDaftar() }, [muatDaftar])

    const bukaDialog = () => {
        setTerpilih([])
        setOpsi([])
        setGalatOpsi(false)
        setDialogOpen(true)
        setMemuatOpsi(true)
        proyekUnitService.opsi(idProyek)
            .then(setOpsi)
            .catch(err => {
                setGalatOpsi(true)
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
            })
            .finally(() => setMemuatOpsi(false))
    }

    const opsiSelect = useMemo<Opsi[]>(() => opsi.map(u => ({ value: kunciUnit(u), label: labelOpsi(u) })), [opsi])

    const keteranganOpsi = galatOpsi
        ? 'Gagal memuat daftar unit — tutup lalu buka lagi untuk mencoba ulang'
        : opsi.length === 0
            ? (daftar.length > 0 ? 'Semua unit yang tersedia sudah ada di proyek ini' : 'Belum ada unit aktif yang bisa dipilih')
            : terpilih.length >= MAKS_UNIT
                ? `Maksimal ${MAKS_UNIT} unit sekali tambah`
                : null

    const simpan = async () => {
        const pilihan = opsi.filter(u => terpilih.includes(kunciUnit(u)))
        if (pilihan.length === 0) return
        setMenyimpan(true)
        try {
            await proyekUnitService.tambah(idProyek, pilihan.map(kePayload))
            toast.push(<Notification type="success" title={`${pilihan.length} unit ditambahkan ke proyek`} />)
            setDialogOpen(false)
            muatDaftar()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenyimpan(false)
        }
    }

    const hapus = async () => {
        if (!hapusTarget) return
        setMenghapus(true)
        try {
            await proyekUnitService.hapus(idProyek, hapusTarget.id_proyek_unit)
            setDaftar(prev => prev.filter(u => u.id_proyek_unit !== hapusTarget.id_proyek_unit))
            toast.push(<Notification type="success" title="Unit dihapus dari proyek" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenghapus(false)
            setHapusTarget(null)
        }
    }

    const hapusMassal = async () => {
        if (idTercentang.length === 0) return
        setMenghapusMassal(true)
        try {
            const jumlah = await proyekUnitService.hapusMassal(idProyek, idTercentang)
            const dihapus = new Set(idTercentang)
            setDaftar(prev => prev.filter(u => !dihapus.has(u.id_proyek_unit)))
            setDicentang({})
            toast.push(<Notification type="success" title={`${jumlah} unit dihapus dari proyek`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            muatDaftar()
        } finally {
            setMenghapusMassal(false)
            setHapusMassalOpen(false)
        }
    }

    return (
        <Card>
            <div className="flex items-center justify-between gap-3 mb-1">
                <div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Unit Proyek</p>
                    <p className="text-xs text-gray-400 mt-0.5">{daftar.length} unit dipakai · penugasan harian dibuat manual di halaman Penugasan</p>
                </div>
                <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={bukaDialog}>Tambah Unit</Button>
            </div>

            {memuat ? (
                <div className="flex justify-center py-6"><Spinner /></div>
            ) : daftar.length === 0 ? (
                <p className="text-gray-400 text-sm py-6 text-center">Belum ada unit untuk proyek ini</p>
            ) : (
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className="py-2.5 pl-3 pr-2 w-10">
                                    <Checkbox checked={semuaTercentang}
                                        onChange={checked => setDicentang(Object.fromEntries(daftar.map(u => [u.id_proyek_unit, checked])))} />
                                </th>
                                <th className={`${TH} w-12`}>No</th>
                                <th className={TH}>Unit</th>
                                <th className={TH}>Kepemilikan</th>
                                <th className={TH}>Supir</th>
                                <th className="py-2.5 pr-2 text-right">
                                    {idTercentang.length > 0 && (
                                        <Button type="button" size="xs" variant="solid" icon={<HiOutlineTrash />}
                                            customColorClass={() => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500'}
                                            onClick={() => setHapusMassalOpen(true)}>
                                            Hapus Terpilih ({idTercentang.length})
                                        </Button>
                                    )}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {daftar.map((u, i) => {
                                const sumber = SUMBER_TAG[u.sumber] ?? SUMBER_TAG.internal
                                const detail = ringkasUnit(u)
                                return (
                                    <tr key={u.id_proyek_unit}>
                                        <td className="py-3 pl-3 pr-2">
                                            <Checkbox checked={!!dicentang[u.id_proyek_unit]}
                                                onChange={checked => setDicentang(prev => ({ ...prev, [u.id_proyek_unit]: checked }))} />
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500">{i + 1}</td>
                                        <td className="py-3 pr-4">
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{u.nopol ?? '—'}</p>
                                            {detail && <p className="text-xs text-gray-400">{detail}</p>}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Tag className={`text-xs font-semibold ${sumber.tag}`}>{sumber.label}</Tag>
                                            {u.sumber === 'vendor' && u.nama_vendor && <p className="text-xs text-gray-400 mt-1">{u.nama_vendor}</p>}
                                        </td>
                                        <td className="py-3 pr-4">
                                            {u.nama_supir
                                                ? <span className="text-gray-700 dark:text-gray-300">{u.nama_supir}</span>
                                                : <span className="text-xs text-gray-400">Belum ada pemegang</span>}
                                        </td>
                                        <td className="py-3 text-right whitespace-nowrap">
                                            <Tooltip title="Hapus dari proyek">
                                                <span
                                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                    onClick={() => setHapusTarget(u)}
                                                >
                                                    <HiOutlineTrash className="text-lg" />
                                                </span>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog isOpen={dialogOpen} onRequestClose={() => setDialogOpen(false)} onClose={() => setDialogOpen(false)} width={640}>
                <h5 className="text-base font-semibold mb-1">Tambah Unit Proyek</h5>
                <p className="text-xs text-gray-400 mb-4">
                    Pilih unit yang dipakai di proyek ini. Supir mengikuti pemegang unit. Tidak membuat penugasan maupun pengajuan uang jalan — penugasan harian dibuat di halaman Penugasan.
                </p>
                {memuatOpsi ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : (
                    <FormItem label="Unit" asterisk
                        extra={keteranganOpsi ? <span className="text-xs text-gray-400">{keteranganOpsi}</span> : undefined}>
                        <Select<Opsi, true> isMulti isClearable isSearchable placeholder="Pilih unit (bisa lebih dari satu)..."
                            options={opsiSelect}
                            isOptionDisabled={() => terpilih.length >= MAKS_UNIT}
                            value={opsiSelect.filter(o => terpilih.includes(o.value))}
                            onChange={opts => setTerpilih(opts ? opts.map(o => o.value) : [])} />
                    </FormItem>
                )}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => setDialogOpen(false)}>Kembali</Button>
                    <Button type="button" variant="solid" loading={menyimpan} disabled={terpilih.length === 0} onClick={simpan}>
                        Simpan
                    </Button>
                </div>
            </Dialog>

            <ConfirmDialog isOpen={!!hapusTarget} type="danger" title="Hapus Unit dari Proyek"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setHapusTarget(null)} onCancel={() => setHapusTarget(null)}
                onConfirm={hapus} confirmButtonProps={{ loading: menghapus }}>
                <p>Hapus unit <strong>{hapusTarget?.nopol}</strong> dari daftar unit proyek ini? Penugasan harian yang sudah ada tidak ikut terhapus.</p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={hapusMassalOpen} type="danger" title="Hapus Unit Terpilih?"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setHapusMassalOpen(false)} onCancel={() => setHapusMassalOpen(false)}
                onConfirm={hapusMassal} confirmButtonProps={{ loading: menghapusMassal }}>
                <p><strong>{idTercentang.length}</strong> unit akan dihapus sekaligus dari daftar unit proyek ini.</p>
                <p className="text-sm text-gray-500 mt-2">Penugasan harian yang sudah ada tidak ikut terhapus.</p>
            </ConfirmDialog>
        </Card>
    )
}
