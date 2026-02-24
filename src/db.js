import Dexie from 'dexie';

export const db = new Dexie('KSF_Inventory_DB');

// Define the schema: id is the primary key
db.version(1).stores({
  rolls: '++id, product_id, status, customer_name, created_at, synced', 
  materials: '++id, name'
});