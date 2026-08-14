import NextAuth from 'next-auth'
import appConfig from '@/configs/app.config'
import authConfig from '@/configs/auth.config'

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    pages: {
        signIn: appConfig.authenticatedEntryPath,
        error: appConfig.authenticatedEntryPath,
    },
    ...authConfig,
})
