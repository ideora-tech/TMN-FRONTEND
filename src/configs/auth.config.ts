import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Github from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'

export default {
    providers: [
        Github({
            clientId: process.env.GITHUB_AUTH_CLIENT_ID,
            clientSecret: process.env.GITHUB_AUTH_CLIENT_SECRET,
        }),
        Google({
            clientId: process.env.GOOGLE_AUTH_CLIENT_ID,
            clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET,
        }),
        Credentials({
            async authorize(credentials) {
                try {
                    const res = await fetch(`${process.env.BACKEND_URL ?? 'http://localhost:4019'}/api/v1/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                        body: JSON.stringify({
                            username: credentials?.email,   // Ecme form field is named "email"
                            password: credentials?.password,
                        }),
                    })

                    if (!res.ok) return null

                    const json = await res.json()
                    if (!json?.success || !json?.data?.token) return null

                    return {
                        id:          json.data.pengguna.id_pengguna,
                        name:        json.data.pengguna.karyawan?.nama_karyawan ?? json.data.pengguna.username,
                        email:       json.data.pengguna.email,
                        accessToken: json.data.token,
                        kodePeran:   json.data.pengguna.kode_peran ?? null,
                    }
                } catch {
                    return null
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                const u = user as Record<string, unknown>
                token.accessToken = u.accessToken
                token.id          = user.id
                token.kodePeran   = u.kodePeran ?? null
            }
            return token
        },
        async session({ session, token }) {
            return {
                ...session,
                accessToken: token.accessToken,
                user: {
                    ...session.user,
                    id:        token.id as string,
                    kodePeran: token.kodePeran as string | null,
                    authority: token.kodePeran
                        ? [(token.kodePeran as string).toLowerCase()]
                        : ['user'],
                },
            }
        },
    },
} satisfies NextAuthConfig
