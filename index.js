const express = require("express");
const { Client } = require("pg");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const format = require("pg-format");

// import { Configuration, OpenAIApi } from "openai";

// const configuration = new Configuration({
//   organization: "org-c4B9L0fYCVsPcCA4fwaMYrxJ",
//   apiKey: sk - akzorxtfFD3PNjsVVfKpT3BlbkFJmcRDQsRpIuwYfpz2ndCL,
// });

// const openai = new OpenAIApi(configuration);

const app = express();
app.use(bodyParser.json());
app.use(cors());
// Connect to PostgreSQL database
const client = new Client({
  host: "ep-holy-snowflake-143233.eu-central-1.aws.neon.tech",
  user: "medicantBias117",
  password: "E1qyRfdlDz4V",
  database: "neondb",
  ssl: true,
});
client.connect();

// Define daily limit
const limit = 50;

// Define OpenAI endpoint
const endpoint = "https://api.openai.com/v1/engines/engine_id/jobs";

// Define base64 security function

app.get("/", (req, res) => {
  res.send("Hello Goodbye!");
});

app.get("/api/checklimit", async (req, res) => {
  try {
    const query =
      "SELECT count(*) FROM toneapilimits WHERE call_date = CURRENT_DATE";
    const result = await client.query(query);
    if (result.rows[0].count >= limit) {
      return res.status(429).send("limitreached");
    } else {
      return res.status(200).send("limitnotreached");
    }
  } catch (error) {
    return res.status(500).send({ error: "An unexpected error occurred" });
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
    const prompt = req.body.params.substring(0, 280);

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
        console.log(response.data.choices);
        res.send(response.data.choices);
      })
      .then((ress) => {
        const insertQuery =
          "INSERT INTO toneapilimits (call_date, call_ts) VALUES (CURRENT_DATE, current_timestamp )";
        client.query(insertQuery);
      })
      .finally((response) => {});

    //( emailBody ,subjectLine ,isMakePurchase  ,isVisitWebApp ,isUpdateInfo  ,allowEmojis ,isClickbaity , otherObjective )
    const loggingQuery =
      "INSERT INTO toneapilog  VALUES ( " +
      "'" +
      mysql_real_escape_string(prompt) +
      "', " +
      "'" +
      mysql_real_escape_string(req.body.intendedTone) +
      "'," +
      ", current_timestamp)";
    // let reqArray = [ req.body.emailBody,req.body.subjectLine,  req.body.isMakePurchase, req.body.isVisitWebApp, req.body.isUpdateInfo, req.body.allowEmojis, req.body.isClickbaity, req.body.otherObjective, "current_timestamp"  ]

    // let loggingQuery2 = format("INSERT INTO apilog  VALUES  %s  ",reqArray )

    await client.query(loggingQuery);
    console.log(loggingQuery);

    // Make request to OpenAI
    // request.post({
    //   url: endpoint,
    //   headers: headers,
    //   body: req.body,
    //   json: true
    // }, (error, response, body) => {
    //   if (error) {
    //     return res.status(500).send({ error: 'OpenAI request failed' });
    //   }

    //   // Increment daily call count
    //   const insertQuery = 'INSERT INTO apilimits (call_date, call_ts) VALUES (CURRENT_DATE, current_timestamp )';
    //   client.query(insertQuery);

    //   // Return response
    //   return res.send(body);
    // });
  } catch (error) {
    return res.status(500).send({ error: "An unexpected error occurred" });
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
