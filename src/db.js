import { Dexie } from 'dexie';

export const db = new Dexie('KSF_Inventory_DB');

db.version(1).stores({
  rolls: '++id, product_id, status, created_at, synced', 
  materials: '++id, name'
});