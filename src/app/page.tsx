import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import BerandaPage from '@/components/company-profile/BerandaPage'

export default async function Page() {
    const session = await auth()
    if (session) redirect('/home')
    return <BerandaPage />
}
