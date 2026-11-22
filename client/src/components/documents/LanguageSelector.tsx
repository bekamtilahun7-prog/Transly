import { useLocale } from '../../context/LocaleContext'
import { DOC_TYPES, LANGUAGES } from '../../lib/constants'
import type { DocType, LangCode } from '../../types'
import { Field, inputClass } from '../common/Input'

export function LanguageSelector({
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  label: string
  value: LangCode
  onChange: (v: LangCode) => void
  error?: string | null
  disabled?: boolean
}) {
  const { t } = useLocale()
  return (
    <Field label={label} error={error}>
      <select className={inputClass} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as LangCode)}>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {t(`langs.${l.code}`)}
            {l.native !== l.label ? ` (${l.native})` : ''}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function DocTypeSelector({
  value,
  onChange,
  disabled,
}: {
  value: DocType
  onChange: (v: DocType) => void
  disabled?: boolean
}) {
  const { t } = useLocale()
  return (
    <Field label={t('upload.docType')}>
      <select className={inputClass} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as DocType)}>
        {DOC_TYPES.map((d) => (
          <option key={d.value} value={d.value}>
            {t(`types.${d.value}`)}
          </option>
        ))}
      </select>
    </Field>
  )
}
