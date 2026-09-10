'use client'
import { useSearchParams } from 'next/navigation'
import PerawatanForm from '../PerawatanForm'

export default function PerawatanBaruPage() {
    const searchParams = useSearchParams()
    const presetArmadaId = searchParams.get('id_armada') ?? undefined
    const presetIntervalPerawatanId = searchParams.get('id_interval_perawatan') ?? undefined
    const rutin = searchParams.get('rutin') === '1'

    return <PerawatanForm presetArmadaId={presetArmadaId} presetIntervalPerawatanId={presetIntervalPerawatanId} rutin={rutin} />
}
