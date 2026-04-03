/**
 * Body Parser Middleware
 * Parses incoming JSON request bodies (replaces express.json()).
 */

function bodyParser(req, res, next) {
  const method = req.method;
  if (!["POST", "PUT", "PATCH"].includes(method)) {
    req.body = {};
    return next();
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    req.body = {};
    return next();
  }

  let rawData = "";
  req.on("data", (chunk) => {
    rawData += chunk.toString();
    // Guard against excessively large payloads (1MB limit)
    if (rawData.length > 1_000_000) {
      rawData = "";
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Payload too large" }));
    }
  });

  req.on("end", () => {
    try {
      req.body = rawData ? JSON.parse(rawData) : {};
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, message: "Invalid JSON body" }));
    }
    next();
  });

  req.on("error", () => {
    req.body = {};
    next();
  });
}

module.exports = bodyParser;
