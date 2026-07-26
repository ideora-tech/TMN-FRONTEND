'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Input, Tag, Button, DatePicker, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiOutlineSearch, HiOutlineX, HiOutlineCheckCircle } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { absensiService, AbsensiHarianRow, StatusAbsensi } from '@/services/absensi.service'

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

export default function InputHarianTab() {
    const [tanggal, setTanggal] = useState(dayjs().format('YYYY-MM-DD'))
    const [rows, setRows]       = useState<AbsensiHarianRow[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving]   = useState(false)
    const [cari, setCari]       = useState('')

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

    const tandaiSemuaHadir = () => {
        setRows(prev => prev.map(r => (r.sedang_cuti ? r : { ...r, status: r.status ?? 'hadir' })))
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
                    <Button variant="default" size="sm" icon={<HiOutlineCheckCircle />} className="shrink-0"
                        onClick={tandaiSemuaHadir} disabled={loading}>
                        Tandai Semua Hadir
                    </Button>
                    <Button variant="solid" size="sm" className="shrink-0" loading={saving}
                        onClick={handleSimpan} disabled={loading || rows.length === 0}>
                        Simpan
                    </Button>
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
                                                        onChange={e => ubahRow(r.id_karyawan, { jam_masuk: e.target.value })} />
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <Input type="time" size="sm" value={r.jam_pulang ?? ''}
                                                        onChange={e => ubahRow(r.id_karyawan, { jam_pulang: e.target.value })} />
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
        </div>
    )
}
