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
} from 'firebase/firestore';
import { db } from '../firebase';
import { Incident } from '../../types/incident';
import { Department } from '../../types/department';

const COLLECTION = 'incidents';

/** Create a new incident. The caller must provide the full Incident object including `id`. */
export async function createIncident(incident: Incident): Promise<void> {
  await setDoc(doc(db, COLLECTION, incident.id), incident);
}

/** Fetch a single incident by ID. Returns null if not found. */
export async function getIncident(id: string): Promise<Incident | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? (snap.data() as Incident) : null;
}

/** Update specific fields on an incident. */
export async function updateIncident(
  id: string,
  fields: Partial<Incident>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...fields,
    updatedAt: new Date().toISOString(),
  });
}

/** Fetch all incidents, sorted by priority (highest first). */
export async function getAllIncidents(): Promise<Incident[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy('priorityScore', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Incident);
}

/** Fetch incidents filtered by lead department. */
export async function getIncidentsByDepartment(dept: Department): Promise<Incident[]> {
  const q = query(
    collection(db, COLLECTION),
    where('leadDepartment', '==', dept),
    orderBy('priorityScore', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Incident);
}

/** Fetch incidents by status (e.g. for the admin review queue). */
export async function getIncidentsByStatus(status: string): Promise<Incident[]> {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', status),
    orderBy('priorityScore', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Incident);
}

/**
 * Find incidents near a location for duplicate/cluster detection.
 * Same bounding-box approach as reports — query lat, filter lng in-memory.
 */
export async function getIncidentsNearby(
  lat: number,
  lng: number,
  radiusDeg: number = 0.0015,
): Promise<Incident[]> {
  const q = query(
    collection(db, COLLECTION),
    where('location.lat', '>=', lat - radiusDeg),
    where('location.lat', '<=', lat + radiusDeg),
    orderBy('location.lat'),
  );
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => d.data() as Incident)
    .filter((inc) => Math.abs(inc.location.lng - lng) <= radiusDeg);
}

