'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiArrowLeft, HiPlusCircle, HiOutlineTrash, HiOutlineInformationCircle } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { dokumenArmadaService, DokumenArmada } from '@/services/dokumenArmada.service'
import { armadaService, Armada } from '@/services/armada.service'
import {
    JENIS_DOKUMEN_OPTIONS, JENIS_BOLEH_GANDA, labelJenisDokumen,
    ukuranFileTerlaluBesar, pesanFileTerlaluBesar, type Option,
} from '../dokumenArmada.shared'

type Baris = { key: number; jenis_dokumen: string; nomor: string; berlaku_sampai: string; file: File | null }
type OpsiJenis = Option & { isDisabled?: boolean }

const MAKS_BARIS = 20
let urutanBaris = 0
const barisKosong = (): Baris => ({ key: ++urutanBaris, jenis_dokumen: '', nomor: '', berlaku_sampai: '', file: null })

export default function DokumenArmadaBaruPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const presetArmada = searchParams.get('id_armada') ?? ''
    const halamanAsal = presetArmada ? ROUTES.ARMADA_DETAIL(presetArmada) : ROUTES.DOKUMEN_ARMADA

    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])
    const [idArmada, setIdArmada] = useState(presetArmada)
    const [dokumenAda, setDokumenAda] = useState<DokumenArmada[]>([])
    const [baris, setBaris] = useState<Baris[]>([barisKosong()])
    const [saving, setSaving] = useState(false)
    const [sudahSubmit, setSudahSubmit] = useState(false)

    useEffect(() => {
        armadaService.list(1, 100)
            .then(res => setArmadaOptions(res.data.map((a: Armada) => ({ value: a.id_armada, label: a.merk ? `${a.nopol} · ${a.merk}` : a.nopol }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!idArmada) { setDokumenAda([]); return }
        dokumenArmadaService.list(idArmada)
            .then(list => {
                setDokumenAda(list)
                const jenisAda = new Set(list.map(d => d.jenis_dokumen))
                setBaris(prev => prev.map(b =>
                    b.jenis_dokumen && !JENIS_BOLEH_GANDA.includes(b.jenis_dokumen) && jenisAda.has(b.jenis_dokumen)
                        ? { ...b, jenis_dokumen: '' }
                        : b))
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
    }, [idArmada])

    const jenisSudahAda = new Set(dokumenAda.filter(d => !JENIS_BOLEH_GANDA.includes(d.jenis_dokumen)).map(d => d.jenis_dokumen))

    const opsiJenisUntuk = (idx: number): OpsiJenis[] =>
        JENIS_DOKUMEN_OPTIONS
            .filter(o => JENIS_BOLEH_GANDA.includes(o.value) || o.value === baris[idx].jenis_dokumen
                || !baris.some((b, i) => i !== idx && b.jenis_dokumen === o.value))
            .map(o => jenisSudahAda.has(o.value)
                ? { ...o, label: `${o.label} — sudah ada, gunakan Perpanjang`, isDisabled: true }
                : o)

    const ubahBaris = (idx: number, patch: Partial<Baris>) =>
        setBaris(prev => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
    const tambahBaris = () => setBaris(prev => (prev.length >= MAKS_BARIS ? prev : [...prev, barisKosong()]))
    const hapusBaris = (idx: number) => setBaris(prev => prev.filter((_, i) => i !== idx))

    const barisValid = (b: Baris) => !!b.jenis_dokumen && !!b.file
    const formValid = !!idArmada && baris.length > 0 && baris.every(barisValid)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSudahSubmit(true)
        if (!formValid) {
            toast.push(<Notification type="danger" title="Lengkapi armada, jenis dokumen, dan file tiap dokumen" />)
            return
        }
        setSaving(true)
        try {
            const hasil = await dokumenArmadaService.createBatch(idArmada, baris.map(b => ({
                jenis_dokumen: b.jenis_dokumen,
                nomor: b.nomor.trim() || null,
                berlaku_sampai: b.berlaku_sampai || null,
                file: b.file as File,
            })))
            toast.push(<Notification type="success" title={`${hasil.length} dokumen berhasil disimpan`} />)
            router.push(halamanAsal)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(halamanAsal)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">Tambah Dokumen Armada</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Input beberapa dokumen sekaligus untuk satu unit armada</p>
                </div>
            </div>
            <Card>
                <form onSubmit={handleSubmit}>
                    <FormItem label="Armada" asterisk invalid={sudahSubmit && !idArmada} errorMessage="Armada wajib dipilih">
                        <Select placeholder="Pilih armada..."
                            options={armadaOptions}
                            value={armadaOptions.find(o => o.value === idArmada) ?? null}
                            onChange={opt => setIdArmada((opt as Option | null)?.value ?? '')} />
                    </FormItem>

                    {idArmada && dokumenAda.length > 0 && (
                        <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5 mb-4 text-sm text-blue-700 dark:text-blue-300">
                            <HiOutlineInformationCircle className="text-lg shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1.5">
                                <span>Dokumen yang sudah ada untuk unit ini. Untuk memperbarui dokumen yang habis masa berlaku, gunakan <strong>Perpanjang</strong>.</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {dokumenAda.map(d => (
                                        <Tooltip key={d.id_dokumen_armada} title="Perpanjang dokumen ini">
                                            <button type="button" onClick={() => router.push(ROUTES.DOKUMEN_ARMADA_PERPANJANG(d.id_dokumen_armada))}>
                                                <Tag className="bg-white text-blue-700 dark:bg-blue-500/20 dark:text-blue-200 hover:bg-blue-100">
                                                    {labelJenisDokumen(d.jenis_dokumen)}{d.berlaku_sampai ? ` · s/d ${dayjs(d.berlaku_sampai).format('DD MMM YYYY')}` : ''}
                                                </Tag>
                                            </button>
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Daftar Dokumen ({baris.length})</p>
                            <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                disabled={baris.length >= MAKS_BARIS} onClick={tambahBaris}>Tambah Dokumen</Button>
                        </div>
                        {baris.length === 0 ? (
                            <p className="text-gray-400 text-xs py-2">Belum ada dokumen. Klik Tambah Dokumen.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {baris.map((b, idx) => {
                                    const opsi = opsiJenisUntuk(idx)
                                    return (
                                        <div key={b.key} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Dokumen {idx + 1}</p>
                                                <Tooltip title="Hapus">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                                        onClick={() => hapusBaris(idx)}>
                                                        <HiOutlineTrash className="text-base" />
                                                    </span>
                                                </Tooltip>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-1">
                                                <FormItem label="Jenis Dokumen" asterisk invalid={sudahSubmit && !b.jenis_dokumen} errorMessage="Jenis dokumen wajib dipilih">
                                                    <Select isSearchable={false} placeholder="Pilih jenis..."
                                                        options={opsi}
                                                        value={opsi.find(o => o.value === b.jenis_dokumen) ?? null}
                                                        onChange={opt => ubahBaris(idx, { jenis_dokumen: (opt as Option | null)?.value ?? '' })} />
                                                </FormItem>
                                                <FormItem label="Nomor Dokumen">
                                                    <Input placeholder="Contoh: B 1234 XYZ" value={b.nomor}
                                                        onChange={e => ubahBaris(idx, { nomor: e.target.value })} />
                                                </FormItem>
                                                <FormItem label="Berlaku Sampai">
                                                    <DatePicker
                                                        value={b.berlaku_sampai ? new Date(b.berlaku_sampai) : null}
                                                        onChange={date => ubahBaris(idx, { berlaku_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' })} />
                                                </FormItem>
                                                <FormItem label="File Dokumen" asterisk invalid={sudahSubmit && !b.file} errorMessage="File dokumen wajib diunggah">
                                                    <UploadBerkas
                                                        file={b.file}
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        label="Pilih file"
                                                        hint="PDF/JPG/PNG · maksimal 5 MB"
                                                        onChange={f => {
                                                            if (f && ukuranFileTerlaluBesar(f)) {
                                                                toast.push(<Notification type="danger" title={pesanFileTerlaluBesar(f)} />)
                                                                return
                                                            }
                                                            ubahBaris(idx, { file: f })
                                                        }}
                                                    />
                                                </FormItem>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => router.push(halamanAsal)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving} disabled={baris.length === 0}>Simpan</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
