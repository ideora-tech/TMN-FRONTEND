'use client'
import { useState } from 'react'
import { Dialog } from '@/components/ui'
import { JabatanTreeNode } from '@/services/strukturOrganisasi.service'

type Props = {
    node: JabatanTreeNode
}

export default function StrukturOrganisasiTree({ node }: Props) {
    const [showDaftar, setShowDaftar] = useState(false)

    return (
        <div>
            <div className="inline-flex flex-col gap-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 min-w-[220px]">
                <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{node.nama_jabatan}</span>
                    {node.nama_departemen && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 whitespace-nowrap">
                            {node.nama_departemen}
                        </span>
                    )}
                </div>
                {node.jumlah_karyawan === 0 && (
                    <span className="text-xs text-gray-400 italic">Belum ada yang menjabat</span>
                )}
                {node.jumlah_karyawan === 1 && (
                    <span className="text-xs text-gray-600 dark:text-gray-300">{node.karyawan[0].nama_karyawan}</span>
                )}
                {node.jumlah_karyawan > 1 && (
                    <button type="button" onClick={() => setShowDaftar(true)}
                        className="self-start text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
                        {node.jumlah_karyawan} orang
                    </button>
                )}
            </div>

            {node.children.length > 0 && (
                <div className="ml-6 mt-3 pl-4 border-l-2 border-gray-200 dark:border-gray-600 flex flex-col gap-3">
                    {node.children.map(child => (
                        <StrukturOrganisasiTree key={child.id_jabatan} node={child} />
                    ))}
                </div>
            )}

            <Dialog isOpen={showDaftar} onRequestClose={() => setShowDaftar(false)} onClose={() => setShowDaftar(false)} width={400}>
                <h5 className="mb-1">{node.nama_jabatan}</h5>
                <p className="text-sm text-gray-500 mb-4">{node.jumlah_karyawan} orang menjabat posisi ini</p>
                <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                    {node.karyawan.map(k => (
                        <li key={k.id_karyawan} className="text-sm text-gray-700 dark:text-gray-200 py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            {k.nama_karyawan}
                        </li>
                    ))}
                </ul>
            </Dialog>
        </div>
    )
}
