'use client'
import { useEffect, useState } from 'react'
import { Dialog, Button, Tag, Spinner } from '@/components/ui'
import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import ApprovalTimeline, { type StatusApprovalReferensi } from './ApprovalTimeline'

export type { StatusApprovalReferensi }

const STATUS_LABEL: Record<string, string> = {
    menunggu: 'Menunggu Approval',
    disetujui: 'Disetujui',
    ditolak: 'Ditolak',
    dibatalkan: 'Dibatalkan',
}

const STATUS_TAG: Record<string, string> = {
    menunggu: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    disetujui: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    ditolak: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    dibatalkan: 'bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-300',
}

type Props = {
    isOpen: boolean
    onClose: () => void
    kode: string
    idReferensi: string
    emptyMessage?: string
}

export default function LogApprovalDialog({ isOpen, onClose, kode, idReferensi, emptyMessage }: Props) {
    const [info, setInfo] = useState<StatusApprovalReferensi | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setLoading(true)
        axios.get(API_ENDPOINTS.APPROVAL_STATUS_REFERENSI, { params: { kode, id_referensi: idReferensi } })
            .then(r => setInfo(r.data.data as StatusApprovalReferensi | null))
            .catch(() => setInfo(null))
            .finally(() => setLoading(false))
    }, [isOpen, kode, idReferensi])

    return (
        <Dialog isOpen={isOpen} width={520} closable={false} onRequestClose={onClose} onClose={onClose}>
            <div className="flex items-center justify-between gap-3 mb-1">
                <h5 className="font-bold">Log Approval</h5>
                {info && (
                    <Tag className={`${STATUS_TAG[info.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-100'} border-0 font-semibold`}>
                        {STATUS_LABEL[info.status] ?? info.status}
                    </Tag>
                )}
            </div>
            {info && (
                <p className="text-xs text-gray-400 mb-5">
                    {info.progress.disetujui} dari {info.progress.total} approver menyetujui
                </p>
            )}

            {loading ? (
                <div className="flex justify-center py-10"><Spinner size={28} /></div>
            ) : !info ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                    {emptyMessage ?? 'Belum ada pengajuan approval untuk data ini.'}
                </p>
            ) : (
                <div className="max-h-[60vh] overflow-y-auto pr-1">
                    <ApprovalTimeline info={info} />
                </div>
            )}

            <div className="flex justify-center mt-4">
                <Button variant="default" onClick={onClose}>Kembali</Button>
            </div>
        </Dialog>
    )
}
