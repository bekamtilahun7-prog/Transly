import { Camera, FileUp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocale } from '../../context/LocaleContext'
import { formatBytes } from '../../lib/format'
import { validateFile, type FileKind } from '../../lib/validateFile'
import { Alert } from '../common/Alert'
import { Button } from '../common/Button'

export function FileUploader({
  file,
  kind,
  error,
  onPick,
  onClear,
  disabled,
}: {
  file: File | null
  kind: FileKind | null
  error: string | null
  onPick: (f: File | undefined) => void
  onClear: () => void
  disabled?: boolean
}) {
  const { t } = useLocale()
  const cameraRef = useRef<HTMLInputElement>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file || kind === 'pdf') {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file, kind])

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="secondary" disabled={disabled} icon={<Camera size={18} />} onClick={() => cameraRef.current?.click()}>
          {t('ui.photo')}
        </Button>
        <Button type="button" variant="secondary" disabled={disabled} icon={<FileUp size={18} />} onClick={() => pickRef.current?.click()}>
          {t('ui.chooseFile')}
        </Button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        hidden
        onChange={(e) => {
          onPick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={pickRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
        hidden
        onChange={(e) => {
          onPick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {error && <Alert tone="error" title={t('ui.fileReject')}>{error}</Alert>}
      {file && (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-bg-2 p-3">
          {preview ? (
            <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-600">PDF</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{file.name}</p>
            <p className="text-xs text-ink-2">
              {formatBytes(file.size)}
              {kind ? ` · ${kind.toUpperCase()}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            aria-label={t('ui.removeFile')}
            className="flex size-9 items-center justify-center rounded-full text-ink-2 hover:bg-hover hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export async function pickAndValidate(file: File | undefined): Promise<{ file: File; kind: FileKind } | { error: string } | null> {
  if (!file) return null
  const res = await validateFile(file)
  if (!res.ok) return { error: res.error ?? 'Invalid file.' }
  return { file, kind: res.kind ?? 'pdf' }
}
