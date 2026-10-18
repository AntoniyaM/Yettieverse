import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let db: Firestore | null = null

// The Firestore Admin client, set up on first use from the NUXT_FIREBASE_* env vars.
// The Admin SDK bypasses security rules, so the rules can (and should) deny everything else.
export const firestore = () => {
  if (db) return db
  const { projectId, clientEmail, privateKey } = useRuntimeConfig().firebase
  if (!projectId || !clientEmail || !privateKey)
    throw createError({ statusCode: 503, statusMessage: 'Cloud saves are not configured' })
  const app =
    getApps()[0] ??
    initializeApp({
      // Env files and hosting dashboards often keep the key's line breaks as literal "\n".
      credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }),
    })
  db = getFirestore(app)
  return db
}

// One document per save, with the save code as its ID.
export const saveDoc = (code: string) => firestore().collection('save_codes').doc(code)
