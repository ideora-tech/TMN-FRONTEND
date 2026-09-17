'use client'
import { useEffect, useState } from 'react'
import { Button, Card, Spinner, Upload, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import { HiOutlinePhotograph, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { sparepartService, MAKS_FOTO_SPAREPART, type FotoSparepart, type Sparepart } from '@/services/sparepart.service'

const MAKS_UKURAN = 5 * 1024 * 1024
const FOTO_ACCEPT = '.jpg,.jpeg,.png,.webp'
const KETERANGAN = `JPG, PNG, WEBP · maks. 5 MB per foto · maks. ${MAKS_FOTO_SPAREPART} foto`

const saringFoto = (files: File[], sisa: number): File[] => {
    const valid = files.filter(f => {
        if (!f.type.startsWith('image/')) {
            toast.push(<Notification type="danger" title={`${f.name} bukan file foto`} />)
            return false
        }
        if (f.size > MAKS_UKURAN) {
            toast.push(<Notification type="danger" title={`${f.name} melebihi 5 MB`} />)
            return false
        }
        return true
    })
    if (valid.length > sisa) {
        toast.push(<Notification type="danger" title={`Maksimal ${MAKS_FOTO_SPAREPART} foto per spare part`} />)
        return valid.slice(0, Math.max(sisa, 0))
    }
    return valid
}

function FotoBaru({ file, onRemove }: { file: File; onRemove: () => void }) {
    const [src, setSrc] = useState('')
    useEffect(() => {
        const url = URL.createObjectURL(file)
        setSrc(url)
        return () => URL.revokeObjectURL(url)
    }, [file])

    return (
        <div className="relative">
            {src && (
                <img src={src} alt={file.name}
                    className="w-full h-28 object-cover rounded-lg border border-dashed border-blue-300 dark:border-blue-500/40" />
            )}
            <p className="text-xs text-gray-400 truncate mt-1">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>
            <span
                className="absolute top-1 right-1 cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 shadow transition-colors"
                onClick={onRemove}>
                <HiOutlineTrash className="text-sm" />
            </span>
        </div>
    )
}

export function PilihFotoSparepart({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
    return (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Foto Spare Part (opsional)</p>
                <Upload multiple accept={FOTO_ACCEPT} showList={false} fileList={files}
                    onChange={dipilih => onChange(saringFoto(dipilih, MAKS_FOTO_SPAREPART))}>
                    <Button type="button" size="sm" variant="plain" icon={<HiOutlinePhotograph />}>Pilih Foto</Button>
                </Upload>
            </div>
            <p className="text-xs text-gray-400 mb-3">{KETERANGAN}</p>
            {files.length === 0 ? (
                <p className="text-gray-400 text-sm py-2">Belum ada foto dipilih</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {files.map((f, idx) => (
                        <FotoBaru key={`${f.name}-${f.size}-${idx}`} file={f}
                            onRemove={() => onChange(files.filter((_, i) => i !== idx))} />
                    ))}
                </div>
            )}
        </div>
    )
}

export function FotoSparepartCard({ sparepart, onChange }: { sparepart: Sparepart; onChange: (s: Sparepart) => void }) {
    const { klik } = usePratinjauBerkas()
    const [mengunggah, setMengunggah] = useState(false)
    const [resetUnggah, setResetUnggah] = useState(0)
    const [hapusTarget, setHapusTarget] = useState<FotoSparepart | null>(null)
    const [menghapus, setMenghapus] = useState(false)

    const foto = sparepart.foto ?? []
    const sisa = MAKS_FOTO_SPAREPART - foto.length

    const unggah = async (dipilih: File[]) => {
        const files = saringFoto(dipilih, sisa)
        if (files.length === 0) return
        setMengunggah(true)
        try {
            onChange(await sparepartService.uploadFoto(sparepart.id_sparepart, files))
            toast.push(<Notification type="success" title={`${files.length} foto berhasil diunggah`} />)
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
            await sparepartService.hapusFoto(sparepart.id_sparepart, hapusTarget.id_foto)
            onChange({ ...sparepart, foto: foto.filter(f => f.id_foto !== hapusTarget.id_foto) })
            toast.push(<Notification type="success" title="Foto berhasil dihapus" />)
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
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Foto Spare Part ({foto.length}/{MAKS_FOTO_SPAREPART})</p>
                <div className="flex items-center gap-3">
                    {mengunggah && <Spinner size={20} />}
                    {sisa > 0 && (
                        <Upload key={resetUnggah} multiple accept={FOTO_ACCEPT} showList={false} fileList={[]} disabled={mengunggah}
                            onChange={unggah}>
                            <Button type="button" size="sm" variant="solid" icon={<HiOutlinePhotograph />} disabled={mengunggah}>Tambah Foto</Button>
                        </Upload>
                    )}
                </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">{KETERANGAN}</p>
            {foto.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">Belum ada foto</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {foto.map(f => (
                        <div key={f.id_foto} className="relative">
                            <a href={f.url_file} onClick={klik(f.url_file, `${sparepart.nama} · ${f.nama_asli}`, `${sparepart.kode}-${f.nama_asli.replace(/\.[^.]+$/, '')}`)}
                                target="_blank" rel="noopener noreferrer" title={`Buka ${f.nama_asli}`}>
                                <img src={f.url_file} alt={f.nama_asli}
                                    className="w-full h-28 object-cover rounded-lg border border-gray-100 dark:border-gray-700 hover:opacity-90 transition-opacity" />
                            </a>
                            <p className="text-xs text-gray-400 truncate mt-1">{f.nama_asli}</p>
                            <span
                                className="absolute top-1 right-1 cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 shadow transition-colors"
                                onClick={() => setHapusTarget(f)}>
                                <HiOutlineTrash className="text-sm" />
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog isOpen={!!hapusTarget} type="danger" title="Hapus Foto"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setHapusTarget(null)} onCancel={() => setHapusTarget(null)}
                onConfirm={hapus} confirmButtonProps={{ loading: menghapus }}>
                <p>Hapus foto {hapusTarget?.nama_asli}?</p>
            </ConfirmDialog>
        </Card>
    )
}
