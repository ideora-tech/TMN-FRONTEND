'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast, Notification } from '@/components/ui'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { uangJalanService, UangJalan } from '@/services/uangJalan.service'
import UangJalanForm from '../../UangJalanForm'

export default function UangJalanEditPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [initial, setInitial] = useState<UangJalan | null>(null)

    useEffect(() => {
        uangJalanService.get(id)
            .then(data => {
                if (!data.bisa_diubah) {
                    toast.push(<Notification type="warning" title="Uang jalan sudah diproses, tidak bisa diedit" />)
                    router.replace(ROUTES.UANG_JALAN_DETAIL(id))
                    return
                }
                setInitial(data)
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
    }, [id, router])

    if (!initial) return null
    return <UangJalanForm mode="edit" initial={initial} />
}
