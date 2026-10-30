import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Report } from '../../types/report';

const COLLECTION = 'reports';

/** Create a new report. The caller must provide the full Report object including `id`. */
export async function createReport(report: Report): Promise<void> {
  await setDoc(doc(db, COLLECTION, report.id), report);
}

/** Fetch a single report by ID. Returns null if not found. */
export async function getReport(id: string): Promise<Report | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? (snap.data() as Report) : null;
}

/** Update specific fields on a report. */
export async function updateReport(
  id: string,
  fields: Partial<Report>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

/** Fetch all reports linked to a specific incident. */
export async function getReportsByIncident(incidentId: string): Promise<Report[]> {
  const q = query(
    collection(db, COLLECTION),
    where('incidentId', '==', incidentId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Report);
}

/**
 * Fetch reports near a location within a rough bounding box.
 *
 * Firestore doesn't support geo queries natively, so we query a
 * lat range first, then filter lng in-memory. Good enough for
 * the ~150 m duplicate detection radius (~0.0015° at Mysuru's latitude).
 */
export async function getReportsNearby(
  lat: number,
  lng: number,
  radiusDeg: number = 0.0015,
): Promise<Report[]> {
  const q = query(
    collection(db, COLLECTION),
    where('location.lat', '>=', lat - radiusDeg),
    where('location.lat', '<=', lat + radiusDeg),
    orderBy('location.lat'),
  );
  const snap = await getDocs(q);

  // Second-pass filter on longitude (Firestore can only range-filter one field).
  return snap.docs
    .map((d) => d.data() as Report)
    .filter((r) => Math.abs(r.location.lng - lng) <= radiusDeg);
}

/** Fetch reports flagged for human review (high suspicion score). */
export async function getReviewQueueReports(threshold: number = 60): Promise<Report[]> {
  const q = query(
    collection(db, COLLECTION),
    where('fakeScore', '>=', threshold),
    orderBy('fakeScore', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Report);
}

/** Fetch all reports, ordered by creation time (newest first). */
export async function getAllReports(): Promise<Report[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Report);
}

