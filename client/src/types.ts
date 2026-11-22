// All API shapes come from the lead-owned contract. Do not redefine them here.
import type { Block, DocStatus, DocType, LangCode } from '@shared/contract'

export type {
  ApiError as ApiErrorBody,
  Block,
  BlockType,
  DocStatus,
  DocType,
  ExtractResponse,
  IssueCompleteRequest,
  IssueCompleteResponse,
  IssueReserveRequest,
  IssueReserveResponse,
  LangCode,
  ReviewRequestResponse,
  ReviewStatus,
  RevokeResponse,
  TranslateRequest,
  TranslateResponse,
  VerifyResponse,
  VerifyResult,
} from '@shared/contract'

/** A public.documents row (supabase/migrations/001_init.sql), camel-cased for the UI. */
export interface DocumentRecord {
  id: string
  ownerId: string
  storagePath: string
  sourceLang: LangCode
  targetLang: LangCode
  docType: DocType | null
  status: DocStatus
  blocksOriginal: Block[] | null
  blocksTranslated: Block[] | null
  createdAt: string
}

/** public.profiles.role. Only the backend can change it. */
export type Role = 'customer' | 'translator'

export interface AuthUser {
  id: string
  email: string
}
