'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, Tag, toast, Notification } from '@/components/ui'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiArrowLeft, HiOutlineInformationCircle, HiOutlineExclamation } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { dokumenArmadaService, DokumenArmadaDetail } from '@/services/dokumenArmada.service'
import { getExpiryInfo, labelJenisDokumen, ukuranFileTerlaluBesar, pesanFileTerlaluBesar } from '../../dokumenArmada.shared'

function Info({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">{children}</div>
        </div>
    )
}

export default function PerpanjangDokumenArmadaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData] = useState<DokumenArmadaDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [nomor, setNomor] = useState('')
    const [berlakuSampai, setBerlakuSampai] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [saving, setSaving] = useState(false)
    const [sudahSubmit, setSudahSubmit] = useState(false)

    useEffect(() => {
        dokumenArmadaService.get(id)
            .then(d => {
                setData(d)
                setNomor(d.nomor ?? '')
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false))
    }, [id])

    const kembali = () => router.push(ROUTES.DOKUMEN_ARMADA_DETAIL(id))

    const tanggalMinimal = data?.berlaku_sampai ? dayjs(data.berlaku_sampai).add(1, 'day') : null
    const tanggalTidakValid = !!berlakuSampai && !!tanggalMinimal && dayjs(berlakuSampai).isBefore(tanggalMinimal, 'day')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSudahSubmit(true)
        if (!data || !berlakuSampai || !file || tanggalTidakValid) {
            toast.push(<Notification type="danger" title="Lengkapi tanggal berlaku baru dan file dokumen baru" />)
            return
        }
        setSaving(true)
        try {
            const baru = await dokumenArmadaService.perpanjang(data.id_armada, data.id_dokumen_armada, {
                nomor: nomor.trim() || null,
                berlaku_sampai: berlakuSampai,
                file,
            })
            toast.push(<Notification type="success" title={`Dokumen ${labelJenisDokumen(data.jenis_dokumen)} berhasil diperpanjang`} />)
            router.push(ROUTES.DOKUMEN_ARMADA_DETAIL(baru.id_dokumen_armada))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (notFound || !data) return <div className="p-6 text-red-500">Dokumen armada tidak ditemukan.</div>

    const expiry = getExpiryInfo(data.berlaku_sampai)
    const unit = data.armada_merk ? `${data.armada_nopol ?? '—'} · ${data.armada_merk}` : (data.armada_nopol ?? '—')

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={kembali}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">Perpanjang Dokumen {labelJenisDokumen(data.jenis_dokumen)}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">{unit}</p>
                </div>
            </div>

            <Card>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Dokumen Saat Ini</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-8 gap-y-5">
                    <Info label="Jenis Dokumen">{labelJenisDokumen(data.jenis_dokumen)}</Info>
                    <Info label="Nomor Dokumen"><span className="font-mono">{data.nomor ?? '—'}</span></Info>
                    <Info label="Berlaku Sampai">
                        <div className="flex items-center gap-2">
                            <span>{data.berlaku_sampai ? dayjs(data.berlaku_sampai).format('DD MMM YYYY') : '—'}</span>
                            {data.aktif && data.berlaku_sampai && <Tag className={`text-xs font-semibold ${expiry.className}`}>{expiry.label}</Tag>}
                        </div>
                    </Info>
                    <Info label="File Dokumen">
                        {data.url_file
                            ? <a href={data.url_file} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Lihat file lama</a>
                            : '—'}
                    </Info>
                </div>
            </Card>

            <Card>
                {!data.aktif ? (
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-300">
                        <HiOutlineExclamation className="text-lg shrink-0 mt-0.5" />
                        <span>
                            Dokumen ini sudah pernah diperpanjang.
                            {data.id_dokumen_pengganti && (
                                <> <button type="button" className="font-semibold underline"
                                    onClick={() => router.push(ROUTES.DOKUMEN_ARMADA_PERPANJANG(data.id_dokumen_pengganti as string))}>
                                    Perpanjang dokumen yang berlaku saat ini
                                </button></>
                            )}
                        </span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Dokumen Baru</p>
                        <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5 mb-4 text-sm text-blue-700 dark:text-blue-300">
                            <HiOutlineInformationCircle className="text-lg shrink-0 mt-0.5" />
                            <span>Dokumen lama tetap tersimpan sebagai riwayat dan tidak lagi memicu peringatan habis masa berlaku.</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nomor Dokumen">
                                <Input placeholder="Contoh: B 1234 XYZ" value={nomor} onChange={e => setNomor(e.target.value)} />
                            </FormItem>
                            <FormItem label="Berlaku Sampai" asterisk
                                invalid={(sudahSubmit && !berlakuSampai) || tanggalTidakValid}
                                errorMessage={tanggalTidakValid && tanggalMinimal
                                    ? `Harus setelah ${dayjs(data.berlaku_sampai).format('DD MMM YYYY')}`
                                    : 'Tanggal berlaku baru wajib diisi'}>
                                <DatePicker
                                    minDate={tanggalMinimal ? tanggalMinimal.toDate() : undefined}
                                    value={berlakuSampai ? new Date(berlakuSampai) : null}
                                    onChange={date => setBerlakuSampai(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                            </FormItem>
                            <FormItem label="File Dokumen Baru" asterisk invalid={sudahSubmit && !file} errorMessage="File dokumen baru wajib diunggah" className="sm:col-span-2">
                                <UploadBerkas
                                    file={file}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    label="Pilih file"
                                    hint="PDF/JPG/PNG · maksimal 5 MB"
                                    onChange={f => {
                                        if (f && ukuranFileTerlaluBesar(f)) {
                                            toast.push(<Notification type="danger" title={pesanFileTerlaluBesar(f)} />)
                                            return
                                        }
                                        setFile(f)
                                    }}
                                />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={kembali}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan Perpanjangan</Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    )
}
