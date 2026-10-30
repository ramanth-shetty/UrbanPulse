declare module 'firebase/app' {
  export interface FirebaseApp {
    name: string;
    options: Record<string, any>;
  }
  export function initializeApp(options: Record<string, any>): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function getApp(): FirebaseApp;
}

declare module 'firebase/firestore' {
  export interface Firestore {
    type: string;
    app: any;
  }

  export interface DocumentData {
    [field: string]: any;
  }

  export interface DocumentReference<T = DocumentData> {
    id: string;
    path: string;
  }

  export interface CollectionReference<T = DocumentData> {
    id: string;
    path: string;
  }

  export interface Query<T = DocumentData> {
    type: string;
  }

  export interface DocumentSnapshot<T = DocumentData> {
    id: string;
    exists(): boolean;
    data(): T | undefined;
  }

  export interface QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> {
    data(): T;
  }

  export interface QuerySnapshot<T = DocumentData> {
    docs: QueryDocumentSnapshot<T>[];
    size: number;
    empty: boolean;
  }

  export interface WriteBatch {
    set<T>(documentRef: DocumentReference<T>, data: T): WriteBatch;
    update(documentRef: DocumentReference<any>, data: Record<string, any>): WriteBatch;
    delete(documentRef: DocumentReference<any>): WriteBatch;
    commit(): Promise<void>;
  }

  export function getFirestore(app?: any): Firestore;
  export function collection(firestore: Firestore, path: string, ...pathSegments: string[]): CollectionReference;
  export function doc(firestore: Firestore, path: string, ...pathSegments: string[]): DocumentReference;
  export function getDoc<T = DocumentData>(reference: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
  export function getDocs<T = DocumentData>(query: Query<T> | CollectionReference<T>): Promise<QuerySnapshot<T>>;
  export function setDoc<T = DocumentData>(reference: DocumentReference<T>, data: T): Promise<void>;
  export function updateDoc(reference: DocumentReference<any>, data: Record<string, any>): Promise<void>;
  export function query<T = DocumentData>(query: Query<T> | CollectionReference<T>, ...queryConstraints: any[]): Query<T>;
  export function where(fieldPath: string, opStr: string, value: any): any;
  export function orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): any;
  export function writeBatch(firestore: Firestore): WriteBatch;

  export class Timestamp {
    readonly seconds: number;
    readonly nanoseconds: number;
    constructor(seconds: number, nanoseconds: number);
    static now(): Timestamp;
    static fromDate(date: Date): Timestamp;
    static fromMillis(milliseconds: number): Timestamp;
    toDate(): Date;
    toMillis(): number;
    toISOString(): string;
  }
}

declare module 'firebase/storage' {
  export interface FirebaseStorage {
    app: any;
    maxOperationRetryTime: number;
  }

  export interface StorageReference {
    name: string;
    bucket: string;
    fullPath: string;
  }

  export interface UploadMetadata {
    contentType?: string;
    customMetadata?: Record<string, string>;
  }

  export interface UploadResult {
    ref: StorageReference;
    metadata: any;
  }

  export function getStorage(app?: any): FirebaseStorage;
  export function ref(storage: FirebaseStorage, url?: string): StorageReference;
  export function uploadBytes(ref: StorageReference, data: Blob | Uint8Array | ArrayBuffer, metadata?: UploadMetadata): Promise<UploadResult>;
  export function getDownloadURL(ref: StorageReference): Promise<string>;
}
