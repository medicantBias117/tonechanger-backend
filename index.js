const express = require("express");
const { Client } = require("pg");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const format = require("pg-format");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(bodyParser.json());

app.use(cors());
// Connect to PostgreSQL database
const client = new Client({
  host: process.env.DBURL,
  user: process.env.DBUSER,
  password: process.env.DBPASSWORD,
  database: process.env.DBDB,
  ssl: true,
});
client.connect();

// Define daily limit
const limit = 50;

// Define OpenAI endpoint
const endpoint = "https://api.openai.com/v1/engines/engine_id/jobs";

app.get("/", (req, res) => {
  res.send("Hello Goodbye!");
});

app.get("/api/checklimit", async (req, res) => {
  try {
    console.log("Service live");
    const query =
      "SELECT count(*) FROM toneapilimits WHERE call_date = CURRENT_DATE";
    const result = await client.query(query);
    if (result.rows[0].count >= limit) {
      return res.status(429).send("limitreached");
    } else {
      return res.status(200).send("limitnotreached");
    }
  } catch (error) {
    return res.status(500).send({ error: error });
  }
});

app.post("/api/call-openai", async (req, res) => {
  try {
    // Check if daily limit has been reached
    const query =
      "SELECT count(*) FROM toneapilimits WHERE call_date = CURRENT_DATE";
    const result = await client.query(query);

    if (result.rows[0].count >= limit) {
      return res.status(429).send({ choices: "Daily limit has been reached" });
    }
    const prompt = req.body.params.substring(0, 400);

    axios
      .post(
        "https://api.openai.com/v1/completions",
        {
          prompt: prompt,
          max_tokens: 200,
          temperature: 0.1,
          model: "text-davinci-003",
          presence_penalty: 1,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer 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`,
          },
        }
      )
      .then((response) => {
        res.status(200).send(response.data.choices);
      })
      .then(() => {
        const insertQuery =
          "INSERT INTO toneapilimits VALUES (CURRENT_DATE, current_timestamp )";

        client.query(insertQuery);
      });

    const loggingQuery =
      "INSERT INTO toneapilog  VALUES ( " +
      "'" +
      mysql_real_escape_string(
        prompt.substring(prompt.indexOf("\n"), prompt.length)
      ) +
      "', " +
      "'" +
      mysql_real_escape_string(req.body.intendedTone) +
      "'," +
      " current_timestamp)";

    await client.query(loggingQuery);
  } catch (error) {
    return res.status(500).send({ error: error });
  }
});

app.listen(3000, () => {
  console.log("API listening on port 3000");
});

function mysql_real_escape_string(str) {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case '"':
      case "'":
      case "\\":
      case "%":
        return "\\"; // prepends a backslash to backslash, percent,
      // and double/single quotes
      default:
        return char;
    }
  });
}
