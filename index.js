import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
// import * as db from "./database.js";

const port = process.env.PORT || 3000;

const app = express();
app.use(express.json())

// Create a database if none exists
const db = await open({
  filename: './hackers.db',
  driver: sqlite3.Database
})

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/users", async (req, res) => {
  try {
    const users = await db.all('SELECT * FROM users');
    res.json(users);
  } catch(err){
    res.status(400).json({error: err.message});
    return;
  }

})

app.post("/users", async (req, res) => {
  const { name, email, phone, checked_in } = req.body;
  // type checking
  if(name == null || email == null || phone == null || checked_in == null){
    res.status(422).json({error: "Missing fields"});
    return;
  }
  try {
    const query = `INSERT INTO users (name, email, phone, checked_in)
                      VALUES (?,?,?,?)`;

    const result = await db.run(query, [name, email, phone, checked_in]);
    res.status(201).json({  message : "Successfully created user",
                            id : result.lastID
                        });
  } catch (err){
    res.status(500).json({error: err.message})
  }
})


app.get("/skills", async (req, res) => {
  try {
    const skills = await db.all('SELECT * FROM skills', []);
    res.json(skills);
  } catch(err){
    res.status(400).json({error: err.message});
    return;
  }

})

app.get("/skills/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const skill = await db.get('SELECT * FROM skills WHERE id = ?', [id]);
    res.json(skill);
  } catch(err){
    res.status(400).json({error: err.message});
    return;
  }

})

app.post("/skills", async (req, res) => {
  const { name, quantity } = req.body;
  // type checking
  if(name == null || quantity == null){
    res.status(422).json({error: "Name and quantity fields aren't found"});
    return;
  }
  try {
    const query = `INSERT INTO skills (name, quantity)
                      VALUES (?,?)`;

    const result = await db.run(query, [name, quantity]);
    res.status(201).json({  message : "Successfully created skill",
                            id : result.lastID
                        });
  } catch (err){
    res.status(500).json({error: err.message})
  }
})

app.listen(port, () => {
  console.log(`Example REST Express app listening at http://localhost:${port}`);
});
