'use client'
import { useState } from 'react'
import { Button, Card, Spinner, Tooltip, Upload, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LampiranPreview from '@/components/shared/LampiranPreview'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import { HiOutlineDocumentText, HiOutlinePaperClip, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { penawaranService, MAKS_LAMPIRAN_PENAWARAN, type LampiranPenawaran, type Penawaran } from '@/services/penawaran.service'

const LAMPIRAN_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx'
const MAKS_UKURAN = 5 * 1024 * 1024
const KETERANGAN = `JPG, PNG, WEBP, PDF, Excel, atau Word · maks. 5 MB per file · maks. ${MAKS_LAMPIRAN_PENAWARAN} file`

const validasiUpload = (jumlahSaatIni: number) => (baru: FileList | null): boolean | string => {
    const daftar = Array.from(baru ?? [])
    if (jumlahSaatIni + daftar.length > MAKS_LAMPIRAN_PENAWARAN) return `Maksimal ${MAKS_LAMPIRAN_PENAWARAN} file lampiran`
    const kebesaran = daftar.find(f => f.size > MAKS_UKURAN)
    if (kebesaran) return `File ${kebesaran.name} melebihi 5 MB`
    return true
}

const isGambarUrl = (nama: string) => /\.(jpe?g|png|webp|gif)$/i.test(nama)

function LampiranTampil({ lampiran }: { lampiran: LampiranPenawaran }) {
    if (isGambarUrl(lampiran.nama_asli)) {
        return (
            <img src={lampiran.url_file} alt={lampiran.nama_asli}
                className="w-full h-28 object-cover rounded-lg border border-gray-100 dark:border-gray-700 hover:opacity-90 transition-opacity" />
        )
    }
    const ekstensi = (lampiran.nama_asli.split('.').pop() ?? '').toLowerCase()
    return (
        <div className="w-full h-28 flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:opacity-90 transition-opacity">
            <HiOutlineDocumentText className="text-3xl" />
            <span className="text-xs font-semibold uppercase">{ekstensi || 'File'}</span>
        </div>
    )
}

export function PilihLampiranPenawaran({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
    return (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Lampiran (opsional)</p>
                <Upload multiple accept={LAMPIRAN_ACCEPT} showList={false} fileList={files}
                    beforeUpload={validasiUpload(files.length)}
                    onChange={dipilih => onChange(dipilih)}>
                    <Button type="button" size="sm" variant="plain" icon={<HiOutlinePaperClip />}>Pilih File</Button>
                </Upload>
            </div>
            <p className="text-xs text-gray-400 mb-3">{KETERANGAN}</p>
            {files.length === 0 ? (
                <p className="text-gray-400 text-sm py-2">Belum ada file dipilih</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {files.map((f, idx) => (
                        <div key={`${f.name}-${f.size}-${idx}`} className="relative">
                            <LampiranPreview file={f} />
                            <p className="text-xs text-gray-400 truncate mt-1">{f.name}</p>
                            <span
                                className="absolute top-1 right-1 cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 shadow transition-colors"
                                onClick={() => onChange(files.filter((_, i) => i !== idx))}>
                                <HiOutlineTrash className="text-sm" />
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export function LampiranPenawaranCard({ penawaran, onChange }: { penawaran: Penawaran; onChange: (p: Penawaran) => void }) {
    const { klik } = usePratinjauBerkas()
    const [mengunggah, setMengunggah] = useState(false)
    const [resetUnggah, setResetUnggah] = useState(0)
    const [hapusTarget, setHapusTarget] = useState<LampiranPenawaran | null>(null)
    const [menghapus, setMenghapus] = useState(false)

    const lampiran = penawaran.lampiran ?? []
    const sisa = MAKS_LAMPIRAN_PENAWARAN - lampiran.length
    const bolehTambah = penawaran.status !== 'ditolak'
    const bolehHapus = penawaran.status !== 'disetujui' && penawaran.status !== 'ditolak'

    const unggah = async (baru: File[]) => {
        if (baru.length === 0) return
        setMengunggah(true)
        try {
            onChange(await penawaranService.uploadLampiran(penawaran.id_penawaran, baru))
            toast.push(<Notification type="success" title={`${baru.length} file berhasil diunggah`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunggah(false)
            setResetUnggah(n => n + 1)
        }
    }

    const hapus = async () => {
        if (!hapusTarget) return
        setMenghapus(true)
        try {
            await penawaranService.hapusLampiran(penawaran.id_penawaran, hapusTarget.id_lampiran)
            onChange({ ...penawaran, lampiran: lampiran.filter(l => l.id_lampiran !== hapusTarget.id_lampiran) })
            toast.push(<Notification type="success" title="Lampiran berhasil dihapus" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenghapus(false)
            setHapusTarget(null)
        }
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Lampiran ({lampiran.length}/{MAKS_LAMPIRAN_PENAWARAN})</p>
                <div className="flex items-center gap-3">
                    {mengunggah && <Spinner size={20} />}
                    {bolehTambah && sisa > 0 && (
                        <Upload key={resetUnggah} multiple accept={LAMPIRAN_ACCEPT} showList={false} fileList={[]} disabled={mengunggah}
                            beforeUpload={(baru) => {
                                const hasil = validasiUpload(lampiran.length)(baru)
                                if (typeof hasil === 'string') setResetUnggah(n => n + 1)
                                return hasil
                            }}
                            onChange={unggah}>
                            <Button type="button" size="sm" variant="solid" icon={<HiOutlinePaperClip />} disabled={mengunggah}>Tambah Lampiran</Button>
                        </Upload>
                    )}
                </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">{KETERANGAN}</p>
            {lampiran.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">Belum ada lampiran</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {lampiran.map(l => (
                        <div key={l.id_lampiran} className="relative">
                            <a href={l.url_file} onClick={klik(l.url_file, `${penawaran.nomor_penawaran} · ${l.nama_asli}`, l.nama_asli.replace(/\.[^.]+$/, ''))}
                                target="_blank" rel="noopener noreferrer" title={`Buka ${l.nama_asli}`}>
                                <LampiranTampil lampiran={l} />
                            </a>
                            <p className="text-xs text-gray-400 truncate mt-1">{l.nama_asli}</p>
                            {bolehHapus && (
                                <Tooltip title="Hapus">
                                    <span
                                        className="absolute top-1 right-1 cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 shadow transition-colors"
                                        onClick={() => setHapusTarget(l)}>
                                        <HiOutlineTrash className="text-sm" />
                                    </span>
                                </Tooltip>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog isOpen={!!hapusTarget} type="danger" title="Hapus Lampiran"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setHapusTarget(null)} onCancel={() => setHapusTarget(null)}
                onConfirm={hapus} confirmButtonProps={{ loading: menghapus }}>
                <p>Hapus lampiran {hapusTarget?.nama_asli}?</p>
            </ConfirmDialog>
        </Card>
    )
}
