const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

    // app.patch("/assignment-submission/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const updateInfo = req.body;
    //   const filter = { _id: new ObjectId(id) };
    //   const options = { upsert: true };
    //   const updateDoc = {
    //     $set: {
    //       given_mark: updateInfo.given_mark,
    //       feedback: updateInfo.feedback,
    //       status: updateInfo.status,
    //     },
    //   };
    //   const result = await submissionCollection.updateOne(
    //     filter,
    //     updateDoc,
    //     options
    //   );
    //   res.send(result);
    // });
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
