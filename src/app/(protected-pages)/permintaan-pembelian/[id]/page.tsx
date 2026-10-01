'use client'
import { use } from 'react'
import DetailPermintaan from '../DetailPermintaan'

export default function PermintaanPembelianDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)

    return <DetailPermintaan id={id} />
}
