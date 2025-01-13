const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }

    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fmfzj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const assignmentCollection = client
      .db("AssignmentsDB")
      .collection("assignments");

    const submissionCollection = client
      .db("AssignmentsDB")
      .collection("submissions");

    // Auth related apis
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.post("/assignments", async (req, res) => {
      const data = req.body;
      const result = await assignmentCollection.insertOne(data);
      res.send(result);
    });

    app.get("/assignments", async (req, res) => {
      const cursor = assignmentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/assignments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentCollection.findOne(query);
      res.send(result);
    });

    app.put("/assignments/:id", async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          title: updateInfo.title,
          description: updateInfo.description,
          marks: updateInfo.marks,
          image: updateInfo.image,
          difficulty: updateInfo.difficulty,
          date: updateInfo.date,
          email: updateInfo.email,
        },
      };
      const result = await assignmentCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.delete("/assignments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentCollection.deleteOne(query);
      res.send(result);
    });

    //Assignment submission
    app.post("/assignment-submission", async (req, res) => {
      const data = req.body;
      const result = await submissionCollection.insertOne(data);
      res.send(result);
    });

    app.get("/assignment-submission", async (req, res) => {
      const query = { status: "Pending" };
      const cursor = submissionCollection.find(query);
      const result = await cursor.toArray();

      for (submission of result) {
        const query = { _id: new ObjectId(submission.assignment_id) };
        const assignment = await assignmentCollection.findOne(query);

        if (assignment) {
          submission.title = assignment.title;
          submission.marks = assignment.marks;
        }
      }

      res.send(result);
    });

    app.get("/my-submission", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };

      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const cursor = submissionCollection.find(query);
      const result = await cursor.toArray();

      for (submission of result) {
        const query = { _id: new ObjectId(submission.assignment_id) };
        const assignment = await assignmentCollection.findOne(query);

        if (assignment) {
          submission.title = assignment.title;
          submission.marks = assignment.marks;
        }
      }

      res.send(result);
    });

    app.patch("/assignment-submission/:id", async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          given_mark: updateInfo.given_mark,
          feedback: updateInfo.feedback,
          status: updateInfo.status,
        },
      };
      const result = await submissionCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Study Circle is running");
});
app.listen(port, () => {
  console.log(`Study Circle is running on port ${port}`);
});
