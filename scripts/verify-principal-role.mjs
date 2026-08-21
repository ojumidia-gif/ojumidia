import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute(
  "SELECT id, email, role FROM users WHERE email IN (?, ?)",
  ["ojumidia@gmail.com", "aquinopratesr@gmail.com"],
);
console.log(JSON.stringify(rows));
await connection.end();
