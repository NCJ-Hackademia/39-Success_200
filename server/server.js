import express from "express";
import connectDB from "./config/db.js";
import env from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

//routes
app.use("/api/auth", authRoutes);

const PORT = env.PORT;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });
