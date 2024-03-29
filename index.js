import express from "express";
import * as dbFunctions from "./database.js";
import usersRoutes from './routes/usersRoutes.js'
import skillsRoutes from './routes/skillsRoutes.js'
import eventsRoutes from "./routes/eventsRoutes.js"

const port = process.env.PORT || 3000;

const app = express();
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(usersRoutes);
app.use(skillsRoutes);
app.use(eventsRoutes);

app.post("/init_db", async (req, res) =>{
  try{

    dbFunctions.beginTransaction();
    await dbFunctions.initDB();
    dbFunctions.commitTransaction();
    res.status(200).json({message: "Success!"})
    
  } catch(err){

    dbFunctions.rollbackTransaction();
    res.status(500).json({error: `Unable to init db: ${err.message}`});
    
  }
})

app.listen(port, () => {
  console.log(`Example REST Express app listening at http://localhost:${port}`);
});
