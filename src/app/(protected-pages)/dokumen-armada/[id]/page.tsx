'use client'
import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineRefresh, HiOutlineExclamation, HiPlusCircle, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { dokumenArmadaService, DokumenArmadaDetail, DokumenArmada } from '@/services/dokumenArmada.service'
import {
    JENIS_DOKUMEN_OPTIONS, JENIS_BOLEH_GANDA, getExpiryInfo, labelJenisDokumen,
    ukuranFileTerlaluBesar, pesanFileTerlaluBesar, type Option,
} from '../dokumenArmada.shared'

type FormState = { jenis_dokumen: string; nomor: string; berlaku_sampai: string }
type OpsiJenis = Option & { isDisabled?: boolean }
type Baris = { key: number; jenis_dokumen: string; nomor: string; berlaku_sampai: string; file: File | null }

const MAKS_BARIS = 20
let urutanBaris = 0
const barisKosong = (): Baris => ({ key: ++urutanBaris, jenis_dokumen: '', nomor: '', berlaku_sampai: '', file: null })

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide'

const toFormState = (d: DokumenArmadaDetail): FormState => ({
    jenis_dokumen: d.jenis_dokumen,
    nomor: d.nomor ?? '',
    berlaku_sampai: d.berlaku_sampai ?? '',
})

function Info({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</p>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">{children}</div>
        </div>
    )
}

export default function DokumenArmadaDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData] = useState<DokumenArmadaDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState<FormState>({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' })
    const [file, setFile] = useState<File | null>(null)
    const [saving, setSaving] = useState(false)
    const [dokumenUnit, setDokumenUnit] = useState<DokumenArmada[]>([])
    const [barisBaru, setBarisBaru] = useState<Baris[]>([])
    const [sudahSubmit, setSudahSubmit] = useState(false)

    const muat = useCallback(async () => {
        setLoading(true)
        try {
            const d = await dokumenArmadaService.get(id)
            setData(d)
            setForm(toFormState(d))
            setNotFound(false)
        } catch {
            setNotFound(true)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { muat() }, [muat])

    useEffect(() => {
        if (!data) return
        dokumenArmadaService.list(data.id_armada).then(setDokumenUnit).catch(() => setDokumenUnit([]))
    }, [data])

    const bukaEdit = () => { setFile(null); setBarisBaru([]); setSudahSubmit(false); setEditing(true) }
    const batalEdit = () => {
        setEditing(false)
        setFile(null)
        setBarisBaru([])
        setSudahSubmit(false)
        if (data) setForm(toFormState(data))
    }

    const dokumenLain = dokumenUnit.filter(d => d.aktif && d.id_dokumen_armada !== id)

    const jenisDipakaiLain = new Set(dokumenUnit
        .filter(d => d.id_dokumen_armada !== id && !JENIS_BOLEH_GANDA.includes(d.jenis_dokumen))
        .map(d => d.jenis_dokumen))
    const jenisDiBarisBaru = new Set(barisBaru.map(b => b.jenis_dokumen).filter(j => j && !JENIS_BOLEH_GANDA.includes(j)))

    const opsiJenis: OpsiJenis[] = JENIS_DOKUMEN_OPTIONS
        .filter(o => o.value === form.jenis_dokumen || !jenisDiBarisBaru.has(o.value))
        .map(o => jenisDipakaiLain.has(o.value)
            ? { ...o, label: `${o.label} — sudah ada`, isDisabled: true }
            : o)

    const opsiJenisBaris = (idx: number): OpsiJenis[] =>
        JENIS_DOKUMEN_OPTIONS
            .filter(o => JENIS_BOLEH_GANDA.includes(o.value) || o.value === barisBaru[idx].jenis_dokumen
                || (o.value !== form.jenis_dokumen && !barisBaru.some((b, i) => i !== idx && b.jenis_dokumen === o.value)))
            .map(o => jenisDipakaiLain.has(o.value) && !JENIS_BOLEH_GANDA.includes(o.value)
                ? { ...o, label: `${o.label} — sudah ada, gunakan Perpanjang`, isDisabled: true }
                : o)

    const ubahBaris = (idx: number, patch: Partial<Baris>) =>
        setBarisBaru(prev => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
    const tambahBaris = () => setBarisBaru(prev => (prev.length >= MAKS_BARIS ? prev : [...prev, barisKosong()]))
    const hapusBaris = (idx: number) => setBarisBaru(prev => prev.filter((_, i) => i !== idx))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSudahSubmit(true)
        if (!data || !form.jenis_dokumen) return
        if (barisBaru.some(b => !b.jenis_dokumen || !b.file)) {
            toast.push(<Notification type="danger" title="Lengkapi jenis dokumen dan file tiap dokumen tambahan" />)
            return
        }
        setSaving(true)
        try {
            await dokumenArmadaService.update(data.id_armada, data.id_dokumen_armada, {
                jenis_dokumen: form.jenis_dokumen,
                nomor: form.nomor.trim() || null,
                berlaku_sampai: form.berlaku_sampai || null,
            }, file)
            if (barisBaru.length > 0) {
                try {
                    await dokumenArmadaService.createBatch(data.id_armada, barisBaru.map(b => ({
                        jenis_dokumen: b.jenis_dokumen,
                        nomor: b.nomor.trim() || null,
                        berlaku_sampai: b.berlaku_sampai || null,
                        file: b.file as File,
                    })))
                } catch (err) {
                    toast.push(<Notification type="warning"
                        title={`Dokumen utama tersimpan, tapi dokumen tambahan gagal: ${parseApiError(err)}`} />)
                    await muat()
                    return
                }
            }
            toast.push(<Notification type="success" title={barisBaru.length > 0
                ? `Dokumen diperbarui dan ${barisBaru.length} dokumen baru ditambahkan`
                : 'Dokumen berhasil diperbarui'} />)
            setEditing(false)
            setFile(null)
            setBarisBaru([])
            setSudahSubmit(false)
            await muat()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading && !data) return <div className="p-6 text-gray-500">Memuat...</div>
    if (notFound || !data) return <div className="p-6 text-red-500">Dokumen armada tidak ditemukan.</div>

    const expiry = getExpiryInfo(data.berlaku_sampai)
    const unit = data.armada_merk ? `${data.armada_nopol ?? '—'} · ${data.armada_merk}` : (data.armada_nopol ?? '—')

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.DOKUMEN_ARMADA)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">{editing ? 'Ubah Dokumen Armada' : 'Detail Dokumen Armada'}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Dokumen kendaraan beserta riwayat perpanjangannya</p>
                </div>
            </div>

            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{labelJenisDokumen(data.jenis_dokumen)}</p>
                                    {data.aktif
                                        ? <Tag className="text-xs font-semibold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">Berlaku</Tag>
                                        : <Tag className="text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">Riwayat</Tag>}
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">{unit}</p>
                            </div>
                            {data.aktif && (
                                <div className="flex items-center gap-2">
                                    <Tooltip title="Perpanjang">
                                        <Button size="sm" variant="default" icon={<HiOutlineRefresh />}
                                            onClick={() => router.push(ROUTES.DOKUMEN_ARMADA_PERPANJANG(data.id_dokumen_armada))} />
                                    </Tooltip>
                                    <Tooltip title="Edit">
                                        <Button size="sm" variant="solid" icon={<HiOutlinePencilAlt />} onClick={bukaEdit} />
                                    </Tooltip>
                                </div>
                            )}
                        </div>

                        {!data.aktif && (
                            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 mt-4 text-sm text-amber-700 dark:text-amber-300">
                                <HiOutlineExclamation className="text-lg shrink-0 mt-0.5" />
                                <span>
                                    Dokumen ini sudah diperpanjang dan disimpan sebagai riwayat.
                                    {data.id_dokumen_pengganti && (
                                        <> <button type="button" className="font-semibold underline"
                                            onClick={() => router.push(ROUTES.DOKUMEN_ARMADA_DETAIL(data.id_dokumen_pengganti as string))}>
                                            Lihat dokumen yang berlaku
                                        </button></>
                                    )}
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 mt-5">
                            <Info label="Armada">{unit}</Info>
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
                                    ? <a href={data.url_file} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Lihat file</a>
                                    : '—'}
                            </Info>
                            <Info label="Dicatat">{dayjs(data.dibuat_pada).format('DD MMM YYYY HH:mm')}</Info>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                                Riwayat Dokumen ({data.riwayat.length})
                            </p>
                            {data.riwayat.length === 0 ? (
                                <p className="text-gray-400 text-sm">Belum ada riwayat. Setiap kali dokumen diperpanjang, dokumen lama tersimpan di sini.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                                <th className={TH_CLASS}>No</th>
                                                <th className={TH_CLASS}>Nomor Dokumen</th>
                                                <th className={TH_CLASS}>Berlaku Sampai</th>
                                                <th className={TH_CLASS}>Dicatat</th>
                                                <th className={TH_CLASS}>File</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {data.riwayat.map((r, idx) => (
                                                <tr key={r.id_dokumen_armada}>
                                                    <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                                                    <td className="py-2.5 px-3 font-mono text-xs text-gray-800 dark:text-gray-200">{r.nomor ?? '—'}</td>
                                                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{r.berlaku_sampai ? dayjs(r.berlaku_sampai).format('DD MMM YYYY') : '—'}</td>
                                                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{dayjs(r.dibuat_pada).format('DD MMM YYYY')}</td>
                                                    <td className="py-2.5 px-3">
                                                        {r.url_file
                                                            ? <a href={r.url_file} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Lihat</a>
                                                            : <span className="text-gray-400 text-xs">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                                Dokumen Lain Unit Ini ({dokumenLain.length})
                            </p>
                            {dokumenLain.length === 0 ? (
                                <p className="text-gray-400 text-sm">Belum ada dokumen lain untuk unit ini.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                                <th className={TH_CLASS}>No</th>
                                                <th className={TH_CLASS}>Jenis Dokumen</th>
                                                <th className={TH_CLASS}>Nomor Dokumen</th>
                                                <th className={TH_CLASS}>Berlaku Sampai</th>
                                                <th className={TH_CLASS}>File</th>
                                                <th className={TH_CLASS} />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {dokumenLain.map((d, idx) => {
                                                const exp = getExpiryInfo(d.berlaku_sampai)
                                                return (
                                                    <tr key={d.id_dokumen_armada}>
                                                        <td className="py-2.5 px-3 text-gray-500">{idx + 1}</td>
                                                        <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200">{labelJenisDokumen(d.jenis_dokumen)}</td>
                                                        <td className="py-2.5 px-3 font-mono text-xs text-gray-800 dark:text-gray-200">{d.nomor ?? '—'}</td>
                                                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                                                            <div className="flex items-center gap-2">
                                                                <span>{d.berlaku_sampai ? dayjs(d.berlaku_sampai).format('DD MMM YYYY') : '—'}</span>
                                                                {d.berlaku_sampai && <Tag className={`text-xs font-semibold ${exp.className}`}>{exp.label}</Tag>}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {d.url_file
                                                                ? <a href={d.url_file} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Lihat</a>
                                                                : <span className="text-gray-400 text-xs">—</span>}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <Tooltip title="Detail">
                                                                <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                                    onClick={() => router.push(ROUTES.DOKUMEN_ARMADA_DETAIL(d.id_dokumen_armada))}>
                                                                    <HiOutlineEye className="text-lg" />
                                                                </span>
                                                            </Tooltip>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="default" icon={<HiArrowLeft />}
                                onClick={() => router.push(ROUTES.DOKUMEN_ARMADA)}>Batal</Button>
                        </div>
                    </>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <FormItem label="Armada">
                            <Input value={unit} disabled />
                        </FormItem>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                    Daftar Dokumen ({1 + barisBaru.length})
                                </p>
                                <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                    disabled={barisBaru.length >= MAKS_BARIS} onClick={tambahBaris}>Tambah Dokumen</Button>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Dokumen 1</p>
                                        <Tag className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">Sedang diubah</Tag>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-1">
                                        <FormItem label="Jenis Dokumen" asterisk invalid={!form.jenis_dokumen} errorMessage="Jenis dokumen wajib dipilih">
                                            <Select isSearchable={false} placeholder="Pilih jenis..."
                                                options={opsiJenis}
                                                value={opsiJenis.find(o => o.value === form.jenis_dokumen) ?? null}
                                                onChange={opt => setForm(p => ({ ...p, jenis_dokumen: (opt as Option | null)?.value ?? '' }))} />
                                        </FormItem>
                                        <FormItem label="Nomor Dokumen">
                                            <Input placeholder="Contoh: B 1234 XYZ" value={form.nomor}
                                                onChange={e => setForm(p => ({ ...p, nomor: e.target.value }))} />
                                        </FormItem>
                                        <FormItem label="Berlaku Sampai">
                                            <DatePicker
                                                value={form.berlaku_sampai ? new Date(form.berlaku_sampai) : null}
                                                onChange={date => setForm(p => ({ ...p, berlaku_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                                        </FormItem>
                                        <FormItem label="File Dokumen">
                                            <UploadBerkas
                                                file={file}
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                label="Ganti file (opsional)"
                                                hint="Untuk koreksi saja — masa berlaku baru pakai Perpanjang"
                                                existingUrl={data.url_file}
                                                existingLabel="File saat ini"
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
                                </div>

                                {barisBaru.map((b, idx) => {
                                    const opsi = opsiJenisBaris(idx)
                                    return (
                                        <div key={b.key} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Dokumen {idx + 2}</p>
                                                    <Tag className="text-xs bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">Baru</Tag>
                                                </div>
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
                        </div>

                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={batalEdit}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving} disabled={!form.jenis_dokumen}>Simpan Perubahan</Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    )
}
