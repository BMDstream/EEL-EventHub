const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;
console.log("Connecting using JS serverless driver...");

async function run() {
  try {
    const sql = neon(dbUrl);
    
    console.log("\n--- Checking event table columns ---");
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'event'`;
    console.log("Columns:");
    cols.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type})`);
    });

    console.log("\n--- Checking users ---");
    const users = await sql`SELECT id, email, role, is_active FROM "user"`;
    console.log("Users:");
    users.forEach(u => {
      console.log(`  User ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Active: ${u.is_active}`);
    });

    console.log("\n--- Checking events ---");
    const events = await sql`SELECT id, slug, title FROM event`;
    console.log("Events:");
    events.forEach(e => {
      console.log(`  Event: ${e.title} (slug: ${e.slug})`);
    });
  } catch (err) {
    console.error("Query failed:", err);
  }
}

run();
