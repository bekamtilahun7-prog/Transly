import { Download, Eye, FileText, ImageIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fileKindOf, fileNameOf, formatDateTime, ownerPathFor } from '../../lib/format'
import { getIssuedVerificationId } from '../../lib/issue'
import type { DocumentRecord } from '../../types'
import { DocTypeBadge, LangPair, StatusBadge } from '../common/StatusBadge'

export function DocumentFileIcon({ name }: { name: string }) {
  const kind = fileKindOf(name)
  if (kind === 'pdf') {
    return (
      <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-red-50 text-[9px] font-bold tracking-wide text-red-600 dark:bg-red-500/15 dark:text-red-300">
        PDF
      </span>
    )
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
      {kind === 'image' ? <ImageIcon size={18} aria-hidden /> : <FileText size={18} aria-hidden />}
    </span>
  )
}

function RowActions({ doc, href }: { doc: DocumentRecord; href?: string }) {
  const issuedId = doc.status === 'issued' ? getIssuedVerificationId(doc.id) : undefined
  const canDownload = Boolean(issuedId)
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        to={href ?? ownerPathFor(doc)}
        aria-label={`Open ${fileNameOf(doc)}`}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-line px-2 text-ink-2 transition duration-150 hover:bg-hover hover:text-ink lg:px-3"
      >
        <Eye size={16} aria-hidden />
        <span className="hidden text-xs font-medium lg:inline">View</span>
      </Link>
      {canDownload ? (
        <Link
          to={`/documents/issued/${issuedId}`}
          aria-label={`Download ${fileNameOf(doc)}`}
          className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink-2 transition duration-150 hover:bg-hover hover:text-ink"
        >
          <Download size={16} aria-hidden />
        </Link>
      ) : (
        <span
          className="inline-flex size-9 items-center justify-center rounded-full border border-line text-disabled"
          title="Download is available after the document is issued."
        >
          <Download size={16} aria-hidden />
          <span className="sr-only">Download unavailable until issued</span>
        </span>
      )}
    </div>
  )
}

/** Compact cards on phones, a table on wide screens. */
export function DocumentList({
  docs,
  hrefFor,
}: {
  docs: DocumentRecord[]
  hrefFor?: (doc: DocumentRecord) => string
}) {
  return (
    <>
      <ul className="divide-y divide-line md:hidden">
        {docs.map((doc) => {
          const name = fileNameOf(doc)
          return (
            <li key={doc.id} className="flex gap-3 py-3.5">
              <DocumentFileIcon name={name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2">
                  <DocTypeBadge type={doc.docType} />
                  <LangPair source={doc.sourceLang} target={doc.targetLang} />
                  <StatusBadge status={doc.status} />
                </p>
                <p className="mt-1.5 text-xs text-ink-2">{formatDateTime(doc.createdAt)}</p>
              </div>
              <RowActions doc={doc} href={hrefFor?.(doc)} />
            </li>
          )
        })}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-medium text-ink-2">
              <th className="px-4 py-3 font-medium">Document Name</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Languages</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Uploaded On</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => {
              const name = fileNameOf(doc)
              return (
                <tr key={doc.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <DocumentFileIcon name={name} />
                      <span className="truncate font-medium text-ink">{name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <DocTypeBadge type={doc.docType} />
                  </td>
                  <td className="px-3 py-3">
                    <LangPair source={doc.sourceLang} target={doc.targetLang} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-2">{formatDateTime(doc.createdAt)}</td>
                  <td className="px-4 py-3">
                    <RowActions doc={doc} href={hrefFor?.(doc)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
