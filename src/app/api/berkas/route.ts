import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4019'
const AWALAN_BERKAS = '/storage/'

const bersihkanNama = (nama: string) => nama.replace(/[\\/:*?"<>|\r\n]+/g, '-').trim().slice(0, 120)

export async function GET(request: NextRequest) {
    const session = await auth()
    if (!session) {
        return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sumber = searchParams.get('u') ?? ''

    let pathname: string
    try {
        pathname = new URL(sumber, BACKEND_URL).pathname
    } catch {
        return NextResponse.json({ success: false, message: 'URL berkas tidak valid' }, { status: 400 })
    }
    if (!pathname.startsWith(AWALAN_BERKAS) || pathname.includes('..')) {
        return NextResponse.json({ success: false, message: 'URL berkas tidak diizinkan' }, { status: 400 })
    }

    const upstream = await fetch(`${BACKEND_URL}${pathname}`)
    if (!upstream.ok || !upstream.body) {
        return NextResponse.json({ success: false, message: 'Berkas tidak ditemukan' }, { status: upstream.status === 404 ? 404 : 502 })
    }

    const namaAsli = decodeURIComponent(pathname.split('/').pop() ?? 'berkas')
    const ekstensi = namaAsli.includes('.') ? namaAsli.slice(namaAsli.lastIndexOf('.')) : ''
    const namaDiminta = searchParams.get('nama')
    const namaUnduh = namaDiminta ? `${bersihkanNama(namaDiminta)}${ekstensi}` : namaAsli

    return new NextResponse(upstream.body, {
        status: 200,
        headers: {
            'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(namaUnduh)}"; filename*=UTF-8''${encodeURIComponent(namaUnduh)}`,
            'Cache-Control': 'private, no-store',
        },
    })
}
