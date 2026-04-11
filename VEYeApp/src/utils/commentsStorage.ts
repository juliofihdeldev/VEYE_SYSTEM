import firestore from '@react-native-firebase/firestore'
import auth from '@react-native-firebase/auth'
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'

/**
 * Collection `VeyeComments`: `threadId`, `text`, `userId`, `createdAt` (server), optional `sortTime` (ms),
 * optional `parentId` (nested replies), optional `likedUserIds` (string[] of uid who liked).
 * Query is only `where('threadId')` — we sort in JS so new posts show immediately (serverTimestamp + orderBy delays visibility).
 */
const COLLECTION = 'VeyeComments'

export type StoredComment = {
  id: string
  text: string
  createdAt: number
  isSelf: boolean
  /** Firestore parent comment id; undefined/null = top-level */
  parentId?: string | null
  likeCount: number
  likedBySelf: boolean
}

export type CommentListRow = {
  comment: StoredComment
  depth: number
}

function currentUid(): string | undefined {
  return auth().currentUser?.uid
}

function toMillis(ts: FirebaseFirestoreTypes.Timestamp | Date | number | null | undefined): number {
  if (ts == null) return Date.now()
  if (typeof ts === 'number') return ts
  if (ts instanceof Date) return ts.getTime()
  if (typeof (ts as FirebaseFirestoreTypes.Timestamp).toMillis === 'function') {
    return (ts as FirebaseFirestoreTypes.Timestamp).toMillis()
  }
  return Date.now()
}

function mapDoc(
  doc: FirebaseFirestoreTypes.QueryDocumentSnapshot,
  uid: string | undefined,
): StoredComment {
  const d = doc.data() as {
    text?: string
    userId?: string
    createdAt?: FirebaseFirestoreTypes.Timestamp
    sortTime?: number
    parentId?: string
    likedUserIds?: unknown
  }
  const createdAt =
    typeof d.sortTime === 'number' ? d.sortTime : toMillis(d.createdAt)
  const parentId =
    typeof d.parentId === 'string' && d.parentId.length > 0 ? d.parentId : null
  const likedRaw = d.likedUserIds
  const likedUserIds = Array.isArray(likedRaw)
    ? likedRaw.filter((x): x is string => typeof x === 'string')
    : []
  return {
    id: doc.id,
    text: typeof d.text === 'string' ? d.text : '',
    createdAt,
    isSelf: !!uid && d.userId === uid,
    parentId,
    likeCount: likedUserIds.length,
    likedBySelf: !!uid && likedUserIds.includes(uid),
  }
}

function sortByCreatedAt(a: StoredComment, b: StoredComment): number {
  const t = a.createdAt - b.createdAt
  return t !== 0 ? t : a.id.localeCompare(b.id)
}

/**
 * Order comments for display: each top-level comment, then its subtree (by time), recursively.
 * Orphan replies (parent missing from this thread load) surface as roots.
 */
export function flattenCommentThread(items: StoredComment[]): CommentListRow[] {
  const byId = new Map(items.map(c => [c.id, c]))
  const children = new Map<string | null, StoredComment[]>()

  for (const c of items) {
    let key: string | null = c.parentId ?? null
    if (key != null && !byId.has(key)) key = null
    if (!children.has(key)) children.set(key, [])
    children.get(key)!.push(c)
  }
  for (const [, list] of children) {
    list.sort(sortByCreatedAt)
  }

  const rows: CommentListRow[] = []
  const walk = (parentKey: string | null, depth: number) => {
    const list = children.get(parentKey) ?? []
    for (const c of list) {
      rows.push({ comment: c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return rows
}

export async function loadComments(threadId: string): Promise<StoredComment[]> {
  const uid = currentUid()
  const snap = await firestore().collection(COLLECTION).where('threadId', '==', threadId).get()
  return snap.docs.map(d => mapDoc(d, uid)).sort(sortByCreatedAt)
}

export async function getCommentCount(threadId: string): Promise<number> {
  try {
    const agg = await firestore()
      .collection(COLLECTION)
      .where('threadId', '==', threadId)
      .count()
      .get()
    return agg.data().count
  } catch {
    const snap = await firestore()
      .collection(COLLECTION)
      .where('threadId', '==', threadId)
      .get()
    return snap.size
  }
}

export async function appendComment(
  threadId: string,
  text: string,
  _isSelf: boolean,
  parentId?: string | null,
): Promise<StoredComment[]> {
  const uid = currentUid()
  const trimmed = text.trim()
  if (!trimmed) return loadComments(threadId)
  if (!uid) return loadComments(threadId)

  const sortTime = Date.now()
  const parent = typeof parentId === 'string' && parentId.length > 0 ? parentId : null
  await firestore().collection(COLLECTION).add({
    threadId,
    text: trimmed,
    userId: uid,
    createdAt: firestore.FieldValue.serverTimestamp(),
    sortTime,
    likedUserIds: [],
    ...(parent ? { parentId: parent } : {}),
  })
  return loadComments(threadId)
}

/** Toggle current user's like on a comment (Instagram-style); realtime listener updates UI. */
export async function toggleCommentLike(commentId: string): Promise<void> {
  const uid = currentUid()
  if (!uid || !commentId) return
  const ref = firestore().collection(COLLECTION).doc(commentId)
  const snap = await ref.get()
  if (!snap.exists) return
  const data = snap.data() as { likedUserIds?: unknown }
  const raw = data.likedUserIds
  const list = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
  const has = list.includes(uid)
  await ref.update({
    likedUserIds: has
      ? firestore.FieldValue.arrayRemove(uid)
      : firestore.FieldValue.arrayUnion(uid),
  })
}

/** Real-time thread updates; unsubscribe when the modal closes. */
export function subscribeComments(
  threadId: string,
  onUpdate: (items: StoredComment[]) => void,
  onError?: (e: Error) => void,
): () => void {
  const q = firestore().collection(COLLECTION).where('threadId', '==', threadId)

  return q.onSnapshot(
    snap => {
      const uid = currentUid()
      onUpdate(snap.docs.map(d => mapDoc(d, uid)).sort(sortByCreatedAt))
    },
    err => {
      onError?.(err as Error)
    },
  )
}

export function alertCommentsThreadId(alert: { id?: string; fullName?: string; date?: any }): string {
  if (alert?.id) return `alert:${alert.id}`
  const d = alert?.date?.toDate ? alert.date.toDate().getTime() : String(alert?.date ?? '')
  return `alert:${encodeURIComponent(`${alert?.fullName ?? 'unknown'}_${d}`)}`
}

export function zoneCommentsThreadId(zone: { id?: string }): string {
  return zone?.id ? `zone:${zone.id}` : `zone:unknown`
}
