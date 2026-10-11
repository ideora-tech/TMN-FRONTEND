'use client'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Button, Dialog, FormItem, Input, toast, Notification } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { kasKecilService } from '@/services/kasKecil.service'
import { angkaRupiah } from '../kasbon/kasbonMeta'
import { MAKS_NOMINAL, errorPerField } from './kasKecilMeta'

type Props = {
    isOpen: boolean
    onClose: () => void
    onTersimpan: (tanggal: string) => void
}

type FormErrors = { tanggal?: string; nominal?: string; keterangan?: string }

export default function SaldoAwalDialog({ isOpen, onClose, onTersimpan }: Props) {
    const [tanggal, setTanggal]       = useState(dayjs().format('YYYY-MM-DD'))
    const [nominal, setNominal]       = useState('')
    const [keterangan, setKeterangan] = useState('')
    const [errors, setErrors]         = useState<FormErrors>({})
    const [loading, setLoading]       = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setTanggal(dayjs().format('YYYY-MM-DD'))
        setNominal('')
        setKeterangan('')
        setErrors({})
    }, [isOpen])

    const handleSubmit = async () => {
        if (loading) return
        const nilai = Number(nominal)
        const e: FormErrors = {}
        if (!tanggal) e.tanggal = 'Tanggal wajib diisi'
        if (nilai < 1) e.nominal = 'Nominal saldo awal wajib diisi'
        else if (nilai > MAKS_NOMINAL) e.nominal = `Nominal maksimal ${formatRupiah(MAKS_NOMINAL)}`
        setErrors(e)
        if (Object.keys(e).length > 0) return

        setLoading(true)
        try {
            await kasKecilService.catatSaldoAwal({ tanggal, nominal: nilai, keterangan: keterangan.trim() || null })
            toast.push(<Notification type="success" title="Saldo awal kas kecil berhasil dicatat" />)
            onTersimpan(tanggal)
        } catch (err) {
            setErrors(prev => ({ ...prev, ...errorPerField(err) }))
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog isOpen={isOpen} width={480} onRequestClose={onClose} onClose={onClose}>
            <h5 className="font-bold mb-1">Catat Saldo Awal Kas Kecil</h5>
            <p className="text-xs text-gray-400 mb-4">
                Untuk uang tunai yang sudah ada di kas kecil sebelum memakai sistem. Hanya bisa dicatat sekali, sebelum ada
                transaksi lain, dan tidak mengurangi rekening — penambahan dana berikutnya lewat tab Pengisian dari Rekening.
            </p>
            <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <FormItem label="Per Tanggal" asterisk invalid={!!errors.tanggal} errorMessage={errors.tanggal}>
                    <DatePicker inputFormat="DD/MM/YYYY" maxDate={dayjs().toDate()}
                        value={tanggal ? dayjs(tanggal).toDate() : null}
                        onChange={date => { setTanggal(date ? dayjs(date).format('YYYY-MM-DD') : ''); setErrors(p => ({ ...p, tanggal: undefined })) }} />
                </FormItem>
                <FormItem label="Nominal" asterisk invalid={!!errors.nominal} errorMessage={errors.nominal}>
                    <Input prefix="Rp" placeholder="0" value={nominal ? formatNum(Number(nominal)) : ''}
                        invalid={!!errors.nominal}
                        onChange={e => { setNominal(angkaRupiah(e.target.value)); setErrors(p => ({ ...p, nominal: undefined })) }} />
                </FormItem>
                <FormItem label="Keterangan (opsional)" invalid={!!errors.keterangan} errorMessage={errors.keterangan}>
                    <Input maxLength={255} placeholder="Contoh: Sisa kas kecil per akhir September" value={keterangan}
                        onChange={e => setKeterangan(e.target.value)} />
                </FormItem>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={onClose}>Kembali</Button>
                    <Button type="submit" variant="solid" loading={loading}>Simpan</Button>
                </div>
            </form>
        </Dialog>
    )
}
