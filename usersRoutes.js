import express from 'express';
import * as dbFunctions from "./database.js";


const router = express.Router();

router.get("/users", async (req, res) => {
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

router.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const user = await dbFunctions.getUserByID(id);
    const skills = await dbFunctions.getUserSkills(id);
    user.skills = skills;

    res.json(user);
  } catch(err){
    res.status(500).json({error: err.message});
    return;
  }

})

router.post("/users", async (req, res) => {
  const { name, email, phone, checked_in, skills } = req.body;
  // type checking
  if(name == null || email == null || phone == null || checked_in == null || skills == null){
    res.status(422).json({error: "Missing fields"});
    return;
  }
  try {
    await dbFunctions.beginTransaction();
    const userResult = await dbFunctions.createUser(name, email, phone, checked_in);
    const userID = userResult.lastID;


    await dbFunctions.addUserSkills(userID, skills);

    await dbFunctions.commitTransaction();
    res.status(201).json( {  
                            message : "Successfully created user",
                            userID : userID
                          }
    );
    
      
  } catch (err){
    await dbFunctions.rollbackTransaction();
    res.status(500).json({error: err.message})
  }
})

router.put("/users/:userID", async (req, res) => {
  
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
  await dbFunctions.beginTransaction();
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
      const userRes = await dbFunctions.updateUser(setClause, values, userID);
      if(userRes.changes === 0){
        return res.status(404).json({ error: 'User not found.' });
      }
    }catch(err){
      await dbFunctions.rollbackTransaction();
      res.status(400).json({error: `Error updating user. Something went wrong updating their general details: ${err.message}`});
    }
  }
  
  // update skills
  if(!isSkillsUpdatesEmpty){

    try{
      const { add : skillsToAdd, remove: skillsToRemove, update: skillsToUpdate } = skillsUpdates;

      if(skillsToAdd != null){

        try{
          await dbFunctions.addUserSkills(userID, skillsToAdd);

        } catch (err){
          await dbFunctions.rollbackTransaction();

          // error handling
          if (err.message.includes("UNIQUE constraint failed")) {
            return res.status(400).json({ error: "Duplicate skill entry." });
          } else {
            // Handle other types of errors
            return res.status(500).json({ error: `Failed to add skill. ${err.message}` });
          }
        }
        
      }

      // remove skill from user
      if(skillsToRemove != null){
        await dbFunctions.removeUserSkills(userID, skillsToRemove);
      }

      if(skillsToUpdate != null){
        await dbFunctions.updateUserSkills(userID, skillsToUpdate);
      }
      
      await dbFunctions.commitTransaction();
      res.status(200).json({message : `User ${userID} updated successfully.`});

    } catch (err) {
      await dbFunctions.rollbackTransaction();
      res.status(500).json({error : `Error updating user. Something went wrong updating the skills: ${err.message}`});
      return;
    }
  }
})

export default router;


