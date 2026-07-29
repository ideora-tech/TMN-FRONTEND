'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Input, Tag, Button, DatePicker, Dialog, FormItem, Tooltip, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiOutlineSearch, HiOutlineX, HiOutlineXCircle, HiOutlineCog, HiOutlineClock } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { absensiService, AbsensiHarianRow, StatusAbsensi, PengaturanAbsensi } from '@/services/absensi.service'

type Option = { value: string; label: string }

const STATUS_OPTIONS: Option[] = [
    { value: 'hadir',     label: 'Hadir' },
    { value: 'terlambat', label: 'Terlambat' },
    { value: 'izin',      label: 'Izin' },
    { value: 'sakit',     label: 'Sakit' },
    { value: 'alpha',     label: 'Alpha' },
]

const STATUS_TAG: Record<string, string> = {
    hadir:     'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    terlambat: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100',
    izin:      'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    sakit:     'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    alpha:     'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

const jamSingkat = (jam: string | null): string => (jam ? jam.substring(0, 5) : '')

const keMenit = (jam: string): number => {
    const [h, m] = jam.split(':').map(Number)
    return h * 60 + m
}

const PENGATURAN_DEFAULT: PengaturanAbsensi = { jam_masuk: '08:00', jam_pulang: '17:00', toleransi_terlambat_menit: 15 }

export default function InputHarianTab() {
    const [tanggal, setTanggal] = useState(dayjs().format('YYYY-MM-DD'))
    const [rows, setRows]       = useState<AbsensiHarianRow[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving]   = useState(false)
    const [cari, setCari]       = useState('')

    const [pengaturan, setPengaturan]         = useState<PengaturanAbsensi>(PENGATURAN_DEFAULT)
    const [pengaturanOpen, setPengaturanOpen] = useState(false)
    const [pengaturanForm, setPengaturanForm] = useState<PengaturanAbsensi>(PENGATURAN_DEFAULT)
    const [savingPengaturan, setSavingPengaturan] = useState(false)

    const [jamMasukMassal, setJamMasukMassal]   = useState('')
    const [jamPulangMassal, setJamPulangMassal] = useState('')

    useEffect(() => {
        absensiService.getPengaturan().then(p => {
            setPengaturan(p)
            setJamMasukMassal(p.jam_masuk)
            setJamPulangMassal(p.jam_pulang)
        }).catch(() => {})
    }, [])

    const statusDariJamMasuk = useCallback((jam: string): StatusAbsensi => {
        const batas = keMenit(pengaturan.jam_masuk) + pengaturan.toleransi_terlambat_menit
        return keMenit(jam) > batas ? 'terlambat' : 'hadir'
    }, [pengaturan])

    const menitLembur = useCallback((jamPulang: string | null): number => {
        if (!jamPulang) return 0
        const selisih = keMenit(jamPulang) - keMenit(pengaturan.jam_pulang)
        return selisih > 0 ? selisih : 0
    }, [pengaturan])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const data = await absensiService.harian(tanggal)
            setRows(data.map(r => ({ ...r, jam_masuk: jamSingkat(r.jam_masuk), jam_pulang: jamSingkat(r.jam_pulang) })))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [tanggal])

    useEffect(() => { fetchData() }, [fetchData])

    const ubahRow = (idKaryawan: string, patch: Partial<AbsensiHarianRow>) => {
        setRows(prev => prev.map(r => (r.id_karyawan === idKaryawan ? { ...r, ...patch } : r)))
    }

    const batalkanSemuaHadir = () => {
        setRows(prev => prev.map(r => (r.status === 'hadir' ? { ...r, status: null, jam_masuk: null, jam_pulang: null } : r)))
    }

    const adaYangHadir = rows.some(r => r.status === 'hadir')

    const terapkanJamKeSemua = () => {
        if (!jamMasukMassal && !jamPulangMassal) return
        setRows(prev => prev.map(r => {
            if (r.sedang_cuti) return r
            if (r.status && !['hadir', 'terlambat'].includes(r.status)) return r
            const jamMasukBaru = jamMasukMassal || r.jam_masuk
            return {
                ...r,
                jam_masuk: jamMasukMassal || r.jam_masuk,
                jam_pulang: jamPulangMassal || r.jam_pulang,
                status: jamMasukBaru ? statusDariJamMasuk(jamMasukBaru) : (r.status ?? 'hadir'),
            }
        }))
        toast.push(<Notification type="info" title="Jam diterapkan — status hadir/terlambat menyesuaikan otomatis. Jangan lupa Simpan." />)
    }

    const ubahJamMasuk = (idKaryawan: string, jam: string) => {
        setRows(prev => prev.map(r => {
            if (r.id_karyawan !== idKaryawan) return r
            const statusBaru = jam && (!r.status || ['hadir', 'terlambat'].includes(r.status))
                ? statusDariJamMasuk(jam)
                : r.status
            return { ...r, jam_masuk: jam, status: statusBaru }
        }))
    }

    const simpanPengaturan = async () => {
        setSavingPengaturan(true)
        try {
            const hasil = await absensiService.simpanPengaturan(pengaturanForm)
            setPengaturan(hasil)
            setJamMasukMassal(hasil.jam_masuk)
            setJamPulangMassal(hasil.jam_pulang)
            setPengaturanOpen(false)
            toast.push(<Notification type="success" title="Pengaturan jam kerja tersimpan" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingPengaturan(false)
        }
    }

    const handleSimpan = async () => {
        setSaving(true)
        try {
            const entries = rows
                .filter(r => !r.sedang_cuti)
                .map(r => ({
                    id_karyawan: r.id_karyawan,
                    status: r.status,
                    jam_masuk: r.jam_masuk || null,
                    jam_pulang: r.jam_pulang || null,
                    keterangan: r.keterangan || null,
                }))
            const hasil = await absensiService.simpanHarian(tanggal, entries)
            toast.push(<Notification type="success" title={`Absensi tersimpan (${hasil.tersimpan} karyawan)`} />)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const tampil = rows.filter(r =>
        !cari || r.nama.toLowerCase().includes(cari.toLowerCase()) || r.nik.toLowerCase().includes(cari.toLowerCase())
    )

    const terisi = rows.filter(r => r.sedang_cuti || r.status !== null).length

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="w-44 shrink-0">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={dayjs(tanggal).toDate()}
                            onChange={date => { if (date) setTanggal(dayjs(date).format('YYYY-MM-DD')) }} />
                    </div>
                    <Input
                        className="flex-1 min-w-52"
                        placeholder="Cari nama atau NIK..."
                        suffix={cari
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => setCari('')} />
                            : <HiOutlineSearch className="text-gray-400 text-lg" />}
                        value={cari}
                        onChange={(e) => setCari(e.target.value)}
                    />
                    <span className="text-xs text-gray-400 shrink-0">{terisi}/{rows.length} terisi</span>
                    <Button variant="solid" size="sm" className="shrink-0" loading={saving}
                        onClick={handleSimpan} disabled={loading || rows.length === 0}>
                        Simpan
                    </Button>
                    <Tooltip title={`Pengaturan jam kerja (masuk ${pengaturan.jam_masuk}, pulang ${pengaturan.jam_pulang}, toleransi ${pengaturan.toleransi_terlambat_menit} menit)`}>
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors shrink-0"
                            onClick={() => { setPengaturanForm(pengaturan); setPengaturanOpen(true) }}>
                            <HiOutlineCog className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
                <div className="flex flex-wrap items-center gap-3 px-4 pb-3 -mt-1">
                    <span className="text-xs text-gray-500 shrink-0 inline-flex items-center gap-1">
                        <HiOutlineClock className="text-sm" /> Isi jam serentak:
                    </span>
                    <div className="w-32 shrink-0">
                        <Input type="time" size="sm" value={jamMasukMassal}
                            onChange={e => setJamMasukMassal(e.target.value)} />
                    </div>
                    <span className="text-xs text-gray-400">s/d</span>
                    <div className="w-32 shrink-0">
                        <Input type="time" size="sm" value={jamPulangMassal}
                            onChange={e => setJamPulangMassal(e.target.value)} />
                    </div>
                    <Button variant="default" size="sm" className="shrink-0"
                        onClick={terapkanJamKeSemua} disabled={loading || rows.length === 0}>
                        Terapkan ke Semua
                    </Button>
                    <Button variant="default" size="sm" icon={<HiOutlineXCircle />} className="shrink-0 text-red-500"
                        onClick={batalkanSemuaHadir} disabled={loading || !adaYangHadir}>
                        Batalkan Semua Hadir
                    </Button>
                    <span className="text-xs text-gray-400">
                        Masuk lewat {pengaturan.jam_masuk} (+{pengaturan.toleransi_terlambat_menit}m) otomatis Terlambat · pulang lewat {pengaturan.jam_pulang} dihitung lembur
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12"><Spinner size={36} /></div>
                ) : tampil.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Tidak ada karyawan aktif.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Karyawan</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide w-44">Status</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide w-32">Jam Masuk</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide w-32">Jam Pulang</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {tampil.map(r => (
                                    <tr key={r.id_karyawan}>
                                        <td className="py-2.5 px-4">
                                            <p className="font-medium">{r.nama}</p>
                                            <p className="text-xs text-gray-400 font-mono">{r.nik}</p>
                                        </td>
                                        {r.sedang_cuti ? (
                                            <td className="py-2.5 px-3" colSpan={4}>
                                                <Tag className="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100">
                                                    Cuti (otomatis dari pengajuan disetujui)
                                                </Tag>
                                            </td>
                                        ) : (
                                            <>
                                                <td className="py-2.5 px-3">
                                                    <Select<Option> isClearable isSearchable={false} size="sm"
                                                        placeholder="Belum tercatat"
                                                        options={STATUS_OPTIONS}
                                                        value={STATUS_OPTIONS.find(o => o.value === r.status) ?? null}
                                                        onChange={opt => ubahRow(r.id_karyawan, { status: ((opt as Option | null)?.value as StatusAbsensi | undefined) ?? null })} />
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <Input type="time" size="sm" value={r.jam_masuk ?? ''}
                                                        onChange={e => ubahJamMasuk(r.id_karyawan, e.target.value)} />
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <Input type="time" size="sm" value={r.jam_pulang ?? ''}
                                                        onChange={e => ubahRow(r.id_karyawan, { jam_pulang: e.target.value })} />
                                                    {menitLembur(r.jam_pulang) > 0 && (
                                                        <p className="text-xs text-amber-600 mt-0.5">+{menitLembur(r.jam_pulang)}m lembur</p>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <Input size="sm" placeholder="Keterangan (opsional)" value={r.keterangan ?? ''}
                                                        onChange={e => ubahRow(r.id_karyawan, { keterangan: e.target.value })} />
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {rows.some(r => r.status) && (
                <div className="flex flex-wrap gap-2 items-center text-xs text-gray-500">
                    <span>Ringkasan:</span>
                    {STATUS_OPTIONS.map(s => {
                        const n = rows.filter(r => r.status === s.value).length
                        if (n === 0) return null
                        return <Tag key={s.value} className={STATUS_TAG[s.value]}>{s.label}: {n}</Tag>
                    })}
                    {rows.some(r => r.sedang_cuti) && (
                        <Tag className="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100">
                            Cuti: {rows.filter(r => r.sedang_cuti).length}
                        </Tag>
                    )}
                </div>
            )}

            {/* Dialog Pengaturan Jam Kerja */}
            <Dialog isOpen={pengaturanOpen} onRequestClose={() => setPengaturanOpen(false)} onClose={() => setPengaturanOpen(false)} width={420}>
                <h5 className="font-bold mb-1">Pengaturan Jam Kerja</h5>
                <p className="text-xs text-gray-400 mb-4">
                    Dipakai untuk deteksi Terlambat otomatis dan perhitungan lembur di rekap bulanan.
                    Upah lembur dihitung formula pemerintah: gaji pokok × 1/173 per jam — jam pertama ×1,5, jam berikutnya ×2.
                </p>
                <form onSubmit={e => { e.preventDefault(); simpanPengaturan() }}>
                    <FormItem label="Jam Masuk Standar" asterisk>
                        <Input type="time" value={pengaturanForm.jam_masuk}
                            onChange={e => setPengaturanForm(p => ({ ...p, jam_masuk: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Jam Pulang Standar" asterisk
                        extra={<span className="text-xs text-gray-400">Pulang setelah jam ini dihitung sebagai lembur</span>}>
                        <Input type="time" value={pengaturanForm.jam_pulang}
                            onChange={e => setPengaturanForm(p => ({ ...p, jam_pulang: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Toleransi Terlambat (menit)" asterisk
                        extra={<span className="text-xs text-gray-400">Masuk melewati jam masuk + toleransi otomatis berstatus Terlambat</span>}>
                        <Input type="number" min={0} max={120} value={pengaturanForm.toleransi_terlambat_menit}
                            onChange={e => setPengaturanForm(p => ({ ...p, toleransi_terlambat_menit: Number(e.target.value) }))} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setPengaturanOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={savingPengaturan}
                            disabled={!pengaturanForm.jam_masuk || !pengaturanForm.jam_pulang}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    )
}
