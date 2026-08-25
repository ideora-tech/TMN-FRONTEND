'use client'
import { useState } from 'react'
import { Dialog } from '@/components/ui'
import { JabatanTreeNode } from '@/services/strukturOrganisasi.service'
import styles from './StrukturOrganisasiTree.module.css'

type Props = {
    node: JabatanTreeNode
}

function KartuJabatan({ node }: Props) {
    const [showDaftar, setShowDaftar] = useState(false)

    return (
        <>
            <div className="flex flex-col gap-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm px-4 py-3 min-w-[200px] max-w-[240px]">
                <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{node.nama_jabatan}</span>
                    {node.nama_departemen && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 whitespace-nowrap flex-shrink-0">
                            {node.nama_departemen}
                        </span>
                    )}
                </div>
                {node.jumlah_karyawan === 0 && (
                    <span className="text-xs text-gray-400 italic">Belum ada yang menjabat</span>
                )}
                {node.jumlah_karyawan === 1 && (
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{node.karyawan[0].nama_karyawan}</span>
                )}
                {node.jumlah_karyawan > 1 && (
                    <button type="button" onClick={() => setShowDaftar(true)}
                        className="self-start text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
                        {node.jumlah_karyawan} orang
                    </button>
                )}
            </div>

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
        </>
    )
}

function NodeJabatan({ node }: Props) {
    return (
        <li>
            <KartuJabatan node={node} />
            {node.children.length > 0 && (
                <ul className={styles.tree}>
                    {node.children.map(child => (
                        <NodeJabatan key={child.id_jabatan} node={child} />
                    ))}
                </ul>
            )}
        </li>
    )
}

export default function StrukturOrganisasiTree({ node }: Props) {
    return (
        <div className="overflow-x-auto pb-2">
            <ul className={`${styles.tree} ${styles.treeRoot}`}>
                <NodeJabatan node={node} />
            </ul>
        </div>
    )
}
