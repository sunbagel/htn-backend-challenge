import express from "express";
import * as dbFunctions from "./database.js";
import usersRoutes from './usersRoutes.js'
import skillsRoutes from './skillsRoutes.js'

const port = process.env.PORT || 3000;

const app = express();
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(usersRoutes);
app.use(skillsRoutes);



app.listen(port, () => {
  console.log(`Example REST Express app listening at http://localhost:${port}`);
});
