'use client'
import { useEffect, useMemo } from 'react'
import { HiOutlineDocumentText } from 'react-icons/hi'

export default function LampiranPreview({ file }: { file: File }) {
    const isGambar = file.type.startsWith('image/')
    const url = useMemo(() => (isGambar ? URL.createObjectURL(file) : null), [file, isGambar])
    useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

    if (!url) {
        const ekstensi = (file.name.split('.').pop() ?? '').toLowerCase()
        return (
            <div className="w-full h-32 flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400">
                <HiOutlineDocumentText className="text-3xl" />
                <span className="text-xs font-semibold uppercase">{ekstensi || 'File'}</span>
            </div>
        )
    }

    return (
        <img
            src={url}
            alt={file.name}
            className="w-full max-h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
        />
    )
}
