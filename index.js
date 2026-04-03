const app = require("./app");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // ← add this line

app.listen(PORT, HOST, () => {
  console.log(`Finance Backend running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
