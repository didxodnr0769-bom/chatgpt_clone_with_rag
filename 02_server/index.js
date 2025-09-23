const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// const testRoutes = require("./routes/test");
const ollamaRoutes = require("./routes/ollama");

app.use("/api", ollamaRoutes);
// app.use("/api", testRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
