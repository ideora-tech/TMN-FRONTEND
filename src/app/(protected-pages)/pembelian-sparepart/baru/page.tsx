import { redirect } from 'next/navigation'

type Props = {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PembelianSparepartBaruPage({ searchParams }: Props) {
    const params = await searchParams
    const idArmada = typeof params.id_armada === 'string' ? params.id_armada : undefined
    const idPerawatan = typeof params.id_perawatan === 'string' ? params.id_perawatan : undefined

    const query = new URLSearchParams({ tipe: 'sparepart' })
    if (idArmada) query.set('id_armada', idArmada)
    if (idPerawatan) query.set('id_perawatan', idPerawatan)

    redirect(`/permintaan-pembelian/baru?${query.toString()}`)
}
