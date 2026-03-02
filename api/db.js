import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.warn('[DB] MONGODB_URI not set — audit logging disabled');
}

let client;
let clientPromise;

// Reuse connection across hot-reloaded serverless invocations
if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri || '', {
            connectTimeoutMS: 5000,
            socketTimeoutMS: 5000
        });
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    client = new MongoClient(uri || '', {
        connectTimeoutMS: 5000,
        socketTimeoutMS: 5000
    });
    clientPromise = client.connect();
}

/**
 * Returns the wellness MongoDB database (or null if MONGODB_URI not set).
 */
export async function getDb() {
    if (!uri) return null;
    try {
        const c = await clientPromise;
        return c.db('wellness');
    } catch (err) {
        console.error('[DB] Connection failed:', err.message);
        return null;
    }
}
