import sqlite3 from "sqlite3";
import { open } from "sqlite";
// Open db connection
const db = await open({
    filename: './hackers.db',
    driver: sqlite3.Database
})

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

export async function updateUser(values, userID){
    const userRes = await db.run(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, userID]);
    return userRes;
}

export async function getSkillByID(skillID){
    const skill = await db.get('SELECT * FROM skills WHERE id = ?', [skillID]);
    return skill;
}

export async function getSkills(whereClause, frequencyValues){
    const skills = await db.all(`SELECT * FROM skills ${whereClause} ORDER BY frequency DESC`, frequencyValues);
    return skills;
}

export async function addUserSkills(db, userID, skills){
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

}

export async function removeUserSkills(db, userID, skills){
    for(const skill of skills){
        const skillRes = await db.get("SELECT id FROM skills WHERE name = ?", [skill.name]);
        const skillID = skillRes.id;
        const query = `DELETE FROM users_skills
                        WHERE user_id = ? AND skill_id = ?`;

        await db.run(query, [userID, skillID]);
      }
}

export async function updateUserSkills(db, userID, skills){
    for(const skill of skills){
        const skillRes = await db.get("SELECT id FROM skills WHERE name = ?", [skill.name]);
        const skillID = skillRes.id;
        const query = `UPDATE users_skills 
                        SET rating = ? WHERE user_id = ? 
                        AND skill_id = ?`;
        await db.run(query, [skill.rating, userID, skillID]);
    }
}


