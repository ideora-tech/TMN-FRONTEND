'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import classNames from '@/utils/classNames'
import { kontenKeHtml } from '@/utils/richText'

type RichTextViewProps = {
    konten: string
    className?: string
}

const RichTextView = ({ konten, className }: RichTextViewProps) => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: kontenKeHtml(konten),
        editable: false,
        immediatelyRender: false,
        editorProps: {
            attributes: { class: 'focus:outline-hidden' },
        },
    })

    useEffect(() => {
        editor?.commands.setContent(kontenKeHtml(konten))
    }, [editor, konten])

    if (!editor) return null

    return (
        <EditorContent
            editor={editor}
            className={classNames(
                'prose prose-sm max-w-full font-normal dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-h1:text-lg prose-h2:text-base prose-h3:text-sm',
                className,
            )}
        />
    )
}

export default RichTextView
