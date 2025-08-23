import app from "./app.js";
import connectDB from "./config/db.js";
import env from "./config/env.js";

const PORT = env.PORT || 1011;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });
