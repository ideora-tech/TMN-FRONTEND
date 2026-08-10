import { redirect } from 'next/navigation'

export default function DashboardArmadaPage() {
    redirect('/home?tab=armada')
}
