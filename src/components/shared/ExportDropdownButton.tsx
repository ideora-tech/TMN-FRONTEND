'use client'
import { Button, Dropdown } from '@/components/ui'
import { HiOutlineDownload, HiOutlineChevronDown } from 'react-icons/hi'

type Props = {
    onExportExcel: () => void
    onExportPdf: () => void
    onDownloadTemplate?: () => void
    loading?: 'excel' | 'pdf' | 'template' | null
    label?: string
}

export default function ExportDropdownButton({
    onExportExcel, onExportPdf, onDownloadTemplate, loading = null, label = 'Unduh',
}: Props) {
    return (
        <Dropdown
            placement="bottom-end"
            disabled={!!loading}
            renderTitle={
                <Button size="sm" variant="default" icon={<HiOutlineDownload />} loading={!!loading}>
                    <span className="inline-flex items-center gap-1">
                        {label}
                        <HiOutlineChevronDown className="text-xs" />
                    </span>
                </Button>
            }
        >
            <Dropdown.Item eventKey="excel" onClick={onExportExcel}>Export Excel</Dropdown.Item>
            <Dropdown.Item eventKey="pdf" onClick={onExportPdf}>Export PDF</Dropdown.Item>
            {onDownloadTemplate && (
                <Dropdown.Item eventKey="template" onClick={onDownloadTemplate}>Unduh Template</Dropdown.Item>
            )}
        </Dropdown>
    )
}
