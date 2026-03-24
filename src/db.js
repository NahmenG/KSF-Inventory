import { Dexie } from 'dexie';

export const db = new Dexie('KSF_Inventory_DB');

// Upgrade to version 2
db.version(2).stores({
  // product_id is the primary key. This KILLS duplicates instantly.
  rolls: 'product_id, status, created_at, synced', 
  materials: '++id, name'
});