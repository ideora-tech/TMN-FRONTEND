'use client'
import { useState } from 'react'
import axios from 'axios'
import { Dialog, Button, Upload, toast, Notification } from '@/components/ui'
import { HiOutlineDocumentText, HiOutlineTrash } from 'react-icons/hi'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { parseApiError } from '@/utils/error.util'

type Props = {
    isOpen: boolean
    onClose: () => void
    kode: string
    idReferensi: string
    nomor?: string | null
    onAjukan: () => Promise<void>
    onSukses: () => void
}

export default function AjukanApprovalDialog({ isOpen, onClose, kode, idReferensi, nomor, onAjukan, onSukses }: Props) {
    const [lampiran, setLampiran] = useState<File[]>([])
    const [submitting, setSubmitting] = useState(false)

    const tutup = () => {
        if (submitting) return
        setLampiran([])
        onClose()
    }

    const handleAjukan = async () => {
        setSubmitting(true)
        try {
            await onAjukan()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setSubmitting(false)
            return
        }

        if (lampiran.length > 0) {
            try {
                const formData = new FormData()
                formData.append('kode', kode)
                formData.append('id_referensi', idReferensi)
                lampiran.forEach(file => formData.append('lampiran[]', file))
                await axios.post(API_ENDPOINTS.APPROVAL_LAMPIRAN, formData)
                toast.push(<Notification type="success" title={`Pengajuan terkirim beserta ${lampiran.length} lampiran`} />)
            } catch (err) {
                toast.push(<Notification type="warning" title={`Pengajuan terkirim, tapi lampiran gagal diunggah: ${parseApiError(err)}`} />)
            }
        } else {
            toast.push(<Notification type="success" title="Pengajuan approval terkirim" />)
        }

        setSubmitting(false)
        setLampiran([])
        onSukses()
        onClose()
    }

    return (
        <Dialog isOpen={isOpen} onRequestClose={tutup} onClose={tutup} width={520}>
            <h5 className="text-base font-semibold mb-1">Ajukan Approval</h5>
            <p className="text-sm text-gray-500 mb-4">
                {nomor ? <><span className="font-semibold">{nomor}</span> akan </> : 'Dokumen ini akan '}
                dikirim ke approver untuk disetujui.
            </p>
            <div className="mb-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lampiran Pendukung (opsional)</p>
                <p className="text-xs text-gray-400 mb-2">Sertakan dokumen pendukung — penawaran, kontrak fisik, nota, dsb. — agar approver bisa memeriksa sebelum memutuskan.</p>
                <Upload
                    accept=".jpg,.jpeg,.png,.pdf,.xls,.xlsx,.doc,.docx"
                    multiple
                    showList={false}
                    fileList={lampiran}
                    beforeUpload={(baru) => {
                        const daftar = Array.from(baru ?? [])
                        if (lampiran.length + daftar.length > 10) return 'Maksimal 10 file lampiran'
                        const kebesaran = daftar.find(f => f.size > 5 * 1024 * 1024)
                        if (kebesaran) return `File ${kebesaran.name} melebihi 5MB`
                        return true
                    }}
                    onChange={files => setLampiran(files)}
                >
                    <Button type="button" variant="default" size="sm" icon={<HiOutlineDocumentText />}>
                        Pilih file (bisa lebih dari satu, maks. 10 file × 5MB)
                    </Button>
                </Upload>
                {lampiran.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-3">
                        {lampiran.map((file, idx) => (
                            <div key={`${file.name}-${idx}`}
                                className="flex items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5">
                                <HiOutlineDocumentText className="text-base text-gray-400 shrink-0" />
                                <p className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">
                                    {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                                </p>
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-6 h-6 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
                                    onClick={() => setLampiran(prev => prev.filter((_, i) => i !== idx))}>
                                    <HiOutlineTrash className="text-sm" />
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={tutup} disabled={submitting}>Batal</Button>
                <Button type="button" variant="solid" loading={submitting} onClick={handleAjukan}>Ajukan</Button>
            </div>
        </Dialog>
    )
}
