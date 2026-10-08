'use client'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type TeksLipatProps = {
    teks: string
    awalan?: ReactNode
    className?: string
}

export default function TeksLipat({ teks, awalan, className = '' }: TeksLipatProps) {
    const ref = useRef<HTMLParagraphElement>(null)
    const [terbuka, setTerbuka] = useState(false)
    const [terpotong, setTerpotong] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el || terbuka) return
        const cek = () => setTerpotong(el.scrollHeight > el.clientHeight + 1)
        cek()
        const pengamat = new ResizeObserver(cek)
        pengamat.observe(el)
        return () => pengamat.disconnect()
    }, [teks, terbuka])

    return (
        <div className={className}>
            <p ref={ref} className={`whitespace-pre-line [overflow-wrap:anywhere] ${terbuka ? '' : 'line-clamp-2'}`}>
                {awalan}{awalan ? ' ' : ''}{teks}
            </p>
            {terpotong && (
                <button type="button" className="mt-1 font-semibold hover:underline" onClick={() => setTerbuka(v => !v)}>
                    {terbuka ? 'Ringkas' : 'Selengkapnya'}
                </button>
            )}
        </div>
    )
}
