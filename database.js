import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as fs from "node:fs/promises";
// Open db connection
const db = await open({
    filename: './hackers.db',
    driver: sqlite3.Database
})

export async function initDB(){
    const userData = await fs.readFile('./setup_data/HTN_2023_BE_Challenge_Data.json', 'utf8');
    const users = JSON.parse(userData); // Parse the JSON data

    const eventData = await fs.readFile('./setup_data/event_data.json');
    const events = JSON.parse(eventData);

    const registrationData = await fs.readFile('./setup_data/event_registration_data.json');
    const registrations = JSON.parse(registrationData);
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

    for(const event of events){
        const {name, location, start_time, end_time, description} = event;

        const selectClause = "name, location, start_time, end_time, description";
        await createEvent(selectClause, "?,?,?,?,?", [name, location, start_time, end_time, description]);
    }

    for(const registration of registrations){
        const {userID, eventID} = registration;
        // console.log(registration);
        await createEventRegistration(userID, eventID);
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

export async function getEvents(){
    const events = await db.all("SELECT * FROM events");
    return events;
}

export async function createEvent(insertClause, valuesClause, filteredValues){
    const query = `INSERT INTO events (${insertClause}) VALUES (${valuesClause})`;
    // console.log(query);
    const event = await db.run(query, filteredValues);
    return event;
}

export async function createEventRegistration(userID, eventID){
    const query = `INSERT INTO event_registrations (user_id, event_id) VALUES (?,?)`
    return await db.run(query, [userID, eventID]);
}

export async function getEventRegistrations(userID, eventID, startTime, endTime){

    let selectQueries = [];
    let whereQueries = [];
    let queryValues = [];

    if(eventID == null && userID == null){
        selectQueries.push("er.user_id AS er_user_id");
        selectQueries.push("er.event_id AS er_event_id");
    }

    if(startTime){
        whereQueries.push("e.start_time >= ?");
        queryValues.push(startTime);	
    }

    if(endTime){
        whereQueries.push("e.end_time <= ?");
        queryValues.push(endTime);
    }

    if(eventID){
        selectQueries.push("u.id as u_id");
        selectQueries.push("u.name as u_name");
        selectQueries.push("u.email as u_email");
        
        whereQueries.push("er.event_id = ?");
        queryValues.push(eventID);
    }

    if(userID){

        selectQueries.push("e.id as e_id");
        selectQueries.push("e.name as e_name");
        selectQueries.push("e.location as e_location");
        selectQueries.push("e.start_time as e_start_time");
        selectQueries.push("e.end_time as e_end_time");
        selectQueries.push("e.description as e_description");
        selectQueries.push("e.attendees as e_attendees");

        whereQueries.push("er.user_id = ?");
        queryValues.push(userID);
    }

    

    const selectClause = selectQueries.join(",");
    const whereClause = whereQueries.length > 0 ? "WHERE " + whereQueries.join(" AND ") : "";

    const eventClause = "JOIN events e ON e.id = er.event_id";
    const userClause = "JOIN users u ON u.id = er.user_id";

    const query = `SELECT ${selectClause}
                    FROM event_registrations er
                    ${eventClause}
                    ${userClause}
                    ${whereClause}`;

    // console.log(query);
    // console.log(queryValues);

    const eventRegistrations = db.all(query, queryValues);
    return eventRegistrations;
}


