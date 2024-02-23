import express from 'express';
import {body, query, validationResult} from 'express-validator';
import * as dbFunctions from "./database.js";

const router = express.Router();

router.get("/events", async (req, res) => {
    try{
        const events = await dbFunctions.getEvents();
        res.status(200).json(events)
    } catch(err){
        res.status(500).json({error: `Error fetching events: ${err.message}`})
    }
})

router.post("/events", 
        // date validation
        body('startTime').isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
        body('endTime').isISO8601().withMessage('End date must be a valid ISO 8601 date'),

        async (req, res) => {
            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            if(req.body.name == null){
                return res.status(422).json({error: "Unable to create event. Name was not provided"});
            }

            const validFields = ["name", "location", "startTime", "endTime", "description", "attendees"];
            const bodyKeys = Object.keys(req.body);
            console.log(bodyKeys);

            const filteredFields = [];
            const filteredValues = [];
            for(const field of bodyKeys){
                if(validFields.includes(field)){
                    // convert any camelCase values to snake_case
                    filteredFields.push(field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`));
                    filteredValues.push(req.body[field]);
                }

            }

            const insertClause = filteredFields.join(",");
            // create n question marks for n values
            let valuesClause = "";
            for(let i = 0; i < filteredFields.length; i++){
                if(i > 0){
                    valuesClause += ",";
                }
                valuesClause += "?";
            }
            console.log(valuesClause);

            try{
                const event = await dbFunctions.createEvent(insertClause, valuesClause, filteredValues);
                res.status(200).json({message: `Successfully created event`, eventID: event.id})
            } catch (err){
                return res.status(500).json({error: `Error creating a user: ${err.message}`})
            }
    
});

router.post("/event_registrations", 
        body("userID").exists().withMessage("userID is required"),
        body("eventID").exists().withMessage("eventID is required"),
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { userID, eventID } = req.body;
            try{
                await dbFunctions.createEventRegistration(userID, eventID);
                res.status(200).json({message: `User ${userID} registered to event ${eventID}`});
            } catch(err){
                 if (err.message.includes("UNIQUE constraint failed")) {
                    return res.status(400).json({ error: "Duplicate skill entry." });
                } else {
                    // Handle other types of errors
                    return res.status(500).json({ error: `Failed to register user ${userID} to event ${eventID}: ${err.message}` });
                }
            }

            
});

router.get("/event_registrations", 

        query('startTime').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
        query('endTime').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { userID, eventID, startTime, endTime } = req.query;
            try{
                const rows = await dbFunctions.getEventRegistrations(userID, eventID, startTime, endTime);
                const registrations = rows.map(row => {
                    // Assuming 'u' prefix for user columns, and 'e' for event columns
                    let registration = {};
                    const user = {};
                    const event = {};

                    // Split row into registration, user, and event objects
                    for (const key in row) {
                        if (key.startsWith('u_')) {
                            user[key.replace('u_', '')] = row[key];
                        } else if (key.startsWith('e_')) {
                            event[key.replace('e_', '')] = row[key];
                        } else if (key.startsWith('er_')) {
                            registration[key.replace('er_', '')] = row[key];
                        }
                    }

                    // searching eventID returns registered users
                    if(req.query.eventID != null){
                        registration.user = user;
                    }

                    // searching userID returns events registered by the user
                    if(req.query.userID != null){
                        registration.event = event;
                    }
                    // Structure the data
                    return registration;
                });

                res.status(200).json(registrations);
            } catch(err){
                res.status(500).json({error: `Error fetching event registrations: ${err.message}`})
            }
});





export default router;
