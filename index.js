const http = require("http");
const app = require("./app");

const PORT = process.env.PORT || 8080;

// app is already an http.Server, just call listen
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Finance Backend running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
