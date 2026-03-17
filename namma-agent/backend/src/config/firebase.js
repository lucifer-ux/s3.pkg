import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

export const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      
      if (!serviceAccountPath) {
        console.error('[Firebase] FIREBASE_SERVICE_ACCOUNT_PATH not set in environment');
        throw new Error('Firebase service account path not configured');
      }

      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      db = admin.firestore();
      db.settings({ ignoreUndefinedProperties: true });

      console.log('[Firebase] Firebase Admin initialized successfully');
    }

    db = admin.firestore();
    return { admin, db };
  } catch (error) {
    console.error('[Firebase] Initialization error:', error.message);
    throw error;
  }
};

export const getFirestore = () => {
  if (!db) {
    const { db: firestoreDb } = initializeFirebase();
    db = firestoreDb;
  }
  return db;
};

export { admin };
