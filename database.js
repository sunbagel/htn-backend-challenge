import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as fs from "node:fs/promises";
// Open db connection
const db = await open({
    filename: './hackers.db',
    driver: sqlite3.Database
})

export async function initDB(){
    const data = await fs.readFile('./HTN_2023_BE_Challenge_Data.json', 'utf8'); // Read the JSON file
    const users = JSON.parse(data); // Parse the JSON data

    for (const user of users) {
        const {name, email, phone, checked_in, skills} = user;
        // create basic info
        const userRes = await createUser(name, email, phone, checked_in);
        const userID = userRes.lastID;
        
        await addUserSkills(userID, skills);

        // break after 100 users.
        if(userID == 100){
            break;
        }
    }

}

export async function beginTransaction(){
    await db.run("BEGIN TRANSACTION");
}

export async function commitTransaction(){
    await db.run("COMMIT");
}

export async function rollbackTransaction(){
    await db.run("ROLLBACK");
}

export async function getUsers(){
    const users = await db.all("SELECT * FROM users");
    return users;
}

export async function getUserByID(userID){
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userID]);
    return user;
}

export async function getUserSkills(userID){
    const query = `SELECT s.name, us.rating
                      FROM users_skills us
                      JOIN skills s ON us.skill_id = s.id
                      WHERE us.user_id = ?`;
    const skills = await db.all(query, [userID]);
    return skills;
}

export async function createUser(name, email, phone, checked_in){
    const userQuery = `INSERT INTO users (name, email, phone, checked_in)
    VALUES (?,?,?,?)`;

    const userResult = await db.run(userQuery, [name, email, phone, checked_in]);
    return userResult;
}

export async function updateUser(setClause, values, userID){
    const userRes = await db.run(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, userID]);
    return userRes;
}

export async function addUserSkills( userID, skills){
    for(const skill of skills){
        // need skill validation
        // skill has name, rating
        let skillID;
        const existingSkill = await db.get("SELECT id FROM skills WHERE name = ?", [skill.skill]);

        // if skill exists
        if(existingSkill){
            skillID = existingSkill.id;
        } else {

            // if skill doesn't exist, create new skill
            const skillQuery = `INSERT INTO skills (name)
                                VALUES (?)`;
            const skillResult = await db.run(skillQuery, [skill.skill]);
            skillID = skillResult.lastID;
        }

        // insert row for user/skill relationship
        const associativeQuery = `INSERT INTO users_skills (user_id, skill_id, rating)
                                    VALUES (?,?,?)`;

        await db.run(associativeQuery, [userID, skillID, skill.rating]);

    }

}

export async function removeUserSkills(userID, skills){
    for(const skill of skills){
        const skillRes = await db.get("SELECT id FROM skills WHERE name = ?", [skill.skill]);
        const skillID = skillRes.id;
        const query = `DELETE FROM users_skills
                        WHERE user_id = ? AND skill_id = ?`;

        await db.run(query, [userID, skillID]);
      }
}

export async function updateUserSkills(userID, skills){
    for(const skill of skills){
        const skillRes = await db.get("SELECT id FROM skills WHERE name = ?", [skill.skill]);
        const skillID = skillRes.id;
        const query = `UPDATE users_skills 
                        SET rating = ? WHERE user_id = ? 
                        AND skill_id = ?`;
        await db.run(query, [skill.rating, userID, skillID]);
    }
}

export async function getSkillByID(skillID){
    const skill = await db.get('SELECT * FROM skills WHERE id = ?', [skillID]);
    return skill;
}

export async function getSkills(whereClause, frequencyValues){
    const skills = await db.all(`SELECT * FROM skills ${whereClause} ORDER BY frequency DESC`, frequencyValues);
    return skills;
}

export async function createSkill(name, frequency){
    const query = `INSERT INTO skills (name, frequency)
                      VALUES (?,?)`;

    const result = await db.run(query, [name, frequency]);
    return result;
}

export async function createEvent(insertClause, valuesClause, filteredValues){



    const query = `INSERT INTO events (${insertClause}) VALUES (${valuesClause})`;
    console.log(query);
    const event = await db.run(query, filteredValues);
    return event;


}


