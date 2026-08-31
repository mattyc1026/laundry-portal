/* ==========================================================================
   Firebase

   Points at the household's existing Realtime Database project, recovered
   from the previous deployment so the portal keeps the same backend.

   The config is readable in the shipped bundle. That is normal and
   unavoidable for any browser app: a Firebase web config is an address, not
   a secret. What actually controls access is database.rules.json in the
   project root.
   ========================================================================== */

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const RECOVERED = {
  apiKey: 'AIzaSyA4NNrqUUtBauTdmoY74IoMD2LsiSeOeHI',
  authDomain: 'laundry-portal-12662.firebaseapp.com',
  databaseURL: 'https://laundry-portal-12662-default-rtdb.firebaseio.com',
  projectId: 'laundry-portal-12662',
  storageBucket: 'laundry-portal-12662.firebasestorage.app',
  messagingSenderId: '878416504727',
  appId: '1:878416504727:web:873fc06c2f11121f3b06d2',
};

/* Environment variables win, so the project can be pointed elsewhere without
   editing source. Anything not supplied falls back to the recovered values. */
const config = {
  apiKey: import.meta.env?.VITE_FB_API_KEY || RECOVERED.apiKey,
  authDomain: import.meta.env?.VITE_FB_AUTH_DOMAIN || RECOVERED.authDomain,
  databaseURL: import.meta.env?.VITE_FB_DATABASE_URL || RECOVERED.databaseURL,
  projectId: import.meta.env?.VITE_FB_PROJECT_ID || RECOVERED.projectId,
  storageBucket: import.meta.env?.VITE_FB_STORAGE_BUCKET || RECOVERED.storageBucket,
  messagingSenderId: import.meta.env?.VITE_FB_SENDER_ID || RECOVERED.messagingSenderId,
  appId: import.meta.env?.VITE_FB_APP_ID || RECOVERED.appId,
};

let db = null;

/** Lazily initialised so a misconfigured project cannot stop the app booting. */
export function database() {
  if (db) return db;
  try {
    db = getDatabase(initializeApp(config));
    return db;
  } catch (error) {
    console.error('Firebase failed to initialise. Running local only.', error);
    return null;
  }
}

/** Where this build reads and writes. Bumping this starts a clean tree. */
export const ROOT = import.meta.env?.VITE_FB_ROOT || 'portal/v3';
