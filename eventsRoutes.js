import express from 'express';
import {body, query, validationResult} from 'express-validator';
import * as dbFunctions from "./database.js";

const router = express.Router();

router.post("/events", 
        // date validation
        body('start_time').isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
        body('end_time').isISO8601().withMessage('End date must be a valid ISO 8601 date'),

        async (req, res) => {
            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            if(req.body.name == null){
                return res.status(422).json({error: "Unable to create event. Name was not provided"});
            }

            const validFields = ["name", "location", "start_time", "end_time", "description", "attendees"];
            const bodyKeys = Object.keys(req.body);
            console.log(bodyKeys);

            const filteredFields = [];
            const filteredValues = [];
            for(const field of bodyKeys){
                if(validFields.includes(field)){
                    filteredFields.push(field);
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

router.get("/event_registrations", 

        query('startTime').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
        query('endTime').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { userID, eventID, startTime, endTime } = req.query;
            
            let selectQueries = [];
            let eventJoins = [];
            let userJoins = [];
            let whereQueries = [];
            let queryValues = [];

            if(startTime){
                eventJoins.push("e.start_time = ?");
                queryValues.push(startTime);	
            }

            if(endTime){
                eventJoins.push("e.end_time = ?");
                queryValues.push(endTime);
            }

            if(eventID){
                selectQueries.push("e.*");
                whereQueries.push("er.event_id = ?");
                eventJoins.push("e.id = er.event_id");
                queryValues.push(eventID);
            }

            if(eventID == null && userID == null){
                selectQueries.push("*");
            }

            if(userID){
            //	maybe only want u.id, u.name, u.email
                selectQueries.push("u.*");
                whereQueries.push("er.user_id = ?");
                userJoins.push("u.id = er.user_id");
                queryValues.push(userID);
            }


            const selectClause = selectQueries.join(",");
            const whereClause = whereQueries.join(" AND ");

            let eventClause = "";
            let userClause = "";
            if(eventJoins.length > 0){
                
                eventClause = "JOIN events e ON " + eventJoins.join(" AND ");
            }

            if(userJoins.length > 0){
                userClause = "JOIN users u ON " + userJoins.join(" AND ");
            }

            const query = `SELECT ${selectClause}
                    FROM event_registrations er
                    ${eventClause}
                    ${userClause}
                    WHERE ${whereClause}`;

            console.log(query);
            console.log(queryValues);

            // const eventRegistrations = db.all(query, queryValues);

            res.status(200).json();


});





export default router;
