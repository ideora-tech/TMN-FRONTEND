'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, Button, FormItem, Input, Tag, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { evaluasiService, EvaluasiTrip, EvaluasiPayload } from '@/services/evaluasi.service'

type NilaiKey = 'nilai_armada' | 'nilai_supir' | 'nilai_ketepatan_waktu' | 'nilai_kualitas' | 'nilai_harga' | 'nilai_responsif'

const KRITERIA_VENDOR: { key: NilaiKey; label: string }[] = [
    { key: 'nilai_ketepatan_waktu', label: 'Ketepatan Waktu' },
    { key: 'nilai_kualitas',        label: 'Kualitas Layanan' },
    { key: 'nilai_harga',           label: 'Harga' },
    { key: 'nilai_responsif',       label: 'Responsif' },
]

const KRITERIA_INTERNAL: { key: NilaiKey; label: string }[] = [
    { key: 'nilai_armada', label: 'Nilai Armada' },
    { key: 'nilai_supir',  label: 'Nilai Supir' },
]

const NILAI_OPTIONS = [1, 2, 3, 4, 5].map(n => ({ value: n, label: String(n) }))

function nilaiTagClass(nilai: number) {
    if (nilai >= 4) return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
    if (nilai === 3) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'
    return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300'
}

export default function EvaluasiPenugasanCard({ idPenugasan, sumber }: { idPenugasan: string; sumber: 'internal' | 'vendor' }) {
    const [evaluasi, setEvaluasi]   = useState<EvaluasiTrip | null>(null)
    const [loading, setLoading]     = useState(true)
    const [editing, setEditing]     = useState(false)
    const [form, setForm]           = useState<EvaluasiPayload>({})
    const [error, setError]         = useState('')
    const [saving, setSaving]       = useState(false)

    const kriteria = sumber === 'vendor' ? KRITERIA_VENDOR : KRITERIA_INTERNAL

    const fetchEvaluasi = useCallback(async () => {
        setLoading(true)
        try {
            setEvaluasi(await evaluasiService.getByPenugasan(idPenugasan))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [idPenugasan])

    useEffect(() => { fetchEvaluasi() }, [fetchEvaluasi])

    const handleSave = async () => {
        if (!kriteria.some(k => form[k.key] != null)) {
            setError('Isi minimal satu nilai')
            return
        }
        setError('')
        setSaving(true)
        try {
            const payload: EvaluasiPayload = { catatan: form.catatan?.trim() || null }
            kriteria.forEach(k => { payload[k.key] = form[k.key] ?? null })
            if (evaluasi) {
                await evaluasiService.update(evaluasi.id_evaluasi, payload)
            } else {
                await evaluasiService.create(idPenugasan, payload)
            }
            toast.push(<Notification type="success" title="Evaluasi berhasil disimpan" />)
            setEditing(false)
            fetchEvaluasi()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-1">
                <div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Evaluasi</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {sumber === 'vendor'
                            ? 'Penilaian kinerja vendor untuk penugasan ini'
                            : 'Penilaian armada & supir untuk penugasan ini'}
                    </p>
                </div>
                {evaluasi && !editing && (
                    <Button size="sm" variant="solid" icon={<HiOutlinePencilAlt />}
                        onClick={() => { setForm(evaluasi); setError(''); setEditing(true) }}>
                        Ubah
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-6"><Spinner /></div>
            ) : evaluasi && !editing ? (
                <div className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        {kriteria.map(k => {
                            const nilai = evaluasi[k.key]
                            return (
                                <div key={k.key} className="flex items-center justify-between gap-3">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{k.label}</p>
                                    {nilai != null ? (
                                        <Tag className={`text-xs font-semibold ${nilaiTagClass(nilai)}`}>{nilai}/5</Tag>
                                    ) : (
                                        <span className="text-gray-400 text-sm">—</span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    {evaluasi.catatan && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Catatan</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{evaluasi.catatan}</p>
                        </div>
                    )}
                </div>
            ) : (
                <form className="mt-4" onSubmit={e => { e.preventDefault(); handleSave() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        {kriteria.map(k => (
                            <FormItem key={k.key} label={k.label}>
                                <Select isClearable isSearchable={false} placeholder="Pilih nilai..."
                                    options={NILAI_OPTIONS}
                                    value={NILAI_OPTIONS.find(o => o.value === form[k.key]) ?? null}
                                    onChange={opt => {
                                        setError('')
                                        setForm(p => ({ ...p, [k.key]: opt?.value ?? null }))
                                    }} />
                            </FormItem>
                        ))}
                        <FormItem label="Keterangan" className="sm:col-span-2">
                            <Input textArea rows={3} placeholder="Catatan tambahan (opsional)"
                                value={form.catatan ?? ''}
                                onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} />
                        </FormItem>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        {evaluasi && (
                            <Button type="button" variant="plain"
                                onClick={() => { setEditing(false); setError('') }}>Batal</Button>
                        )}
                        <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                    </div>
                </form>
            )}
        </Card>
    )
}
