'use client'
import { useEffect, useMemo, useState } from 'react'
import { Button, Dialog, Notification, Spinner, Tooltip, Upload, toast } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiPlusCircle, HiOutlineTrash, HiOutlineDownload, HiOutlineUpload } from 'react-icons/hi'
import dayjs from 'dayjs'
import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { parseApiError } from '@/utils/error.util'
import { armadaService, Armada } from '@/services/armada.service'
import { supirService, Supir } from '@/services/supir.service'
import { proyekRuteService } from '@/services/proyekRute.service'
import { penugasanHarianService, AssignHarianGagal } from '@/services/penugasanHarian.service'

type Option = { value: string; label: string }
type BarisUnit = { id_armada: string; id_supir: string; id_rute: string }

// Menu dirender ke body supaya tidak terpotong container overflow tabel
const PORTAL_PROPS = {
    menuPortalTarget: typeof document !== 'undefined' ? document.body : undefined,
    styles: { menuPortal: (base: object) => ({ ...base, zIndex: 60 }) },
}
type GagalRow = AssignHarianGagal & { unit: string }

type Props = {
    idProyek: string
    tanggalMulai?: string | null
    tanggalSelesai?: string | null
    onSukses: () => void
}

export default function TambahPenugasanSection({ idProyek, tanggalMulai, tanggalSelesai, onSukses }: Props) {
    const [loading, setLoading]         = useState(false)
    const [armadaList, setArmadaList]   = useState<Armada[]>([])
    const [supirList, setSupirList]     = useState<Supir[]>([])
    const [ruteOptions, setRuteOptions] = useState<Option[]>([])
    const [rows, setRows]               = useState<BarisUnit[]>([{ id_armada: '', id_supir: '', id_rute: '' }])
    const [errorBaris, setErrorBaris]   = useState('')
    const [submitting, setSubmitting]   = useState(false)
    const [hasil, setHasil]             = useState<{ sukses: number; gagal: GagalRow[] } | null>(null)
    const [downloadingTemplate, setDownloadingTemplate] = useState(false)
    const [parsing, setParsing]         = useState(false)
    const [parseGagal, setParseGagal]   = useState<{ baris: number; alasan: string }[] | null>(null)

    useEffect(() => {
        setRows([{ id_armada: '', id_supir: '', id_rute: '' }])
        setErrorBaris('')
        setLoading(true)
        Promise.all([
            proyekRuteService.list(idProyek),
            armadaService.list(1, 100),
            supirService.list(1, 100, undefined, 'aktif'),
        ]).then(([ruteRows, armadaRes, supirRes]) => {
            const unik = new Map<string, Option>()
            ruteRows.forEach(r => {
                if (!unik.has(r.id_rute)) {
                    const jalur = (r.asal || r.tujuan) ? ` (${r.asal ?? '—'} → ${r.tujuan ?? '—'})` : ''
                    unik.set(r.id_rute, { value: r.id_rute, label: `${r.kode_rute ? r.kode_rute + ' — ' : ''}${r.nama_rute ?? 'Rute'}${jalur}` })
                }
            })
            const opsiRute = Array.from(unik.values())
            setRuteOptions(opsiRute)
            if (opsiRute.length === 1) {
                setRows([{ id_armada: '', id_supir: '', id_rute: opsiRute[0].value }])
            }
            setArmadaList((armadaRes.data ?? []).filter((a: Armada) => a.status !== 'tidak_aktif'))
            setSupirList(supirRes.data ?? [])
        }).catch(() => {
            toast.push(<Notification type="danger" title="Gagal memuat data unit/rute" />)
        }).finally(() => setLoading(false))
    }, [idProyek])

    const armadaOptions: Option[] = useMemo(
        () => armadaList.map(a => ({
            value: a.id_armada,
            label: `${a.nopol}${a.nama_jenis || a.merk ? ` — ${[a.nama_jenis, a.merk].filter(Boolean).join(' · ')}` : ''}`,
        })),
        [armadaList],
    )

    const supirOptions: Option[] = useMemo(
        () => supirList.map(s => ({ value: s.id_supir, label: s.armada_default ? `${s.nama} — ${s.armada_default}` : s.nama })),
        [supirList],
    )

    const updateRow = (index: number, patch: Partial<BarisUnit>) => {
        setRows(prev => prev.map((row, i) => {
            if (i !== index) return row
            const next = { ...row, ...patch }
            if (patch.id_armada && !row.id_supir) {
                const pemegang = supirList.find(s => s.id_armada_default === patch.id_armada)
                if (pemegang) next.id_supir = pemegang.id_supir
            }
            return next
        }))
        if (errorBaris) setErrorBaris('')
    }

    const tambahBaris = () => setRows(prev => [...prev, {
        id_armada: '', id_supir: '', id_rute: ruteOptions.length === 1 ? ruteOptions[0].value : '',
    }])
    const hapusBaris = (index: number) => setRows(prev => prev.filter((_, i) => i !== index))
    const hapusSemuaBaris = () => setRows([{ id_armada: '', id_supir: '', id_rute: ruteOptions.length === 1 ? ruteOptions[0].value : '' }])

    const unduhTemplate = async () => {
        setDownloadingTemplate(true)
        try {
            const res = await axios.get(API_ENDPOINTS.PENUGASAN_TEMPLATE_UNIT, { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = 'template-penugasan-unit.xlsx'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingTemplate(false)
        }
    }

    const uploadExcelUnit = async (files: File[]) => {
        const file = files[0]
        if (!file) return
        setParsing(true)
        try {
            const hasilParse = await penugasanHarianService.parseUnitExcel(file, idProyek)
            if (hasilParse.baris_valid.length > 0) {
                setRows(hasilParse.baris_valid.map(b => ({
                    id_armada: b.id_armada,
                    id_supir:  b.id_supir,
                    id_rute:   b.id_rute,
                })))
                setErrorBaris('')
            }
            toast.push(
                <Notification type={hasilParse.baris_gagal.length > 0 ? 'warning' : 'success'}
                    title={`${hasilParse.baris_valid.length} baris masuk, ${hasilParse.baris_gagal.length} gagal`} />,
            )
            if (hasilParse.baris_gagal.length > 0) setParseGagal(hasilParse.baris_gagal)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setParsing(false)
        }
    }

    const jumlahHari = tanggalMulai
        ? Math.max(1, dayjs(tanggalSelesai || tanggalMulai).diff(dayjs(tanggalMulai), 'day') + 1)
        : 0
    const barisTerisi = rows.filter(r => r.id_armada && r.id_supir && r.id_rute).length

    const validate = () => {
        if (!tanggalMulai) {
            setErrorBaris('Tanggal mulai proyek belum diisi — lengkapi dulu di informasi proyek di atas')
            return false
        }
        if (rows.length === 0) {
            setErrorBaris('Tambahkan minimal satu unit')
            return false
        }
        if (rows.some(r => !r.id_armada || !r.id_supir || !r.id_rute)) {
            setErrorBaris('Lengkapi armada, supir, dan rute di setiap baris')
            return false
        }
        const armadaDipakai = new Set<string>()
        const supirDipakai = new Set<string>()
        for (const r of rows) {
            if (armadaDipakai.has(r.id_armada)) {
                const nopol = armadaList.find(a => a.id_armada === r.id_armada)?.nopol ?? 'Unit'
                setErrorBaris(`${nopol} dipilih lebih dari satu baris`)
                return false
            }
            if (supirDipakai.has(r.id_supir)) {
                const nama = supirList.find(s => s.id_supir === r.id_supir)?.nama ?? 'Supir'
                setErrorBaris(`${nama} dipilih di lebih dari satu unit — satu supir hanya bisa membawa satu unit`)
                return false
            }
            armadaDipakai.add(r.id_armada)
            supirDipakai.add(r.id_supir)
        }
        setErrorBaris('')
        return true
    }

    const handleSubmit = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            return
        }
        setSubmitting(true)
        let totalSukses = 0
        const gagalRows: GagalRow[] = []
        for (const row of rows) {
            const nopol = armadaList.find(a => a.id_armada === row.id_armada)?.nopol ?? '—'
            try {
                const res = await penugasanHarianService.assign({
                    tanggal:        tanggalMulai as string,
                    tanggal_sampai: tanggalSelesai || null,
                    id_armada:      row.id_armada,
                    id_supir:       row.id_supir,
                    id_proyek:      idProyek,
                    id_rute:        row.id_rute,
                })
                totalSukses += res.sukses
                res.gagal.forEach(g => gagalRows.push({ ...g, unit: nopol }))
            } catch (err) {
                gagalRows.push({ unit: nopol, tanggal: '—', alasan: parseApiError(err) })
            }
        }
        setSubmitting(false)
        if (totalSukses > 0) onSukses()
        if (gagalRows.length === 0) {
            toast.push(<Notification type="success" title={`${totalSukses} penugasan dibuat untuk ${rows.length} unit`} />)
            hapusSemuaBaris()
        } else {
            setHasil({ sukses: totalSukses, gagal: gagalRows })
        }
    }

    const periodeLabel = tanggalMulai
        ? `${dayjs(tanggalMulai).format('DD MMM YYYY')} — ${tanggalSelesai ? dayjs(tanggalSelesai).format('DD MMM YYYY') : dayjs(tanggalMulai).format('DD MMM YYYY')}`
        : null

    return (
        <div className="border border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-4 mt-4 mb-2">
            {loading ? (
                <div className="flex justify-center py-8"><Spinner size={28} /></div>
            ) : (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Unit Ditugaskan</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {periodeLabel ? (
                                    <>
                                        Periode mengikuti tanggal proyek: <span className="font-semibold text-gray-500 dark:text-gray-300">{periodeLabel}</span>
                                        {barisTerisi > 0 && <> · {jumlahHari} hari × {barisTerisi} unit = <span className="font-semibold">{jumlahHari * barisTerisi} penugasan</span></>}
                                    </>
                                ) : (
                                    <span className="text-amber-600 dark:text-amber-400">Tanggal mulai proyek belum diisi — lengkapi dulu di informasi proyek</span>
                                )}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Tooltip title="Unduh Template">
                                <Button type="button" size="sm" variant="default" icon={<HiOutlineDownload />}
                                    loading={downloadingTemplate} onClick={unduhTemplate} />
                            </Tooltip>
                            <Upload accept=".xlsx" showList={false} uploadLimit={1} onChange={uploadExcelUnit}>
                                <Tooltip title="Upload Excel (Timpa)">
                                    <Button type="button" size="sm" variant="default" icon={<HiOutlineUpload />} loading={parsing} />
                                </Tooltip>
                            </Upload>
                            <Button type="button" size="sm" variant="default"
                                className="text-red-500 border-red-200 hover:border-red-300 dark:border-red-500/40"
                                icon={<HiOutlineTrash />} onClick={hapusSemuaBaris}>
                                Hapus Semua
                            </Button>
                            <Tooltip title="Tambah Unit">
                                <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />} onClick={tambahBaris} />
                            </Tooltip>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2 pr-3 w-10 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">No</th>
                                    <th className="py-2 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Armada <span className="text-red-500">*</span></th>
                                    <th className="py-2 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Supir <span className="text-red-500">*</span></th>
                                    <th className="py-2 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Rute <span className="text-red-500">*</span></th>
                                    <th className="py-2 w-10" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {rows.map((row, i) => (
                                    <tr key={i}>
                                        <td className="py-2.5 pr-3 text-gray-500">{i + 1}</td>
                                        <td className="py-2.5 pr-4 min-w-[210px]">
                                            <Select<Option>
                                                {...PORTAL_PROPS}
                                                size="sm"
                                                isSearchable
                                                placeholder="Pilih armada..."
                                                options={armadaOptions.filter(o => o.value === row.id_armada || !rows.some(r => r.id_armada === o.value))}
                                                value={armadaOptions.find(o => o.value === row.id_armada) ?? null}
                                                onChange={opt => updateRow(i, { id_armada: opt?.value ?? '' })}
                                            />
                                        </td>
                                        <td className="py-2.5 pr-4 min-w-[210px]">
                                            <Select<Option>
                                                {...PORTAL_PROPS}
                                                size="sm"
                                                isSearchable
                                                placeholder="Pilih supir..."
                                                options={supirOptions.filter(o => o.value === row.id_supir || !rows.some(r => r.id_supir === o.value))}
                                                value={supirOptions.find(o => o.value === row.id_supir) ?? null}
                                                onChange={opt => updateRow(i, { id_supir: opt?.value ?? '' })}
                                            />
                                        </td>
                                        <td className="py-2.5 pr-4 min-w-[210px]">
                                            <Select<Option>
                                                {...PORTAL_PROPS}
                                                size="sm"
                                                isSearchable
                                                placeholder={ruteOptions.length === 0 ? 'Belum ada rute proyek' : 'Pilih rute...'}
                                                options={ruteOptions}
                                                value={ruteOptions.find(o => o.value === row.id_rute) ?? null}
                                                onChange={opt => updateRow(i, { id_rute: opt?.value ?? '' })}
                                            />
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <Tooltip title="Hapus baris">
                                                <span
                                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                    onClick={() => hapusBaris(i)}
                                                >
                                                    <HiOutlineTrash className="text-base" />
                                                </span>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {errorBaris && <p className="text-red-500 text-xs mt-1.5">{errorBaris}</p>}
                    <p className="text-xs text-gray-400 mt-3">
                        Penugasan dibuat otomatis untuk setiap tanggal dalam periode proyek per unit. Uang jalan dihitung dari rate card dan diajukan sebagai satu pengajuan per supir.
                    </p>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" size="sm" variant="solid" loading={submitting} onClick={handleSubmit}>
                            Buat Penugasan
                        </Button>
                    </div>

                    <Dialog isOpen={!!parseGagal} onRequestClose={() => setParseGagal(null)} onClose={() => setParseGagal(null)} width={560}>
                        <h5 className="text-base font-semibold mb-1">Baris Gagal Diproses</h5>
                        <p className="text-xs text-gray-400 mb-4">Baris berikut tidak masuk ke tabel — perbaiki file lalu upload ulang, atau isi manual.</p>
                        <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                            <div className="max-h-72 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <th className="py-2.5 pl-3 pr-4 w-20 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Baris</th>
                                            <th className="py-2.5 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Alasan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {(parseGagal ?? []).map((g, i) => (
                                            <tr key={i}>
                                                <td className="py-2.5 pl-3 pr-4 text-gray-600 dark:text-gray-400">{g.baris}</td>
                                                <td className="py-2.5 pr-3 text-red-500 text-xs">{g.alasan}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex justify-end mt-5">
                            <Button variant="solid" onClick={() => setParseGagal(null)}>Tutup</Button>
                        </div>
                    </Dialog>

                    <Dialog isOpen={!!hasil} onRequestClose={() => setHasil(null)} onClose={() => setHasil(null)} width={640}>
                        <h5 className="text-base font-semibold mb-1">Hasil Penugasan</h5>
                        <p className="text-xs text-gray-400 mb-4">
                            {hasil?.sukses ?? 0} penugasan berhasil, {hasil?.gagal.length ?? 0} dilewati.
                        </p>
                        <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                            <div className="max-h-72 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <th className="py-2.5 pl-3 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Unit</th>
                                            <th className="py-2.5 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Tanggal</th>
                                            <th className="py-2.5 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Alasan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {(hasil?.gagal ?? []).map((g, i) => (
                                            <tr key={i}>
                                                <td className="py-2.5 pl-3 pr-4 font-semibold text-gray-800 dark:text-gray-200">{g.unit}</td>
                                                <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                    {g.tanggal !== '—' ? dayjs(g.tanggal).format('DD MMM YYYY') : '—'}
                                                </td>
                                                <td className="py-2.5 pr-3 text-red-500 text-xs">{g.alasan}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex justify-end mt-5">
                            <Button variant="solid" onClick={() => setHasil(null)}>Tutup</Button>
                        </div>
                    </Dialog>
                </>
            )}
        </div>
    )
}
