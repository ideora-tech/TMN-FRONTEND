'use client'
import { useCallback, useEffect, useState } from 'react'
import { Button, Spinner, Upload, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LampiranPreview from '@/components/shared/LampiranPreview'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import { HiOutlineDocumentText, HiOutlinePaperClip, HiOutlineTrash, HiPlusCircle } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import {
    lampiranMasterService,
    EKSTENSI_LAMPIRAN_MASTER,
    MAKS_LAMPIRAN_MASTER,
    MAKS_UKURAN_LAMPIRAN_MASTER,
    type JenisPemilikLampiran,
    type LampiranMaster,
} from '@/services/lampiran-master.service'

const ACCEPT = EKSTENSI_LAMPIRAN_MASTER.map(e => `.${e}`).join(',')
const KETERANGAN = `Foto (JPG, PNG, WEBP), PDF, Word, Excel · maks. 5 MB per berkas · maks. ${MAKS_LAMPIRAN_MASTER} berkas`
const KELAS_GRID = 'grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(130px,1fr))]'
const KELAS_HAPUS = 'absolute top-1 right-1 cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 shadow transition-colors'

const ekstensi = (nama: string) => (nama.split('.').pop() ?? '').toLowerCase()
const ukuranTeks = (byte: number) => (byte >= 1024 * 1024 ? `${(byte / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(byte / 1024))} KB`)

const saringBerkas = (files: File[], sisa: number): File[] => {
    const valid = files.filter(f => {
        if (!EKSTENSI_LAMPIRAN_MASTER.includes(ekstensi(f.name))) {
            toast.push(<Notification type="danger" title={`${f.name} bukan foto, PDF, Word, atau Excel`} />)
            return false
        }
        if (f.size > MAKS_UKURAN_LAMPIRAN_MASTER) {
            toast.push(<Notification type="danger" title={`${f.name} melebihi 5 MB`} />)
            return false
        }
        return true
    })
    if (valid.length > sisa) {
        toast.push(<Notification type="danger" title={`Maksimal ${MAKS_LAMPIRAN_MASTER} berkas`} />)
        return valid.slice(0, Math.max(sisa, 0))
    }
    return valid
}

export function PilihLampiranMaster({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
    const [resetPilih, setResetPilih] = useState(0)

    const pilih = (dipilih: File[]) => {
        onChange([...files, ...saringBerkas(dipilih, MAKS_LAMPIRAN_MASTER - files.length)])
        setResetPilih(n => n + 1)
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Foto &amp; Lampiran (opsional)</p>
                <Upload key={resetPilih} multiple accept={ACCEPT} showList={false} fileList={[]} onChange={pilih}>
                    <Button type="button" size="sm" variant="plain" icon={<HiOutlinePaperClip />}>Pilih Berkas</Button>
                </Upload>
            </div>
            <p className="text-xs text-gray-400 mb-3">{KETERANGAN}</p>
            {files.length === 0 ? (
                <p className="text-gray-400 text-sm py-2">Belum ada berkas dipilih</p>
            ) : (
                <div className={KELAS_GRID}>
                    {files.map((f, idx) => (
                        <div key={`${f.name}-${f.size}-${idx}`} className="relative">
                            <LampiranPreview file={f} />
                            <p className="text-xs text-gray-400 truncate mt-1" title={f.name}>{f.name} · {ukuranTeks(f.size)}</p>
                            <span className={KELAS_HAPUS} onClick={() => onChange(files.filter((_, i) => i !== idx))}>
                                <HiOutlineTrash className="text-sm" />
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

type PanelProps = {
    jenis: JenisPemilikLampiran
    idPemilik: string
    namaPemilik: string
}

export function LampiranMasterPanel({ jenis, idPemilik, namaPemilik }: PanelProps) {
    const { klik } = usePratinjauBerkas()
    const [daftar, setDaftar]       = useState<LampiranMaster[]>([])
    const [memuat, setMemuat]       = useState(true)
    const [gagal, setGagal]         = useState(false)
    const [mengunggah, setMengunggah] = useState(false)
    const [resetUnggah, setResetUnggah] = useState(0)
    const [hapusTarget, setHapusTarget] = useState<LampiranMaster | null>(null)
    const [menghapus, setMenghapus] = useState(false)

    const muat = useCallback(async () => {
        setMemuat(true)
        setGagal(false)
        try {
            setDaftar(await lampiranMasterService.list(jenis, idPemilik))
        } catch {
            setGagal(true)
        } finally {
            setMemuat(false)
        }
    }, [jenis, idPemilik])

    useEffect(() => { muat() }, [muat])

    const sisa = MAKS_LAMPIRAN_MASTER - daftar.length

    const unggah = async (dipilih: File[]) => {
        const files = saringBerkas(dipilih, sisa)
        if (files.length === 0 || mengunggah) {
            setResetUnggah(n => n + 1)
            return
        }
        setMengunggah(true)
        try {
            setDaftar(await lampiranMasterService.upload(jenis, idPemilik, files))
            toast.push(<Notification type="success" title={`${files.length} berkas berhasil diunggah`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            muat()
        } finally {
            setMengunggah(false)
            setResetUnggah(n => n + 1)
        }
    }

    const hapus = async () => {
        if (!hapusTarget || menghapus) return
        setMenghapus(true)
        try {
            await lampiranMasterService.hapus(jenis, idPemilik, hapusTarget.id_lampiran)
            setDaftar(prev => prev.filter(l => l.id_lampiran !== hapusTarget.id_lampiran))
            toast.push(<Notification type="success" title="Lampiran berhasil dihapus" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenghapus(false)
            setHapusTarget(null)
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    Foto &amp; Lampiran{!memuat && !gagal ? ` (${daftar.length}/${MAKS_LAMPIRAN_MASTER})` : ''}
                </p>
                <div className="flex items-center gap-3">
                    {mengunggah && <Spinner size={20} />}
                    {!memuat && !gagal && sisa > 0 && (
                        <Upload key={resetUnggah} multiple accept={ACCEPT} showList={false} fileList={[]} disabled={mengunggah}
                            onChange={unggah}>
                            <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />} disabled={mengunggah}>Tambah Berkas</Button>
                        </Upload>
                    )}
                </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">{KETERANGAN} · langsung tersimpan saat diunggah</p>

            {memuat ? (
                <div className="flex justify-center py-6"><Spinner size={24} /></div>
            ) : gagal ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                    Lampiran gagal dimuat.{' '}
                    <button type="button" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline" onClick={muat}>Coba lagi</button>
                </p>
            ) : daftar.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">Belum ada foto atau lampiran</p>
            ) : (
                <div className={KELAS_GRID}>
                    {daftar.map(l => {
                        const url = l.url_file ?? undefined
                        const judul = `${namaPemilik} · ${l.nama_asli}`
                        const namaUnduh = l.nama_asli.replace(/\.[^.]+$/, '')
                        const ubin = l.gambar && url ? (
                            <img src={url} alt={l.nama_asli}
                                className="w-full h-28 object-cover rounded-lg border border-gray-100 dark:border-gray-700 hover:opacity-90 transition-opacity" />
                        ) : (
                            <div className="w-full h-28 flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <HiOutlineDocumentText className="text-3xl" />
                                <span className="text-xs font-semibold uppercase">{ekstensi(l.nama_asli) || 'File'}</span>
                            </div>
                        )
                        return (
                            <div key={l.id_lampiran} className="relative">
                                {url ? (
                                    <a href={url} onClick={klik(url, judul, namaUnduh)} target="_blank" rel="noopener noreferrer" title={`Buka ${l.nama_asli}`}>
                                        {ubin}
                                    </a>
                                ) : ubin}
                                <p className="text-xs text-gray-400 truncate mt-1" title={l.nama_asli}>{l.nama_asli} · {ukuranTeks(l.ukuran)}</p>
                                <span className={KELAS_HAPUS} onClick={() => setHapusTarget(l)}>
                                    <HiOutlineTrash className="text-sm" />
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}

            <ConfirmDialog isOpen={!!hapusTarget} type="danger" title="Hapus Lampiran"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setHapusTarget(null)} onCancel={() => setHapusTarget(null)}
                onConfirm={hapus} confirmButtonProps={{ loading: menghapus }}>
                <p className="break-all">Hapus lampiran {hapusTarget?.nama_asli}?</p>
            </ConfirmDialog>
        </div>
    )
}
