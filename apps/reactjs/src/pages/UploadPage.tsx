import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorAlert } from '../components/common/Alert'
import { Button } from '../components/common/Button'
import { PageHeader } from '../components/common/ui'
import { FileUploader, pickAndValidate } from '../components/documents/FileUploader'
import { FreeAllowanceNotice } from '../components/pricing/FreeAllowanceNotice'
import { DocTypeSelector, LanguageSelector } from '../components/documents/LanguageSelector'
import { api } from '../services/api'
import type { DocType, LangCode } from '../types'
import type { FileKind } from '../lib/validateFile'

export default function UploadPage() {
  const nav = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<FileKind | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [source, setSource] = useState<LangCode>('am')
  const [target, setTarget] = useState<LangCode>('en')
  const [docType, setDocType] = useState<DocType>('other')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function onPick(f: File | undefined) {
    setError(null)
    setFileError(null)
    const res = await pickAndValidate(f)
    if (!res) return
    if ('error' in res) {
      setFile(null)
      setKind(null)
      setFileError(res.error)
      return
    }
    setFile(res.file)
    setKind(res.kind)
  }

  const sameLang = source === target

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file || sameLang) return
    setBusy(true)
    setError(null)
    try {
      const doc = await api.uploadDocument({ file, sourceLang: source, targetLang: target, docType })
      nav(`/documents/${doc.id}/review`)
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="New document"
        title="Upload a document"
        description="PDF, JPG, or PNG, up to 10 MB. Translation does not start until you review the extracted text and click Continue."
      />
      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <FreeAllowanceNotice />
        <FileUploader
          file={file}
          kind={kind}
          error={fileError}
          onPick={(f) => void onPick(f)}
          onClear={() => {
            setFile(null)
            setKind(null)
          }}
          disabled={busy}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <LanguageSelector label="Source language" value={source} onChange={setSource} disabled={busy} />
          <LanguageSelector
            label="Target language"
            value={target}
            onChange={setTarget}
            disabled={busy}
            error={sameLang ? 'Source and target must be different.' : null}
          />
        </div>
        <DocTypeSelector value={docType} onChange={setDocType} disabled={busy} />
        {error != null && <ErrorAlert title="Upload failed" error={error} />}
        <Button type="submit" className="w-full" loading={busy} disabled={!file || sameLang}>
          Continue to extraction review
        </Button>
      </form>
    </div>
  )
}
