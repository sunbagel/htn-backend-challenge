import express from "express";
import * as dbFunctions from "./database.js";
import userRoutes from './userRoutes.js'

const port = process.env.PORT || 3000;

const app = express();
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(userRoutes);


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

    const result = await dbFunctions.createSkill(name, frequency);

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
