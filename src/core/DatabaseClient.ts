// Import necessary libraries
import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

class DatabaseClient {
    private client: Client;

    constructor() {
        this.client = new Client({
            user: process.env.DB_USER || '',
            host: process.env.DB_HOST || '',
            database: process.env.DB_NAME || '',
            password: process.env.DB_PASSWORD || '',
            port: parseInt(process.env.DB_PORT || '5432'),
        });
    }

    // Connect to the database
    async connect() {
        try {
            await this.client.connect();
            console.log('Connected to PostgreSQL database successfully');
        } catch (error) {
            console.error('Database connection error:', (error as Error).message);
            throw error;
        }
    }

    // Disconnect from the database
    async disconnect() {
        try {
            await this.client.end();
            console.log('Disconnected from PostgreSQL database');
        } catch (error) {
            console.error('Database disconnection error:', (error as Error).message);
        }
    }

    // Execute a query
    async query(queryText: string, values?: any[]): Promise<any> {
        try {
            const res = await this.client.query(queryText, values);
            return res;
        } catch (error) {
            console.error('Database query error:', (error as Error).message);
            throw error;
        }
    }
}

export default DatabaseClient;

// Example usage (other programs can import DatabaseClient to perform database operations)

(async () => {
    const dbClient = new DatabaseClient();
    await dbClient.connect();

    try {
        const result = await dbClient.query('SELECT NOW()');
        console.log('Current Time from Database:', result.rows[0]);
    } catch (error) {
        console.error('Error executing query:', (error as Error).message);
    } finally {
        await dbClient.disconnect();
    }
})();
