import { Pool, PoolConfig, QueryResult } from 'pg';
/**
 * Postgres Adapter Class
 * Handles data store and querying 
 */
export class PostgresAdapter {
    private pool: Pool;

    constructor(config: PoolConfig) {
        this.pool = new Pool(config);

        this.pool.on('error', (err: Error) => {
            console.error('PostgresAdapter error: ', err);
        });
        console.log('PostgresAdapter initialized with connection pool');
    } // Constructor //

    // function to test that connected to PG server //
    public async testConnection(): Promise<boolean> {
        try {
            const result: QueryResult = await this.pool.query('SELECT 1 + 1 AS result');
            if(result.rows[0].result === 2) {
                console.log('Databaser connection successful! Test Query result was: 2');
                return true;
            } // if //
            return false;
        } // try //
        catch (error) {
            console.error('Database connection failed: ', error);
            throw new Error('Failed to connect to Postgres database.');
        }
    } // testConnection //

    // General Query function //
    public async query<T>(text: string, params: any[] = []): Promise<T[]> {
        try {
            console.log('\nExecuting query: ${text} with parameters: ${params}');
            const result: QueryResult = await this.pool.query(text, params);
            return result.rows as T[];
        }
        catch(error) {
            console.error('Error executing query: ', error);
            throw error;
        }
    }
} // PostgresAdapter Class //