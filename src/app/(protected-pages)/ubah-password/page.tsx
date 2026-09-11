'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Card, Button, FormItem, toast, Notification } from '@/components/ui'
import PasswordInput from '@/components/shared/PasswordInput'
import { HiArrowLeft, HiOutlineShieldCheck, HiOutlineCheckCircle } from 'react-icons/hi'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import signOut from '@/server/actions/auth/handleSignOut'

type Galat = Partial<Record<'lama' | 'baru' | 'konfirmasi', string>>

const JEDA_LOGOUT_MS = 3000

export default function UbahPasswordPage() {
    const router = useRouter()
    const [lama, setLama] = useState('')
    const [baru, setBaru] = useState('')
    const [konfirmasi, setKonfirmasi] = useState('')
    const [galat, setGalat] = useState<Galat>({})
    const [menyimpan, setMenyimpan] = useState(false)
    const [berhasil, setBerhasil] = useState(false)

    useEffect(() => {
        if (!berhasil) return
        const timer = setTimeout(() => { signOut() }, JEDA_LOGOUT_MS)
        return () => clearTimeout(timer)
    }, [berhasil])

    const validasi = () => {
        const e: Galat = {}
        if (!lama) e.lama = 'Password lama wajib diisi'
        if (!baru) e.baru = 'Password baru wajib diisi'
        else if (baru.length < 8) e.baru = 'Password baru minimal 8 karakter'
        else if (baru === lama) e.baru = 'Password baru harus berbeda dari password lama'
        if (konfirmasi !== baru) e.konfirmasi = 'Konfirmasi password tidak sama'
        setGalat(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validasi()) return
        setMenyimpan(true)
        try {
            await axios.post(API_ENDPOINTS.AUTH_UBAH_PASSWORD, {
                password_lama: lama,
                password_baru: baru,
                password_baru_confirmation: konfirmasi,
            })
            try {
                await axios.post(API_ENDPOINTS.AUTH_LOGOUT)
            } catch {
            }
            setBerhasil(true)
        } catch (err) {
            const pesan = parseApiError(err)
            if (pesan === 'Password lama salah') setGalat({ lama: pesan })
            toast.push(<Notification type="danger" title={pesan} />)
        } finally {
            setMenyimpan(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.back()} disabled={berhasil}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors disabled:opacity-40">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">Ubah Password</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Ganti password akun yang Anda gunakan untuk masuk</p>
                </div>
            </div>

            <Card className="max-w-xl">
                {berhasil ? (
                    <div className="flex flex-col items-center text-center gap-3 py-6">
                        <HiOutlineCheckCircle className="text-6xl text-emerald-500" />
                        <h5 className="font-semibold">Password berhasil diubah</h5>
                        <p className="text-sm text-gray-500 max-w-sm">
                            Demi keamanan, Anda keluar otomatis dari semua perangkat. Silakan login kembali dengan password baru.
                            Anda akan diarahkan ke halaman login dalam beberapa detik.
                        </p>
                        <Button variant="solid" onClick={() => signOut()}>Login Ulang Sekarang</Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5 mb-5 text-sm text-blue-700 dark:text-blue-300">
                            <HiOutlineShieldCheck className="text-lg shrink-0 mt-0.5" />
                            <span>Gunakan minimal 8 karakter. Setelah password diubah, Anda akan keluar otomatis dari semua perangkat (web dan aplikasi mobile) dan perlu login ulang.</span>
                        </div>
                        <FormItem label="Password Lama" asterisk invalid={!!galat.lama} errorMessage={galat.lama}>
                            <PasswordInput placeholder="Masukkan password lama" autoComplete="current-password"
                                value={lama} invalid={!!galat.lama}
                                onChange={e => setLama(e.target.value)} />
                        </FormItem>
                        <FormItem label="Password Baru" asterisk invalid={!!galat.baru} errorMessage={galat.baru}>
                            <PasswordInput placeholder="Minimal 8 karakter" autoComplete="new-password"
                                value={baru} invalid={!!galat.baru}
                                onChange={e => setBaru(e.target.value)} />
                        </FormItem>
                        <FormItem label="Ulangi Password Baru" asterisk invalid={!!galat.konfirmasi} errorMessage={galat.konfirmasi}>
                            <PasswordInput placeholder="Ketik ulang password baru" autoComplete="new-password"
                                value={konfirmasi} invalid={!!galat.konfirmasi}
                                onChange={e => setKonfirmasi(e.target.value)} />
                        </FormItem>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => router.push(ROUTES.HOME)}>Batal</Button>
                            <Button type="submit" variant="solid" loading={menyimpan}>Simpan Password</Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    )
}
