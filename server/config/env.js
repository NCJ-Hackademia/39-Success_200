import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 1011;

export default { ...process.env, PORT };
