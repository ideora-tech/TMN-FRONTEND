'use client'
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Checkbox, Spinner, Tag, Tooltip, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiPlusCircle, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { proyekUnitService, type OpsiUnitProyek, type UnitProyek } from '@/services/proyekUnit.service'
import PilihUnitProyekDialog, { SUMBER_UNIT_TAG as SUMBER_TAG, kePayloadUnit, ringkasUnit } from '../PilihUnitProyekDialog'

const TH = 'py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4'

export default function UnitProyekSection({ idProyek }: { idProyek: string }) {
    const [daftar, setDaftar]         = useState<UnitProyek[]>([])
    const [memuat, setMemuat]         = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
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

    const muatOpsi = useCallback(() => proyekUnitService.opsi(idProyek), [idProyek])

    const simpan = async (pilihan: OpsiUnitProyek[]) => {
        setMenyimpan(true)
        try {
            const hasil = await proyekUnitService.tambah(idProyek, pilihan.map(kePayloadUnit))
            toast.push(<Notification type="success" title={hasil.pesan ?? `${pilihan.length} unit ditambahkan ke proyek`} />)
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
                <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={() => setDialogOpen(true)}>Tambah Unit</Button>
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
                                        onChange={() => setDicentang(Object.fromEntries(daftar.map(u => [u.id_proyek_unit, !semuaTercentang])))} />
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
                                                onChange={() => setDicentang(prev => ({ ...prev, [u.id_proyek_unit]: !prev[u.id_proyek_unit] }))} />
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

            <PilihUnitProyekDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)}
                muatOpsi={muatOpsi} onSimpan={simpan} menyimpan={menyimpan}
                pesanKosong={daftar.length > 0 ? 'Semua unit yang tersedia sudah ada di proyek ini' : 'Belum ada unit aktif yang bisa dipilih'}
                keterangan="Centang unit yang dipakai di proyek ini. Supir mengikuti pemegang unit. Tidak membuat penugasan maupun pengajuan uang jalan — penugasan harian dibuat di halaman Penugasan." />

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
