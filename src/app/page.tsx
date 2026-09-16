import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ComingSoonPage from '@/components/company-profile/ComingSoonPage'

export default async function Page() {
    const session = await auth()
    if (session) redirect('/home')
    return <ComingSoonPage />
}
