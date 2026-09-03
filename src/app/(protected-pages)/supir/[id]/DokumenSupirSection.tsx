'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card, Button, FormItem, Input, DatePicker, Tag, Tooltip, Dialog, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiPlusCircle, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { dokumenKaryawanService, DokumenKaryawan } from '@/services/dokumenKaryawan.service'

const JENIS_DOKUMEN_OPTIONS = ['SIM', 'KTP', 'NPWP', 'Sertifikat', 'Kontrak Kerja', 'Ijazah', 'Lainnya'].map(v => ({ value: v, label: v }))
const MAX_FILE_SIZE = 5 * 1024 * 1024

function getExpiryInfo(berlakuSampai: string | null): { label: string; className: string } {
    if (!berlakuSampai) return { label: '—', className: 'bg-gray-100 text-gray-400' }
    const days = Math.ceil((new Date(berlakuSampai).getTime() - Date.now()) / 86400000)
    if (days < 0)   return { label: 'Habis Masa Berlaku', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    if (days <= 14) return { label: `${days} hari lagi`, className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    if (days <= 30) return { label: `${days} hari lagi`, className: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' }
    if (days <= 60) return { label: `${days} hari lagi`, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' }
    return { label: `${days} hari lagi`, className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' }
}

const kosong = <span className="text-gray-300 dark:text-gray-600">—</span>

export default function DokumenSupirSection({ idKaryawan, namaSupir }: { idKaryawan: string | null | undefined; namaSupir: string }) {
    const [list, setList]     = useState<DokumenKaryawan[]>([])
    const [open, setOpen]     = useState(false)
    const [edit, setEdit]     = useState<DokumenKaryawan | null>(null)
    const [form, setForm]     = useState({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' })
    const [file, setFile]     = useState<File | null>(null)
    const [saving, setSaving] = useState(false)
    const [hapus, setHapus]   = useState<DokumenKaryawan | null>(null)
    const [deleting, setDeleting] = useState(false)

    const muat = useCallback(() => {
        if (!idKaryawan) return
        dokumenKaryawanService.list(idKaryawan)
            .then(setList)
            .catch(() => setList([]))
    }, [idKaryawan])

    useEffect(() => { muat() }, [muat])

    const bukaTambah = () => {
        setEdit(null)
        setForm({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' })
        setFile(null)
        setOpen(true)
    }

    const bukaEdit = (d: DokumenKaryawan) => {
        setEdit(d)
        setForm({
            jenis_dokumen: d.jenis_dokumen,
            nomor: d.nomor ?? '',
            berlaku_sampai: d.berlaku_sampai ?? '',
        })
        setFile(null)
        setOpen(true)
    }

    const pilihFile = (f: File | null) => {
        if (f && f.size > MAX_FILE_SIZE) {
            toast.push(<Notification type="danger" title={`Ukuran file maksimal 5 MB (file dipilih: ${(f.size / 1024 / 1024).toFixed(1)} MB)`} />)
            return
        }
        setFile(f)
    }

    const handleSimpan = async () => {
        if (!idKaryawan || !form.jenis_dokumen || (!edit && !file)) return
        setSaving(true)
        try {
            const payload = {
                jenis_dokumen: form.jenis_dokumen,
                nomor: form.nomor || null,
                berlaku_sampai: form.berlaku_sampai || null,
            }
            if (edit) {
                await dokumenKaryawanService.update(idKaryawan, edit.id_dokumen_karyawan, payload, file ?? undefined)
                toast.push(<Notification type="success" title="Dokumen berhasil diperbarui" />)
            } else {
                await dokumenKaryawanService.create(idKaryawan, payload, file)
                toast.push(<Notification type="success" title="Dokumen berhasil ditambahkan" />)
            }
            setOpen(false)
            muat()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleHapus = async () => {
        if (!idKaryawan || !hapus) return
        setDeleting(true)
        try {
            await dokumenKaryawanService.delete(idKaryawan, hapus.id_dokumen_karyawan)
            toast.push(<Notification type="success" title="Dokumen berhasil dihapus" />)
            setHapus(null)
            muat()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setHapus(null)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <>
            <Card>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h5 className="font-bold">Dokumen</h5>
                        <p className="text-gray-500 text-sm mt-0.5">
                            SIM, KTP, sertifikat, dan dokumen lain beserta masa berlakunya — SIM boleh lebih dari satu, unggah SIM baru saat perpanjangan tanpa menghapus yang lama
                        </p>
                    </div>
                    {idKaryawan && (
                        <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={bukaTambah}>
                            Tambah Dokumen
                        </Button>
                    )}
                </div>
                {!idKaryawan ? (
                    <p className="text-gray-400 text-sm text-center py-6">
                        Tautkan supir ini ke karyawan (field <span className="font-semibold">Tautkan ke Karyawan</span> di atas)
                        untuk mulai mengelola dokumennya.
                    </p>
                ) : list.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">Belum ada dokumen.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Jenis</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Nomor</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Berlaku Sampai</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">File</th>
                                    <th className="w-24" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {list.map(d => {
                                    const expiry = getExpiryInfo(d.berlaku_sampai)
                                    return (
                                        <tr key={d.id_dokumen_karyawan}>
                                            <td className="py-2.5 px-3 font-medium">{d.jenis_dokumen}</td>
                                            <td className="py-2.5 px-3">{d.nomor ?? kosong}</td>
                                            <td className="py-2.5 px-3">
                                                {d.berlaku_sampai ? (
                                                    <div>
                                                        <p className="text-xs">{dayjs(d.berlaku_sampai).format('DD MMM YYYY')}</p>
                                                        <Tag className={`text-xs font-semibold mt-1 ${expiry.className}`}>{expiry.label}</Tag>
                                                    </div>
                                                ) : kosong}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                {d.url_file
                                                    ? <a href={d.url_file} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Lihat</a>
                                                    : kosong}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Tooltip title="Edit">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                            onClick={() => bukaEdit(d)}>
                                                            <HiOutlinePencilAlt className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title="Hapus">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                                            onClick={() => setHapus(d)}>
                                                            <HiOutlineTrash className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Dialog isOpen={open} width={800} onRequestClose={() => setOpen(false)} onClose={() => setOpen(false)}>
                <h5 className="font-bold mb-4">{edit ? 'Edit Dokumen' : 'Tambah Dokumen'}</h5>
                <form onSubmit={e => { e.preventDefault(); handleSimpan() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Jenis Dokumen" asterisk>
                        <Select isSearchable={false} placeholder="Pilih jenis..."
                            options={JENIS_DOKUMEN_OPTIONS}
                            value={JENIS_DOKUMEN_OPTIONS.find(o => o.value === form.jenis_dokumen) ?? null}
                            onChange={opt => setForm(p => ({ ...p, jenis_dokumen: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Nomor Dokumen">
                        <Input placeholder="Nomor dokumen (opsional)" value={form.nomor}
                            onChange={e => setForm(p => ({ ...p, nomor: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Berlaku Sampai" extra={<span className="text-xs text-gray-400">Kosongkan bila tidak ada masa berlaku</span>}>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.berlaku_sampai ? dayjs(form.berlaku_sampai).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, berlaku_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label={edit ? 'File (ganti, opsional)' : 'File'} asterisk={!edit}>
                        <UploadBerkas
                            file={file}
                            accept=".pdf,.jpg,.jpeg,.png"
                            label={edit ? 'Ganti file (opsional)' : 'Pilih file'}
                            existingUrl={edit?.url_file ?? null}
                            existingLabel="Dokumen saat ini"
                            emptyText={edit ? 'Belum ada dokumen tersimpan' : null}
                            onChange={pilihFile}
                        />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => setOpen(false)}>Batal</Button>
                    <Button type="submit" variant="solid" loading={saving}
                        disabled={!form.jenis_dokumen || (!edit && !file)}>
                        Simpan
                    </Button>
                </div>
                </form>
            </Dialog>

            <ConfirmDialog
                isOpen={!!hapus}
                type="danger"
                title="Hapus Dokumen"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => setHapus(null)}
                onCancel={() => setHapus(null)}
                onConfirm={handleHapus}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>Hapus dokumen {hapus?.jenis_dokumen}{hapus?.nomor ? ` (${hapus.nomor})` : ''} milik {namaSupir}?</p>
            </ConfirmDialog>
        </>
    )
}
