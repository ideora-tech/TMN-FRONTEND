import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/landing/LandingPage'

export default async function Page() {
    const session = await auth()
    if (session) redirect('/home')
    return <LandingPage />
}
