import type { AxiosError } from 'axios'

export function parseApiError(err: unknown): string {
    if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as AxiosError<{
            message?: string
            errors?: Record<string, string[]>
        }>
        const data = axiosErr.response?.data
        if (data?.errors) {
            const first = Object.values(data.errors)[0]
            if (Array.isArray(first) && first.length > 0) return first[0]
        }
        if (data?.message) return data.message
        return `Error ${axiosErr.response?.status ?? 'unknown'}`
    }
    if (err instanceof Error) return err.message
    return 'Terjadi kesalahan. Coba lagi.'
}
