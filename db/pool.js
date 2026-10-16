const { Pool, types } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

types.setTypeParser(1082, (value) => value);

if (!globalThis.pgPool) {
  globalThis.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
  });

  globalThis.pgPool.on("error", (err) => {
    console.error("Unexpected PG pool error:", err.message);
  });
}

module.exports = globalThis.pgPool;
