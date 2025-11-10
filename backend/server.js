
import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const dbPromise = open({
  filename: path.join(__dirname, "db.sqlite3"),
  driver: sqlite3.Database
});

(async () => {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE,
      password TEXT,
      role TEXT
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cameras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  const users = await db.all("SELECT * FROM users");
  if (users.length === 0) {
    await db.run("INSERT INTO users (login,password,role) VALUES ('admin','admin123','Администратор')");
    await db.run("INSERT INTO users (login,password,role) VALUES ('user','user123','Пользователь')");
  }
  const obj = await db.get("SELECT value FROM meta WHERE key='objectName'");
  if (!obj) {
    await db.run("INSERT INTO meta (key,value) VALUES ('objectName', ?)", JSON.stringify('Главный офис'));
  }
})();

app.post("/api/login", async (req,res)=>{
  const { login, password } = req.body;
  const db = await dbPromise;
  const user = await db.get("SELECT * FROM users WHERE login=? AND password=?", [login, password]);
  if (user) res.json(user);
  else res.status(401).json({ error: "Неверный логин или пароль" });
});

// users
app.get("/api/users", async (req,res)=>{
  const db = await dbPromise;
  const rows = await db.all("SELECT * FROM users");
  res.json(rows);
});
app.post("/api/users", async (req,res)=>{
  const { login, password, role } = req.body;
  const db = await dbPromise;
  await db.run("INSERT INTO users (login,password,role) VALUES (?,?,?)", [login,password,role]);
  res.json({ success:true });
});
app.put("/api/users/:id", async (req,res)=>{
  const { id } = req.params;
  const { login, password, role } = req.body;
  const db = await dbPromise;
  await db.run("UPDATE users SET login=?, password=?, role=? WHERE id=?", [login,password,role,id]);
  res.json({ success:true });
});
app.delete("/api/users/:id", async (req,res)=>{
  const db = await dbPromise;
  await db.run("DELETE FROM users WHERE id=?", req.params.id);
  res.json({ success:true });
});

// visitors
app.get("/api/visitors", async (req,res)=>{
  const db = await dbPromise;
  const rows = await db.all("SELECT id, data FROM visitors");
  res.json(rows.map(r=> {
    const obj = JSON.parse(r.data);
    obj.id = r.id;
    return obj;
  }));
});
app.post("/api/visitors", async (req,res)=>{
  const db = await dbPromise;
  await db.run("INSERT INTO visitors (data) VALUES (?)", JSON.stringify(req.body));
  res.json({ success:true });
});
app.put("/api/visitors/:id", async (req,res)=>{
  const db = await dbPromise;
  const { id } = req.params;
  await db.run("UPDATE visitors SET data=? WHERE id=?", [JSON.stringify(req.body), id]);
  res.json({ success:true });
});
app.delete("/api/visitors/:id", async (req,res)=>{
  const db = await dbPromise;
  await db.run("DELETE FROM visitors WHERE id=?", req.params.id);
  res.json({ success:true });
});
app.delete("/api/visitors", async (req,res)=>{
  const db = await dbPromise;
  await db.run("DELETE FROM visitors");
  res.json({ success:true });
});

// cameras
app.get("/api/cameras", async (req,res)=>{
  const db = await dbPromise;
  const rows = await db.all("SELECT id, data FROM cameras");
  res.json(rows.map(r=> { const obj=JSON.parse(r.data); obj.id=r.id; return obj; }));
});
app.post("/api/cameras", async (req,res)=>{
  const db = await dbPromise;
  await db.run("INSERT INTO cameras (data) VALUES (?)", JSON.stringify(req.body));
  res.json({ success:true });
});
app.put("/api/cameras/:id", async (req,res)=>{
  const db = await dbPromise;
  await db.run("UPDATE cameras SET data=? WHERE id=?", [JSON.stringify(req.body), req.params.id]);
  res.json({ success:true });
});
app.delete("/api/cameras/:id", async (req,res)=>{
  const db = await dbPromise;
  await db.run("DELETE FROM cameras WHERE id=?", req.params.id);
  res.json({ success:true });
});

// object meta
app.get("/api/object", async (req,res)=>{
  const db = await dbPromise;
  const row = await db.get("SELECT value FROM meta WHERE key='objectName'");
  res.json({ value: row ? JSON.parse(row.value) : 'Главный офис' });
});
app.put("/api/object", async (req,res)=>{
  const db = await dbPromise;
  await db.run("REPLACE INTO meta (key,value) VALUES ('objectName', ?)", JSON.stringify(req.body.value));
  res.json({ success:true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`✅ Backend running on port ${PORT}`));
