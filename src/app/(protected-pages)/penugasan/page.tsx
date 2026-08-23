'use client'
import { Card } from '@/components/ui'
import BoardUnit from './BoardUnit'

export default function PenugasanUnitPage() {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Penugasan</h3>
                <p className="text-gray-500 text-sm mt-0.5">Papan penugasan harian per unit armada — internal &amp; vendor Unit Only</p>
            </div>
            <Card bodyClass="p-0">
                <BoardUnit />
            </Card>
        </div>
    )
}
