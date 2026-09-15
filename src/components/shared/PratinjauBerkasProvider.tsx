'use client'
import { createContext, useCallback, useContext, useState, type MouseEvent, type ReactNode } from 'react'
import PratinjauBerkasDialog, { type BerkasPratinjau } from './PratinjauBerkasDialog'

type Buka = (berkas: BerkasPratinjau) => void
type KlikPratinjau = (url: string | null | undefined, judul: string, namaUnduh?: string) => ((e: MouseEvent<HTMLElement>) => void) | undefined

const KonteksPratinjau = createContext<Buka | null>(null)

export function PratinjauBerkasProvider({ children }: { children: ReactNode }) {
    const [berkas, setBerkas] = useState<BerkasPratinjau | null>(null)
    const buka = useCallback<Buka>(b => setBerkas(b), [])

    return (
        <KonteksPratinjau.Provider value={buka}>
            {children}
            {berkas && <PratinjauBerkasDialog berkas={berkas} onClose={() => setBerkas(null)} />}
        </KonteksPratinjau.Provider>
    )
}

export function usePratinjauBerkas(): { klik: KlikPratinjau } {
    const buka = useContext(KonteksPratinjau)
    const klik = useCallback<KlikPratinjau>((url, judul, namaUnduh) => {
        if (!buka || !url) return undefined
        return e => {
            e.preventDefault()
            e.stopPropagation()
            buka({ url, judul, namaUnduh })
        }
    }, [buka])
    return { klik }
}
