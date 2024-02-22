import express from 'express';
import * as dbFunctions from "./database.js";

const router = express.Router();

router.post("/events", async (req, res) => {

    if(req.body.name == null){
        res.status(422).json({error: "Unable to create event. Name was not provided"});
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
        res.status(500).json({error: `Error creating a user: ${err.message}`})
    }
    
});

router.get("/api/event_registrations", async (req, res) => {



});





export default router;
