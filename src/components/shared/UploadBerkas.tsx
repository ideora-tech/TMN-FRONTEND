'use client'
import { useEffect, useState } from 'react'
import { Button, Upload } from '@/components/ui'
import { HiOutlinePaperClip, HiOutlineDocumentText, HiOutlineTrash } from 'react-icons/hi'

type UploadBerkasProps = {
    file: File | null
    onChange?: (f: File | null) => void
    multiple?: boolean
    onFiles?: (files: File[]) => void
    loading?: boolean
    accept?: string
    label?: string
    hint?: string | null
    existingUrl?: string | null
    existingLabel?: string
    emptyText?: string | null
}

const IMAGE_URL_REGEX = /\.(jpe?g|png|webp|gif)(\?|$)/i

const ukuranMb = (file: File) => (file.size / 1024 / 1024).toFixed(1)

function PratinjauGambar({ file, onRemove }: { file: File; onRemove: () => void }) {
    const [src, setSrc] = useState('')
    useEffect(() => {
        const url = URL.createObjectURL(file)
        setSrc(url)
        return () => URL.revokeObjectURL(url)
    }, [file])

    return (
        <div className="relative w-40 mt-2">
            {src && (
                <img src={src} alt={file.name}
                    className="w-40 h-24 object-cover rounded-lg border border-dashed border-blue-300 dark:border-blue-500/40" />
            )}
            <p className="text-xs text-gray-400 truncate mt-1">{file.name} · {ukuranMb(file)} MB</p>
            <span
                className="absolute top-1 right-1 cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 shadow transition-colors"
                onClick={onRemove}>
                <HiOutlineTrash className="text-sm" />
            </span>
        </div>
    )
}

export default function UploadBerkas({
    file,
    onChange,
    multiple = false,
    onFiles,
    loading = false,
    accept = '.jpg,.jpeg,.png,.pdf',
    label = 'Pilih file',
    hint = 'JPG/PNG/PDF · maksimal 5 MB',
    existingUrl = null,
    existingLabel = 'Bukti tersimpan',
    emptyText = null,
}: UploadBerkasProps) {
    const existingIsImage = !!existingUrl && IMAGE_URL_REGEX.test(existingUrl)

    return (
        <div>
            <Upload accept={accept} showList={false} disabled={loading}
                multiple={multiple} uploadLimit={multiple ? undefined : 1}
                onChange={(semua, sebelumnya) => {
                    if (multiple) {
                        const baru = semua.slice(sebelumnya.length)
                        if (baru.length > 0) onFiles?.(baru)
                    } else {
                        onChange?.(semua[0] ?? null)
                    }
                }}>
                <Button type="button" variant="default" size="sm" icon={<HiOutlinePaperClip />} loading={loading}>{label}</Button>
            </Upload>
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
            {file && file.type.startsWith('image/') && (
                <PratinjauGambar file={file} onRemove={() => onChange?.(null)} />
            )}
            {file && !file.type.startsWith('image/') && (
                <div className="flex items-center gap-2 mt-2">
                    <HiOutlineDocumentText className="text-base text-gray-400 shrink-0" />
                    <p className="text-xs text-gray-400 truncate">{file.name} · {ukuranMb(file)} MB</p>
                    <span
                        className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors shrink-0"
                        onClick={() => onChange?.(null)}>
                        <HiOutlineTrash className="text-sm" />
                    </span>
                </div>
            )}
            {!file && existingUrl && existingIsImage && (
                <div className="w-40 mt-2">
                    <a href={existingUrl} target="_blank" rel="noreferrer">
                        <img src={existingUrl} alt={existingLabel}
                            className="w-40 h-24 object-cover rounded-lg border border-gray-100 dark:border-gray-700" />
                    </a>
                    <p className="text-xs text-gray-400 truncate mt-1">{existingLabel}</p>
                </div>
            )}
            {!file && existingUrl && !existingIsImage && (
                <a href={existingUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mt-2">
                    <HiOutlineDocumentText className="text-base" />
                    {existingLabel}
                </a>
            )}
            {!file && !existingUrl && emptyText && (
                <p className="text-xs text-gray-400 italic mt-1">{emptyText}</p>
            )}
        </div>
    )
}
