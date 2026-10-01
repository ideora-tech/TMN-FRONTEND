'use client'
import { useState } from 'react'
import { toast, Notification } from '@/components/ui'
import LogAktivitasKeuanganDialog from '@/components/shared/LogAktivitasKeuanganDialog'
import { parseApiError } from '@/utils/error.util'
import { arusKasService, PengajuanKeuanganInfo } from '@/services/arusKas.service'

export function useLogPengajuan(ambilRiwayat: (id: string) => Promise<PengajuanKeuanganInfo> = arusKasService.riwayatPengajuan) {
    const [open, setOpen] = useState(false)
    const [info, setInfo] = useState<PengajuanKeuanganInfo | null>(null)
    const [loading, setLoading] = useState(false)

    const bukaLog = (id: string) => {
        setOpen(true)
        setInfo(null)
        setLoading(true)
        ambilRiwayat(id)
            .then(setInfo)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }

    const dialogLog = (
        <LogAktivitasKeuanganDialog
            isOpen={open}
            onClose={() => setOpen(false)}
            info={info}
            loading={loading}
            emptyMessage="Belum ada riwayat untuk pengajuan ini."
        />
    )

    return { bukaLog, dialogLog }
}
