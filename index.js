// server.js
import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Stripe initialization
const stripe = new Stripe(process.env.STRIPE_SECRETKEY);

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.feap9m5.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let userCollection; // ✅ declared globally
let medicineCollection;

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB!");

    const db = client.db("MedicineDB");

    userCollection = db.collection("users"); // ✅ FIXED: was using .apply()
    medicineCollection = db.collection("medicines");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
run().catch(console.dir);


// Health check route
app.get("/", (req, res) => {
  res.send("Backend is working 🚀");
});



// GET all medicines
app.get("/medicines", async (req, res) => {
  try {
    const medicines = await medicineCollection.find().toArray();
    res.send(medicines);
  } catch (err) {
    res
      .status(500)
      .send({ message: "Failed to fetch medicines", error: err });
  }
});

// POST new medicine
app.post("/medicines", async (req, res) => {
  try {
    const newMedicine = req.body;
    const result = await medicineCollection.insertOne(newMedicine);
    res.send({
      message: "Medicine added successfully",
      insertedId: result.insertedId,
    });
  } catch (err) {
    res.status(500).send({ message: "Failed to add medicine", error: err });
  }
});


// Register a new user
app.post("/users", async (req, res) => {
  try {
    if (!userCollection) throw new Error("User collection not initialized");

    const { email } = req.body;
    if (!email) return res.status(400).send({ error: "Email is required" });

    const userExists = await userCollection.findOne({ email });
    if (userExists) {
      return res.status(200).send({ message: "User already exists", inserted: false });
    }

    const result = await userCollection.insertOne(req.body);
    res.send({ message: "User added successfully", insertedId: result.insertedId });

  } catch (err) {
    console.error("❌ /users POST error:", err);
    res.status(500).send({ error: err.message });
  }
});

// Get all users
app.get("/users", async (req, res) => {
  try {
    if (!userCollection) throw new Error("User collection not initialized");

    const users = await userCollection.find().toArray();
    res.send(users);

  } catch (err) {
    console.error("❌ /users GET error:", err);
    res.status(500).send({ error: err.message });
  }
});

// 🔍 Search user by email
app.get("/users/search", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send({ error: "Email query is required" });
    }

    const user = await userCollection.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    res.send(user);
  } catch (err) {
    console.error("❌ /users/search error:", err);
    res.status(500).send({ error: err.message });
  }
});



// Stripe payment intent route
app.post("/create-payment-intent", async (req, res) => {
  const { amount } = req.body; // amount in cents
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      payment_method_types: ["card"],
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe Error:", err.message);
    res.status(500).send({ error: err.message });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
