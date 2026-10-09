'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, Button, FormItem, Input, Select, Dialog, Tooltip, Tag, toast, Notification } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import { HiOutlinePencilAlt, HiPlusCircle } from 'react-icons/hi'
import dayjs from 'dayjs'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { karyawanService, Karyawan, RiwayatJabatan, JenisPerubahanJabatan } from '@/services/karyawan.service'
import { Jabatan } from '@/services/jabatan.service'

type OpsiJenis = { value: JenisPerubahanJabatan; label: string }
type OpsiTeks = { value: string; label: string }

const JENIS_OPTIONS: OpsiJenis[] = [
    { value: 'promosi',     label: 'Promosi — naik jabatan' },
    { value: 'mutasi',      label: 'Mutasi — pindah posisi setingkat' },
    { value: 'demosi',      label: 'Demosi — turun jabatan' },
    { value: 'penyesuaian', label: 'Penyesuaian — koreksi data atau perubahan struktur' },
]

const JENIS_LABEL: Record<JenisPerubahanJabatan, string> = {
    awal: 'Penempatan Awal', promosi: 'Promosi', mutasi: 'Mutasi', demosi: 'Demosi', penyesuaian: 'Penyesuaian',
}

const JENIS_CLASS: Record<JenisPerubahanJabatan, string> = {
    awal:        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    promosi:     'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    mutasi:      'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    demosi:      'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100',
    penyesuaian: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
}

const TH = 'text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'
const kosong = <span className="text-gray-400">—</span>
const tgl = (nilai: string) => dayjs(nilai).format('DD MMM YYYY')
const namaJabatan = (r: RiwayatJabatan) => r.id_jabatan === null ? 'Tanpa jabatan' : (r.nama_jabatan ?? 'Jabatan terhapus')

const lamaMenjabat = (mulai: string, selesai: string | null): string | null => {
    const awal = dayjs(mulai)
    const akhir = (selesai ? dayjs(selesai) : dayjs()).add(1, 'day')
    if (!akhir.isAfter(awal)) return null
    const bulan = akhir.diff(awal, 'month')
    if (bulan < 1) return `${Math.max(1, akhir.diff(awal, 'day'))} hari`
    const tahun = Math.floor(bulan / 12)
    const sisa = bulan % 12
    return [tahun ? `${tahun} th` : '', sisa ? `${sisa} bln` : ''].filter(Boolean).join(' ')
}

type FormJabatan = { id_jabatan: string; tanggal_efektif: string; jenis: JenisPerubahanJabatan | ''; nomor_sk: string; keterangan: string }
type FormErrors = Partial<Record<keyof FormJabatan, string>>

interface Props {
    karyawan: Karyawan
    onJabatanBerubah: (karyawan: Karyawan) => void
}

export default function RiwayatJabatanSection({ karyawan, onJabatanBerubah }: Props) {
    const idKaryawan = karyawan.id_karyawan
    const idJabatanKini = karyawan.jabatan?.id_jabatan ?? null

    const [riwayat, setRiwayat] = useState<RiwayatJabatan[]>([])
    const [memuat, setMemuat] = useState(true)
    const [gagal, setGagal] = useState(false)
    const [jabatanList, setJabatanList] = useState<Jabatan[]>([])
    const [statusJabatan, setStatusJabatan] = useState<'memuat' | 'siap' | 'gagal'>('memuat')
    const [dialogOpen, setDialogOpen] = useState(false)
    const [koreksi, setKoreksi] = useState<RiwayatJabatan | null>(null)
    const [form, setForm] = useState<FormJabatan>({ id_jabatan: '', tanggal_efektif: '', jenis: '', nomor_sk: '', keterangan: '' })
    const [errors, setErrors] = useState<FormErrors>({})
    const [saving, setSaving] = useState(false)

    const muat = useCallback(() => {
        karyawanService.riwayatJabatan(idKaryawan)
            .then(data => { setRiwayat(data); setGagal(false) })
            .catch(() => setGagal(true))
            .finally(() => setMemuat(false))
    }, [idKaryawan])

    useEffect(() => { muat() }, [muat, idJabatanKini, karyawan.tanggal_masuk])

    useEffect(() => {
        axios.get(API_ENDPOINTS.JABATAN, { params: { limit: 999 } })
            .then(res => { setJabatanList(res.data.data as Jabatan[]); setStatusJabatan('siap') })
            .catch(() => setStatusJabatan('gagal'))
    }, [])

    const jabatanOptions: OpsiTeks[] = jabatanList
        .filter(j => j.aktif && j.id_jabatan !== idJabatanKini)
        .map(j => ({ value: j.id_jabatan, label: j.nama_jabatan }))

    const hariIni = dayjs().format('YYYY-MM-DD')
    const tanggalMasuk = karyawan.tanggal_masuk ? karyawan.tanggal_masuk.slice(0, 10) : null
    const palingAkhir = tanggalMasuk && tanggalMasuk > hariIni ? tanggalMasuk : hariIni
    const mulaiTerakhir = riwayat.find(r => r.tanggal_mulai)?.tanggal_mulai ?? tanggalMasuk

    const indeksKoreksi = koreksi ? riwayat.findIndex(r => r.id_riwayat === koreksi.id_riwayat) : -1
    const batasBawah = koreksi
        ? (riwayat[indeksKoreksi + 1]?.tanggal_mulai ?? tanggalMasuk)
        : mulaiTerakhir
    const batasAtas = koreksi ? (riwayat[indeksKoreksi - 1]?.tanggal_mulai ?? palingAkhir) : palingAkhir
    const rentangTerbalik = batasBawah !== null && batasBawah > batasAtas

    const bukaUbah = () => {
        setKoreksi(null)
        setForm({
            id_jabatan: '',
            tanggal_efektif: mulaiTerakhir && mulaiTerakhir > hariIni ? mulaiTerakhir : hariIni,
            jenis: '', nomor_sk: '', keterangan: '',
        })
        setErrors({})
        setDialogOpen(true)
    }

    const bukaKoreksi = (r: RiwayatJabatan) => {
        setKoreksi(r)
        setForm({
            id_jabatan: r.id_jabatan ?? '',
            tanggal_efektif: r.tanggal_mulai ?? '',
            jenis: r.jenis ?? '',
            nomor_sk: r.nomor_sk ?? '',
            keterangan: r.keterangan ?? '',
        })
        setErrors({})
        setDialogOpen(true)
    }

    const jenisTerkunci = koreksi ? koreksi.jenis === 'awal' : idJabatanKini === null

    const simpan = async () => {
        if (saving) return
        const e: FormErrors = {}
        if (!koreksi && !form.id_jabatan) e.id_jabatan = 'Jabatan baru wajib dipilih'
        if (!form.tanggal_efektif) e.tanggal_efektif = 'Tanggal efektif wajib diisi'
        else if (form.tanggal_efektif > palingAkhir) e.tanggal_efektif = 'Tanggal efektif tidak boleh melewati hari ini'
        if (!jenisTerkunci && !form.jenis) e.jenis = 'Jenis perubahan wajib dipilih'
        setErrors(e)
        if (Object.keys(e).length > 0) return

        const rincian = {
            tanggal_efektif: form.tanggal_efektif,
            jenis: jenisTerkunci || !form.jenis ? undefined : form.jenis,
            nomor_sk: form.nomor_sk.trim() || null,
            keterangan: form.keterangan.trim() || null,
        }

        setSaving(true)
        try {
            if (koreksi?.id_riwayat) {
                setRiwayat(await karyawanService.koreksiRiwayatJabatan(idKaryawan, koreksi.id_riwayat, rincian))
                toast.push(<Notification type="success" title="Catatan jabatan berhasil diperbarui" />)
            } else {
                const hasil = await karyawanService.ubahJabatan(idKaryawan, { id_jabatan: form.id_jabatan, ...rincian })
                onJabatanBerubah(hasil)
                toast.push(<Notification type="success" title="Perubahan jabatan berhasil dicatat" />)
            }
            setDialogOpen(false)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <Card>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <h5 className="font-bold">Riwayat Jabatan</h5>
                        <p className="text-gray-500 text-sm mt-0.5">Semua jabatan yang pernah dipegang karyawan ini, dari yang terbaru</p>
                    </div>
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={bukaUbah}>
                        {idJabatanKini ? 'Ubah Jabatan' : 'Tetapkan Jabatan'}
                    </Button>
                </div>
                {memuat ? (
                    <p className="text-gray-400 text-sm text-center py-6">Memuat riwayat jabatan...</p>
                ) : gagal ? (
                    <p className="text-red-500 text-sm text-center py-6">Riwayat jabatan gagal dimuat.</p>
                ) : riwayat.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">Karyawan ini belum punya jabatan.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className={TH}>Jabatan</th>
                                    <th className={TH}>Periode</th>
                                    <th className={TH}>Lama</th>
                                    <th className={TH}>Jenis</th>
                                    <th className={TH}>No. SK</th>
                                    <th className={TH}>Keterangan</th>
                                    <th className={TH}>Dicatat</th>
                                    <th className="w-12" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {riwayat.map((r, i) => (
                                    <tr key={r.id_riwayat ?? `awal-${i}`}>
                                        <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-gray-800 dark:text-gray-100">{namaJabatan(r)}</span>
                                                {r.sedang_dijabat && (
                                                    <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100">Saat ini</Tag>
                                                )}
                                            </div>
                                            {r.nama_departemen && <p className="text-xs text-gray-400 mt-0.5">{r.nama_departemen}</p>}
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                            {r.tanggal_mulai ? tgl(r.tanggal_mulai) : <span className="text-gray-400">Tidak tercatat</span>}
                                            {' – '}
                                            {r.tanggal_selesai ? tgl(r.tanggal_selesai) : karyawan.aktif ? 'Sekarang' : <span className="text-gray-400">Nonaktif</span>}
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                            {(r.tanggal_mulai && (r.tanggal_selesai || karyawan.aktif) ? lamaMenjabat(r.tanggal_mulai, r.tanggal_selesai) : null) ?? kosong}
                                        </td>
                                        <td className="py-2.5 px-3">
                                            {r.jenis
                                                ? <Tag className={JENIS_CLASS[r.jenis]}>{JENIS_LABEL[r.jenis]}</Tag>
                                                : <span className="text-xs text-gray-400">Belum diisi</span>}
                                        </td>
                                        <td className="py-2.5 px-3">{r.nomor_sk ?? kosong}</td>
                                        <td className="py-2.5 px-3 max-w-[260px]">
                                            {r.keterangan ? <p className="truncate" title={r.keterangan}>{r.keterangan}</p> : kosong}
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                            {r.dicatat_oleh || r.dicatat_pada ? (
                                                <>
                                                    <p>{r.dicatat_oleh ?? 'Sistem'}</p>
                                                    {r.dicatat_pada && <p className="text-xs text-gray-400">{dayjs(r.dicatat_pada).format('DD MMM YYYY HH:mm')}</p>}
                                                </>
                                            ) : kosong}
                                        </td>
                                        <td className="py-2.5 px-3">
                                            {r.id_riwayat && (
                                                <div className="flex items-center justify-end">
                                                    <Tooltip title="Koreksi Catatan">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                            onClick={() => bukaKoreksi(r)}>
                                                            <HiOutlinePencilAlt className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Dialog isOpen={dialogOpen} width={640} onRequestClose={() => setDialogOpen(false)} onClose={() => setDialogOpen(false)}>
                <h5 className="font-bold">{koreksi ? 'Koreksi Catatan Jabatan' : idJabatanKini ? 'Ubah Jabatan' : 'Tetapkan Jabatan'}</h5>
                <p className="text-gray-500 text-sm mt-0.5 mb-4">
                    {koreksi
                        ? <>Jabatan <span className="font-semibold">{namaJabatan(koreksi)}</span> — yang bisa dikoreksi hanya tanggal, jenis, nomor SK, dan keterangan. Bila jabatannya salah, catat perubahan jabatan baru.</>
                        : idJabatanKini
                            ? <>Jabatan saat ini: <span className="font-semibold">{karyawan.jabatan?.nama_jabatan}</span>. Jabatan lama tersimpan di riwayat.</>
                            : 'Karyawan ini belum punya jabatan.'}
                </p>
                {rentangTerbalik && tanggalMasuk && (
                    <div className="px-3.5 py-2.5 mb-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300">
                        Tanggal masuk karyawan ({tgl(tanggalMasuk)}) lebih baru daripada catatan jabatan yang sudah ada, jadi tanggal efektif bisa ditolak. Periksa dulu tanggal masuk di data karyawan.
                    </div>
                )}
                <form onSubmit={e => { e.preventDefault(); simpan() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        {!koreksi && (
                            <div className="sm:col-span-2">
                                <FormItem label="Jabatan Baru" asterisk invalid={!!errors.id_jabatan} errorMessage={errors.id_jabatan}>
                                    <Select<OpsiTeks> isSearchable placeholder="Pilih jabatan..."
                                        noOptionsMessage={({ inputValue }) => statusJabatan === 'gagal' ? 'Daftar jabatan gagal dimuat'
                                            : statusJabatan === 'memuat' ? 'Memuat daftar jabatan...'
                                            : inputValue ? 'Tidak ada jabatan yang cocok' : 'Tidak ada jabatan lain yang aktif'}
                                        options={jabatanOptions}
                                        value={jabatanOptions.find(o => o.value === form.id_jabatan) ?? null}
                                        onChange={opt => { setForm(p => ({ ...p, id_jabatan: opt?.value ?? '' })); setErrors(p => ({ ...p, id_jabatan: undefined })) }} />
                                </FormItem>
                            </div>
                        )}
                        <FormItem label="Tanggal Efektif" asterisk invalid={!!errors.tanggal_efektif} errorMessage={errors.tanggal_efektif}
                            extra={<span className="text-xs text-gray-400">Tanggal jabatan ini mulai berlaku</span>}>
                            <DatePicker inputFormat="DD/MM/YYYY"
                                minDate={batasBawah && !rentangTerbalik ? dayjs(batasBawah).toDate() : undefined}
                                maxDate={rentangTerbalik ? undefined : dayjs(batasAtas).toDate()}
                                value={form.tanggal_efektif ? dayjs(form.tanggal_efektif).toDate() : null}
                                onChange={date => { setForm(p => ({ ...p, tanggal_efektif: date ? dayjs(date).format('YYYY-MM-DD') : '' })); setErrors(p => ({ ...p, tanggal_efektif: undefined })) }} />
                        </FormItem>
                        <FormItem label="Jenis Perubahan" asterisk={!jenisTerkunci} invalid={!!errors.jenis} errorMessage={errors.jenis}>
                            {jenisTerkunci ? (
                                <Input value="Penempatan Awal" disabled />
                            ) : (
                                <Select<OpsiJenis> isSearchable={false} placeholder="Pilih jenis..."
                                    options={JENIS_OPTIONS}
                                    value={JENIS_OPTIONS.find(o => o.value === form.jenis) ?? null}
                                    onChange={opt => { setForm(p => ({ ...p, jenis: opt?.value ?? '' })); setErrors(p => ({ ...p, jenis: undefined })) }} />
                            )}
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Nomor SK" extra={<span className="text-xs text-gray-400">Opsional — nomor surat keputusan atau dokumen dasarnya</span>}>
                                <Input placeholder="Contoh: 012/SK-HR/X/2026" maxLength={100} value={form.nomor_sk}
                                    onChange={e => setForm(p => ({ ...p, nomor_sk: e.target.value }))} />
                            </FormItem>
                        </div>
                        <div className="sm:col-span-2">
                            <FormItem label="Keterangan" extra={<span className="text-xs text-gray-400">Opsional</span>}>
                                <Input textArea rows={2} maxLength={1000} placeholder="Alasan atau catatan perubahan jabatan" value={form.keterangan}
                                    onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                            </FormItem>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setDialogOpen(false)}>Kembali</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                    </div>
                </form>
            </Dialog>
        </>
    )
}
