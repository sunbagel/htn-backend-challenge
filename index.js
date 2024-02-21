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

    for(const user of users){

      const query = `SELECT s.name, us.rating
                      FROM users_skills us
                      JOIN skills s ON us.skill_id = s.id
                      WHERE us.user_id = ?`;
      const skills = await db.all(query, [user.id]);
      user.skills = skills;

    }


    res.json(users);
  } catch(err){
    res.status(500).json({error: err.message});
    return;
  }

})

app.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);

    const query = `SELECT s.name, us.rating
                    FROM users_skills us
                    JOIN skills s ON us.skill_id = s.id
                    WHERE us.user_id = ?`;

    const skills = await db.all(query, [user.id]);
    user.skills = skills;

    res.json(user);
  } catch(err){
    res.status(500).json({error: err.message});
    return;
  }

})

app.post("/users", async (req, res) => {
  const { name, email, phone, checked_in, skills } = req.body;
  // type checking
  if(name == null || email == null || phone == null || checked_in == null || skills == null){
    res.status(422).json({error: "Missing fields"});
    return;
  }
  try {
    await db.run("BEGIN TRANSACTION")

    const userQuery = `INSERT INTO users (name, email, phone, checked_in)
                      VALUES (?,?,?,?)`;

    const userResult = await db.run(userQuery, [name, email, phone, checked_in]);
    const userID = userResult.lastID;


    for(const skill of skills){
      // need skill validation
      // skill has name, rating
      let skillID;
      const existingSkill = await db.get("SELECT id FROM skills WHERE name = ?", [skill.name]);

      // if skill exists
      if(existingSkill){
        skillID = existingSkill.id;
      } else {

        // if skill doesn't exist, create new skill
        const skillQuery = `INSERT INTO skills (name)
                            VALUES (?)`;
        const skillResult = await db.run(skillQuery, [skill.name]);
        skillID = skillResult.lastID;
      }

      // insert row for user/skill relationship
      const associativeQuery = `INSERT INTO users_skills (user_id, skill_id, rating)
                                VALUES (?,?,?)`;

      await db.run(associativeQuery, [userID, skillID, skill.rating]);

    }

    await db.run("COMMIT");
    res.status(201).json( {  
                            message : "Successfully created user",
                            userID : userID,
                          }
    );
    
      
  } catch (err){
    await db.run("ROLLBACK")
    res.status(500).json({error: err.message})
  }
})

app.put("/users/:userID", async (req, res) => {
  
  const userID = req.params.userID;
  const { userUpdates } = req.body;
  const { skillsUpdates } = req.body;

  const filteredBody = Object.keys(userUpdates).reduce((acc, key) => {

    if(userUpdates[key] != null){
      acc[key] = userUpdates[key];
    }

    return acc;
  }, {})

  // array of clauses for setting
  const setClause = Object.keys(filteredBody).map(key => `${key} = ?`).join(', ');
  // array of values
  const values = Object.values(filteredBody);

  try {
    await db.run("BEGIN TRANSACTION");

    // set user general data
    const userRes = await db.run(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, userID]);
    if(userRes.changes === 0){
      return res.status(404).json({ error: 'User not found.' });
    }

    // set user skills
    const { add : skillsToAdd, update: skillsToUpdate, remove: skillsToRemove } = skillsUpdates;
    // add skill (CAN MAKE OWN FUNCTION)
    if(skillsToAdd != null){
      for(const skill of skillsToAdd){
        // need skill validation
        // skill has name, rating
        let skillID;
        const existingSkill = await db.get("SELECT id FROM skills WHERE name = ?", [skill.name]);
  
        // if skill exists
        if(existingSkill){
          skillID = existingSkill.id;
        } else {
  
          // if skill doesn't exist, create new skill
          const skillQuery = `INSERT INTO skills (name)
                              VALUES (?)`;
          const skillResult = await db.run(skillQuery, [skill.name]);
          skillID = skillResult.lastID;
        }
  
        // insert row for user/skill relationship
        const associativeQuery = `INSERT INTO users_skills (user_id, skill_id, rating)
                                  VALUES (?,?,?)`;
  
        await db.run(associativeQuery, [userID, skillID, skill.rating]);
  
      }
    }

    // remove skill from user
    if(skillsToAdd != null){
      for(const skill of skillsToRemove){
        const skillRes = await db.get("SELECT id FROM skills WHERE name = ?", [skill.name]);
        const skillID = skillRes.id;
        await db.run("DELETE FROM users_skills WHERE user_id = ? AND skill_id = ?", [userID, skillID]);
      }
    }
    


    await db.run("COMMIT");
    res.status(200).json({message : `User ${userID} updated successfully.`});

  } catch (err) {
    await db.run("ROLLBACK");
    res.status(500).json({error : err.message});
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
  const { name, quantity = 0 } = req.body;
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
