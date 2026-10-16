const pool = require("./pool");

async function main() {
  const result = await pool.query("SELECT NOW() AS now");
  console.log("Connected. Server time:", result.rows[0].now);
}

main()
  .catch((err) => {
    console.error("Connection failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
