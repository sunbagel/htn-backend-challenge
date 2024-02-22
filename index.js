import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as dbFunctions from "./database.js";

const port = process.env.PORT || 3000;

const app = express();
app.use(express.json())

// Open db connection
const db = await open({
  filename: './hackers.db',
  driver: sqlite3.Database
})

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/users", async (req, res) => {
  try {
    const users = await dbFunctions.getUsers();

    for(const user of users){

      const skills = await dbFunctions.getUserSkills(user.id);
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
    const user = await dbFunctions.getUserByID(user.id);
    const skills = await dbFunctions.getUserSkills(user.id);
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
    const userResult = await dbFunctions.createUser(name, email, phone, checked_in);
    const userID = userResult.lastID;


    await dbFunctions.addUserSkills(db, userID, skills);

    await db.run("COMMIT");
    res.status(201).json( {  
                            message : "Successfully created user",
                            userID : userID
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

  // check if either fields are present and populated
  const isUserUpdatesEmpty = userUpdates == null || Object.keys(userUpdates).length === 0;
  const isSkillsUpdatesEmpty = skillsUpdates == null || Object.keys(skillsUpdates).length === 0;

  if (isUserUpdatesEmpty && isSkillsUpdatesEmpty) {
    // No meaningful updates provided, return an error response
    res.status(422).json({ error: "No updates provided or updates are empty." });
    return;
  }
  await db.run("BEGIN TRANSACTION");
  // general user info (ex. name, email, phone)
  if(!isUserUpdatesEmpty){

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
      // set user general data
      const userRes = await dbFunctions.updateUser(values, userID);
      if(userRes.changes === 0){
        return res.status(404).json({ error: 'User not found.' });
      }
    }catch(err){
      await db.run("ROLLBACK");
      res.status(400).json({error: `Error updating user. Something went wrong updating their general details: ${err.message}`});
    }
  }
  
  // update skills
  if(!isSkillsUpdatesEmpty){
    console.log(skillsUpdates);
    try{
      const { add : skillsToAdd, remove: skillsToRemove, update: skillsToUpdate } = skillsUpdates;
      // add skill (CAN MAKE OWN FUNCTION)
      if(skillsToAdd != null){
        try{
          await dbFunctions.addUserSkills(db, userID, skillsToAdd);
        } catch (err){
          await db.run("ROLLBACK");

          // error handling
          if (err.message.includes("UNIQUE constraint failed")) {
            return res.status(400).json({ error: "Duplicate skill entry." });
          } else {
            // Handle other types of errors
            return res.status(500).json({ error: "Failed to add skill." });
          }
        }
        
      }

      // remove skill from user
      if(skillsToRemove != null){
        await dbFunctions.removeUserSkills(db, userID, skillsToRemove);
      }

      if(skillsToUpdate != null){
        await dbFunctions.updateUserSkills(db, userID, skillsToUpdate);
      }
      
      await db.run("COMMIT");
      res.status(200).json({message : `User ${userID} updated successfully.`});

    } catch (err) {
      await db.run("ROLLBACK");
      res.status(500).json({error : `Error updating user. Something went wrong updating the skills: ${err.message}`});
      return;
    }
  }
})


app.get("/skills", async (req, res) => {

  const {min_frequency, max_frequency} = req.query;

  let frequencyValues = [];
  let frequencyQueries = [];

  if(min_frequency != null){
    frequencyValues.push( parseInt(min_frequency, 10));
    frequencyQueries.push("frequency >= ?");
  }

  if(max_frequency != null){
    frequencyValues.push( parseInt(max_frequency, 10));
    frequencyQueries.push("frequency <= ?");
  }

  // create WHERE clause if frequency queries are present
  const whereClause = frequencyQueries.length ? `WHERE ${frequencyQueries.join(' AND ')}` : '';
  try {
    const skills = await dbFunctions.getSkills(whereClause, frequencyValues);
    res.json(skills);
  } catch(err){
    res.status(400).json({error: err.message});
    return;
  }

})

app.get("/skills/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const skill = await dbFunctions.getSkillByID(id);
    res.json(skill);
  } catch(err){
    res.status(400).json({error: err.message});
    return;
  }

})

app.post("/skills", async (req, res) => {
  const { name, frequency = 0 } = req.body;
  // type checking
  if(name == null || frequency == null){
    res.status(422).json({error: "Name and frequency fields aren't found"});
    return;
  }
  try {
    const query = `INSERT INTO skills (name, frequency)
                      VALUES (?,?)`;

    const result = await db.run(query, [name, frequency]);

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
