'use client'
import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import PerawatanForm from '../PerawatanForm'

export default function PerawatanEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const searchParams = useSearchParams()
    const idArmada = searchParams.get('armada') ?? ''

    if (!idArmada) return <div className="p-6 text-red-500">Parameter armada tidak ditemukan.</div>

    return <PerawatanForm editId={id} editArmadaId={idArmada} />
}
