import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4019'

async function handler(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
) {
    const session = await auth()
    const { path } = await params
    const pathStr = path.join('/')

    const searchParams = new URL(request.url).searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/v1/${pathStr}${searchParams ? `?${searchParams}` : ''}`

    const headers: Record<string, string> = {
        Accept: 'application/json',
    }

    // Inject Sanctum token from session
    const token = (session as unknown as Record<string, unknown>)?.accessToken as string | undefined
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const contentType = request.headers.get('content-type') ?? ''
    const isFormData  = contentType.includes('multipart/form-data')

    if (isFormData) {
        // Forward the original Content-Type WITH the boundary — Laravel needs it to parse fields
        headers['Content-Type'] = contentType
    } else {
        headers['Content-Type'] = 'application/json'
    }

    let body: BodyInit | undefined
    if (!['GET', 'HEAD'].includes(request.method)) {
        body = isFormData ? await request.arrayBuffer() : await request.text()
    }

    const response = await fetch(backendUrl, {
        method: request.method,
        headers,
        body,
    })

    const data = await response.json().catch(() => null)
    return NextResponse.json(data, { status: response.status })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
