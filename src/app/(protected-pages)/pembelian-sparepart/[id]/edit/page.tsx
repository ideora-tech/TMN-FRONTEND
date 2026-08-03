'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast, Notification } from '@/components/ui'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { pembelianSparepartService, PembelianSparepart } from '@/services/pembelianSparepart.service'
import PembelianForm from '../../PembelianForm'

export default function PembelianEditPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [initial, setInitial] = useState<PembelianSparepart | null>(null)

    useEffect(() => {
        pembelianSparepartService.get(id)
            .then(data => {
                if (data.status !== 'diajukan') {
                    toast.push(<Notification type="warning" title="Pengajuan sudah diproses, tidak bisa diedit" />)
                    router.replace(ROUTES.PEMBELIAN_SPAREPART_DETAIL(id))
                    return
                }
                setInitial(data)
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
    }, [id, router])

    if (!initial) return null
    return <PembelianForm mode="edit" initial={initial} />
}
