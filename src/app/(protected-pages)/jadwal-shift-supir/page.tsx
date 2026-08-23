'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Button, Tooltip, toast, Notification, Dialog, Input, Checkbox, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiPlusCircle } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import PapanShift from './PapanShift'
import { supirProyekService, SupirProyek } from '@/services/supirProyek.service'
import { projectService, Project } from '@/services/project.service'
import { supirService, Supir } from '@/services/supir.service'

type HasilGagalTambah = { supir: string; alasan: string }

export default function JadwalShiftSupirPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string; namaKlien: string | null }[]>([])
    const [selectedProyek, setSelectedProyek] = useState<string>(() =>
        searchParams.get('proyek')
        ?? (typeof window !== 'undefined' ? localStorage.getItem('jadwalShiftSupir.proyek') ?? '' : ''))

    const gantiProyek = (id: string) => {
        setSelectedProyek(id)
        if (typeof window !== 'undefined') {
            if (id) localStorage.setItem('jadwalShiftSupir.proyek', id)
            else localStorage.removeItem('jadwalShiftSupir.proyek')
        }
        router.replace(id ? `${ROUTES.JADWAL_SHIFT_SUPIR}?proyek=${id}` : ROUTES.JADWAL_SHIFT_SUPIR, { scroll: false })
    }

    const [list, setList]       = useState<SupirProyek[]>([])
    const [loading, setLoading] = useState(false)

    const [tambahDialogOpen, setTambahDialogOpen] = useState(false)
    const [checkedIds, setCheckedIds]             = useState<string[]>([])
    const [cariSupirTambah, setCariSupirTambah]   = useState('')
    const [tambahError, setTambahError]           = useState<string | undefined>(undefined)
    const [tambahSubmitting, setTambahSubmitting] = useState(false)
    const [hasilTambah, setHasilTambah]           = useState<{ sukses: number; gagal: HasilGagalTambah[] } | null>(null)

    const [daftarSupirAktif, setDaftarSupirAktif]   = useState<Supir[]>([])
    const [supirAktifLoading, setSupirAktifLoading] = useState(false)
    const [supirAktifError, setSupirAktifError]     = useState(false)
    const supirAktifLoadedRef = useRef(false)

    const fetchSupirAktif = useCallback(async () => {
        if (!supirAktifLoadedRef.current) {
            setSupirAktifLoading(true)
            setSupirAktifError(false)
        }
        try {
            const res = await supirService.list(1, 100, undefined, 'aktif')
            setDaftarSupirAktif(res.data)
            supirAktifLoadedRef.current = true
        } catch {
            if (!supirAktifLoadedRef.current) setSupirAktifError(true)
        } finally {
            setSupirAktifLoading(false)
        }
    }, [])

    useEffect(() => {
        projectService.list(1).then(res => {
            setProyekOptions(res.data.map((p: Project) => ({
                value: p.id_proyek,
                label: `${p.kode_proyek} — ${p.nama_proyek}`,
                namaKlien: p.nama_klien ?? null,
            })))
        }).catch(() => {})
    }, [])

    const fetchData = useCallback(async () => {
        if (!selectedProyek) return
        setLoading(true)
        try {
            const data = await supirProyekService.list(selectedProyek)
            setList(data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [selectedProyek])

    useEffect(() => { fetchData() }, [fetchData])

    const supirBelumTerdaftar = useMemo(() => {
        const terdaftar = new Set(list.map(s => s.id_supir))
        return daftarSupirAktif.filter(s => !terdaftar.has(s.id_supir))
    }, [daftarSupirAktif, list])

    const filteredSupirTambah = useMemo(() => {
        const q = cariSupirTambah.trim().toLowerCase()
        if (!q) return supirBelumTerdaftar
        return supirBelumTerdaftar.filter(s =>
            s.nama.toLowerCase().includes(q) || (s.no_sim ?? '').toLowerCase().includes(q))
    }, [supirBelumTerdaftar, cariSupirTambah])

    const allFilteredChecked = filteredSupirTambah.length > 0
        && filteredSupirTambah.every(s => checkedIds.includes(s.id_supir))

    const toggleSupirTambah = (id: string) => {
        setCheckedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
        setTambahError(undefined)
    }

    const toggleAllFilteredTambah = () => {
        const ids = filteredSupirTambah.map(s => s.id_supir)
        setCheckedIds(prev => allFilteredChecked
            ? prev.filter(x => !ids.includes(x))
            : Array.from(new Set([...prev, ...ids])))
        setTambahError(undefined)
    }

    const openTambahDialog = () => {
        if (!selectedProyek) return
        setCheckedIds([])
        setCariSupirTambah('')
        setTambahError(undefined)
        setTambahDialogOpen(true)
        fetchSupirAktif()
    }

    const closeTambahDialog = () => setTambahDialogOpen(false)

    const handleSubmitTambah = async () => {
        if (!selectedProyek) return
        if (checkedIds.length === 0) {
            setTambahError('Centang minimal satu supir')
            return
        }
        setTambahSubmitting(true)
        try {
            const hasil = await supirProyekService.tambahBatch({ id_proyek: selectedProyek, supir: checkedIds })
            setTambahDialogOpen(false)
            fetchData()
            if (hasil.gagal.length === 0) {
                toast.push(<Notification type="success" title={`${hasil.sukses} supir berhasil ditambahkan`} />)
            } else {
                setHasilTambah({
                    sukses: hasil.sukses,
                    gagal: hasil.gagal.map(g => ({
                        supir:  daftarSupirAktif.find(s => s.id_supir === g.id_supir)?.nama ?? g.id_supir.slice(0, 8),
                        alasan: g.alasan,
                    })),
                })
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setTambahSubmitting(false)
        }
    }

    const handleHapusSupir = async (sp: SupirProyek) => {
        await supirProyekService.hapus(sp.id_supir_proyek)
        toast.push(<Notification type="success" title="Supir berhasil dikeluarkan dari proyek" />)
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Jadwal Shift Supir</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola shift harian supir per proyek</p>
                </div>
                <Tooltip title="Pilih proyek dulu" disabled={!!selectedProyek}>
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                        disabled={!selectedProyek}
                        onClick={openTambahDialog}>
                        Tambah Supir
                    </Button>
                </Tooltip>
            </div>
            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center gap-3">
                    <Select
                        className="w-full sm:w-96"
                        placeholder="Pilih proyek untuk melihat jadwal shift..."
                        options={proyekOptions}
                        value={proyekOptions.find(o => o.value === selectedProyek) ?? null}
                        onChange={(opt) => gantiProyek((opt as { value: string } | null)?.value ?? '')}
                    />
                    {selectedProyek && proyekOptions.find(o => o.value === selectedProyek)?.namaKlien && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Klien: <span className="font-medium text-gray-700 dark:text-gray-200">
                                {proyekOptions.find(o => o.value === selectedProyek)?.namaKlien}
                            </span>
                        </span>
                    )}
                </div>

                {!selectedProyek ? (
                    <div className="py-12 text-center text-gray-400 text-sm">
                        Pilih proyek di atas untuk melihat jadwal shift supir
                    </div>
                ) : (
                    <PapanShift
                        idProyek={selectedProyek}
                        namaProyek={proyekOptions.find(o => o.value === selectedProyek)?.label ?? ''}
                        supirList={list}
                        loading={loading}
                        onHapusSupir={handleHapusSupir}
                        refetch={fetchData}
                    />
                )}
            </Card>

            <Dialog isOpen={tambahDialogOpen} onRequestClose={closeTambahDialog} onClose={closeTambahDialog} width={640}>
                <h5 className="text-base font-semibold mb-1">Tambah Supir</h5>
                <p className="text-xs text-gray-400 mb-4">
                    Centang satu atau lebih supir aktif untuk didaftarkan ke proyek ini.
                    Jadwal shift harian per tanggal diatur belakangan di papan jadwal.
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSubmitTambah() }}>
                    <div className="max-h-[65vh] overflow-y-auto pr-1">
                    {supirAktifLoading ? (
                        <div className="py-12 flex items-center justify-center">
                            <Spinner size={32} />
                        </div>
                    ) : supirAktifError ? (
                        <div className="py-10 text-center">
                            <p className="text-red-500 text-sm">Gagal memuat data supir — coba buka ulang</p>
                        </div>
                    ) : supirBelumTerdaftar.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-gray-500 text-sm">
                                Semua supir aktif sudah terdaftar di proyek ini.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-4 mb-3">
                                <Input
                                    size="sm"
                                    className="max-w-xs"
                                    placeholder="Cari nama supir / no. SIM..."
                                    value={cariSupirTambah}
                                    onChange={e => setCariSupirTambah(e.target.value)}
                                />
                                <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-2">
                                    {checkedIds.length} supir dipilih
                                    {checkedIds.length > 0 && (
                                        <button type="button"
                                            className="text-blue-600 hover:underline dark:text-blue-400"
                                            onClick={() => setCheckedIds([])}>
                                            Batalkan
                                        </button>
                                    )}
                                </span>
                            </div>
                            <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0 z-10">
                                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                                <th className="py-2.5 pl-3 pr-1 w-10 text-left">
                                                    <Tooltip title="Pilih semua">
                                                        <span>
                                                            <Checkbox
                                                                checked={allFilteredChecked}
                                                                disabled={filteredSupirTambah.length === 0}
                                                                onChange={toggleAllFilteredTambah}
                                                            />
                                                        </span>
                                                    </Tooltip>
                                                </th>
                                                <th className="py-2.5 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Supir</th>
                                                <th className="py-2.5 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Telepon</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {filteredSupirTambah.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="py-6 text-center text-gray-400 text-sm">
                                                        Tidak ada supir yang cocok dengan pencarian
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredSupirTambah.map(s => {
                                                    const isChecked = checkedIds.includes(s.id_supir)
                                                    return (
                                                        <tr key={s.id_supir}
                                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors"
                                                            onClick={() => toggleSupirTambah(s.id_supir)}>
                                                            <td className="py-2.5 pl-3 pr-1 w-10" onClick={e => e.stopPropagation()}>
                                                                <Checkbox checked={isChecked} onChange={() => toggleSupirTambah(s.id_supir)} />
                                                            </td>
                                                            <td className="py-2.5 pr-4">
                                                                <p className="font-medium text-gray-800 dark:text-gray-200">{s.nama}</p>
                                                                <p className="text-xs text-gray-400">SIM {s.jenis_sim ?? '-'}{s.no_sim ? ` · ${s.no_sim}` : ''}</p>
                                                            </td>
                                                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">{s.telepon ?? '-'}</td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            {tambahError && (
                                <p className="text-red-500 text-xs mt-1.5">{tambahError}</p>
                            )}
                        </>
                    )}
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={closeTambahDialog}>Batal</Button>
                        <Button type="submit" variant="solid" loading={tambahSubmitting}
                            disabled={supirAktifLoading || supirAktifError || supirBelumTerdaftar.length === 0}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={!!hasilTambah} onRequestClose={() => setHasilTambah(null)} onClose={() => setHasilTambah(null)} width={480}>
                <h5 className="text-base font-semibold mb-1">Hasil Tambah Supir</h5>
                {hasilTambah && (
                    <>
                        <p className="text-sm text-gray-500 mb-4">
                            {hasilTambah.sukses} berhasil, {hasilTambah.gagal.length} gagal.
                            {hasilTambah.sukses > 0 && ' Supir yang berhasil tetap tersimpan.'}
                        </p>
                        <div className="max-h-64 overflow-y-auto flex flex-col gap-2">
                            {hasilTambah.gagal.map((g, i) => (
                                <div key={i} className="text-sm px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                                    {g.supir}: {g.alasan}
                                </div>
                            ))}
                        </div>
                    </>
                )}
                <div className="flex justify-end mt-4">
                    <Button size="sm" variant="solid" onClick={() => setHasilTambah(null)}>Tutup</Button>
                </div>
            </Dialog>
        </div>
    )
}
