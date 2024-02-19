import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
// import * as db from "./database.js";

const port = process.env.PORT || 3000;

const app = express();

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
    const users = db.all('SELECT * FROM users', []);
    res.json(users);
  } catch(err){
    res.status(400).json({"error": err.message});
    return;
  }

})

app.post("/users", async (req, res) => {

})

app.listen(port, () => {
  console.log(`Example REST Express app listening at http://localhost:${port}`);
});
