'use client'
import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Dialog, Input, Spinner, Tag, toast, Notification } from '@/components/ui'
import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import type { OpsiUnitProyek, UnitProyekPayload } from '@/services/proyekUnit.service'

export const SUMBER_UNIT_TAG: Record<string, { label: string; tag: string }> = {
    internal: { label: 'Aset Milik', tag: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
    vendor:   { label: 'Vendor',     tag: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
}

export const MAKS_UNIT_PROYEK = 50

export const kunciUnit = (u: OpsiUnitProyek) => `${u.sumber}:${u.sumber === 'vendor' ? u.id_armada_vendor : u.id_armada}`

export const ringkasUnit = (u: OpsiUnitProyek) => [u.nama_jenis, u.merk].filter(Boolean).join(' · ')

export const kePayloadUnit = (u: OpsiUnitProyek): UnitProyekPayload => (u.sumber === 'vendor'
    ? { sumber: 'vendor', id_armada_vendor: u.id_armada_vendor ?? undefined }
    : { sumber: 'internal', id_armada: u.id_armada ?? undefined })

const TH = 'py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4'

type Props = {
    isOpen: boolean
    onClose: () => void
    muatOpsi: () => Promise<OpsiUnitProyek[]>
    onSimpan: (pilihan: OpsiUnitProyek[]) => void | Promise<void>
    kecualiKunci?: string[]
    maks?: number
    menyimpan?: boolean
    pesanKosong: string
    keterangan: string
}

export default function PilihUnitProyekDialog({
    isOpen, onClose, muatOpsi, onSimpan, kecualiKunci = [], maks = MAKS_UNIT_PROYEK, menyimpan = false, pesanKosong, keterangan,
}: Props) {
    const [opsi, setOpsi]             = useState<OpsiUnitProyek[]>([])
    const [memuatOpsi, setMemuatOpsi] = useState(false)
    const [galatOpsi, setGalatOpsi]   = useState(false)
    const [terpilih, setTerpilih]     = useState<string[]>([])
    const [cariInput, setCariInput]   = useState('')
    const [cari, setCari]             = useState('')
    useEffect(() => {
        if (!isOpen) return
        let aktif = true
        setTerpilih([])
        setCariInput('')
        setCari('')
        setOpsi([])
        setGalatOpsi(false)
        setMemuatOpsi(true)
        muatOpsi()
            .then(hasil => { if (aktif) setOpsi(hasil) })
            .catch(err => {
                if (!aktif) return
                setGalatOpsi(true)
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
            })
            .finally(() => { if (aktif) setMemuatOpsi(false) })
        return () => { aktif = false }
    }, [isOpen, muatOpsi])

    const kecualiSet = useMemo(() => new Set(kecualiKunci), [kecualiKunci])
    const opsiTersedia = useMemo(() => opsi.filter(u => !kecualiSet.has(kunciUnit(u))), [opsi, kecualiSet])

    const opsiTampil = useMemo(() => {
        const kata = cari.toLowerCase()
        if (!kata) return opsiTersedia
        return opsiTersedia.filter(u => [u.nopol, u.nama_jenis, u.merk, u.nama_vendor, u.nama_supir]
            .some(v => v?.toLowerCase().includes(kata)))
    }, [opsiTersedia, cari])

    const terpilihSet = useMemo(() => new Set(terpilih), [terpilih])
    const penuh = terpilih.length >= maks
    const adaTampilTerpilih = opsiTampil.some(u => terpilihSet.has(kunciUnit(u)))
    const semuaTampilTerpilih = adaTampilTerpilih && (penuh || opsiTampil.every(u => terpilihSet.has(kunciUnit(u))))

    const togglePilih = (kunci: string) => setTerpilih(prev => {
        if (prev.includes(kunci)) return prev.filter(k => k !== kunci)
        return prev.length >= maks ? prev : [...prev, kunci]
    })

    const toggleSemuaTampil = (checked: boolean) => setTerpilih(prev => {
        const kunciTampil = opsiTampil.map(kunciUnit)
        if (!checked) {
            const dibuang = new Set(kunciTampil)
            return prev.filter(k => !dibuang.has(k))
        }
        const hasil = [...prev]
        for (const kunci of kunciTampil) {
            if (hasil.length >= maks) break
            if (!hasil.includes(kunci)) hasil.push(kunci)
        }
        return hasil
    })

    const keteranganKosong = galatOpsi
        ? 'Gagal memuat daftar unit — tutup lalu buka lagi untuk mencoba ulang'
        : opsiTersedia.length === 0 ? pesanKosong : null

    const simpan = () => {
        const pilihan = opsiTersedia.filter(u => terpilihSet.has(kunciUnit(u)))
        if (pilihan.length > 0) onSimpan(pilihan)
    }

    return (
        <Dialog isOpen={isOpen} onRequestClose={onClose} onClose={onClose} width={800}>
            <h5 className="text-base font-semibold mb-1">Tambah Unit Proyek</h5>
            <p className="text-xs text-gray-400 mb-4">{keterangan}</p>
            {memuatOpsi ? (
                <div className="flex justify-center py-6"><Spinner /></div>
            ) : keteranganKosong ? (
                <p className="text-sm text-gray-400 py-6 text-center">{keteranganKosong}</p>
            ) : (
                <>
                    <Input
                        placeholder="Cari nopol, jenis, vendor, atau supir... (tekan Enter)"
                        suffix={cariInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setCariInput(''); setCari('') }} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => setCari(cariInput.trim())} />}
                        value={cariInput}
                        onChange={e => setCariInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setCari(cariInput.trim()) } }}
                    />
                    <div className="max-h-[50vh] overflow-y-auto mt-3 rounded-lg border border-gray-100 dark:border-gray-700">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th className="py-2.5 pl-3 pr-2 w-10">
                                        <Checkbox checked={semuaTampilTerpilih} disabled={opsiTampil.length === 0 || (penuh && !adaTampilTerpilih)}
                                            onChange={() => toggleSemuaTampil(!semuaTampilTerpilih)} />
                                    </th>
                                    <th className={TH}>Unit</th>
                                    <th className={TH}>Kepemilikan</th>
                                    <th className={TH}>Supir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {opsiTampil.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-6 text-center text-gray-400">Tidak ada unit yang cocok dengan pencarian</td>
                                    </tr>
                                ) : opsiTampil.map(u => {
                                    const kunci = kunciUnit(u)
                                    const dipilih = terpilihSet.has(kunci)
                                    const nonaktif = !dipilih && penuh
                                    const sumber = SUMBER_UNIT_TAG[u.sumber] ?? SUMBER_UNIT_TAG.internal
                                    const detail = ringkasUnit(u)
                                    return (
                                        <tr key={kunci}
                                            className={`${nonaktif ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40'} ${dipilih ? 'bg-blue-50/60 dark:bg-blue-500/10' : ''}`}
                                            onClick={() => { if (!nonaktif) togglePilih(kunci) }}>
                                            <td className="py-3 pl-3 pr-2" onClick={e => e.stopPropagation()}>
                                                <Checkbox checked={dipilih} disabled={nonaktif} onChange={() => togglePilih(kunci)} />
                                            </td>
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
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">{terpilih.length}</span>{opsiTersedia.length > maks ? ` dari ${opsiTersedia.length}` : ''} unit dipilih
                    {penuh && <span className="text-amber-600 dark:text-amber-400"> — maksimal {maks} unit</span>}
                </p>
                <div className="flex gap-2">
                    <Button type="button" variant="plain" onClick={onClose}>Kembali</Button>
                    <Button type="button" variant="solid" loading={menyimpan} disabled={terpilih.length === 0} onClick={simpan}>
                        Simpan
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}
