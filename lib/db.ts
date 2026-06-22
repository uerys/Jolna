import mysql, {
  type FieldPacket,
  type Pool,
  type QueryResult,
} from "mysql2/promise";

declare global {
  var mysqlPool: Pool | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  }

  if (!globalThis.mysqlPool) {
    globalThis.mysqlPool = mysql.createPool(connectionString);
  }

  return globalThis.mysqlPool;
}

export function query<T extends QueryResult = QueryResult>(
  text: string,
  params: unknown[] = []
): Promise<[T, FieldPacket[]]> {
  return getPool().query<T>(text, params);
}
