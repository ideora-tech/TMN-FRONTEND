'use client'
import OutstandingTab from '../faktur/OutstandingTab'

export default function PiutangKlienPage() {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Piutang Klien</h3>
                <p className="text-gray-500 text-sm mt-0.5">Invoice terkirim yang belum lunas, dikelompokkan menurut umur tagihannya</p>
            </div>
            <OutstandingTab />
        </div>
    )
}
