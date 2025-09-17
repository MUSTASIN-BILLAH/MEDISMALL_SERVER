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

// ⚡ Use your real Stripe Secret Key here
const stripe = new Stripe(process.env.STRIPE_SECRETKEY);


// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.feap9m5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let medicineCollection;

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB!");

    const db = client.db("MedicineDB");
    medicineCollection = db.collection("medicines");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
run().catch(console.dir);

// Routes
app.get("/", (req, res) => res.send("Backend is working 🚀"));

// GET all medicines
app.get("/medicines", async (req, res) => {
  try {
    const medicines = await medicineCollection.find().toArray();
    res.send(medicines);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch medicines", error: err });
  }
});

// POST new medicine
app.post("/medicines", async (req, res) => {
  try {
    const newMedicine = req.body;
    const result = await medicineCollection.insertOne(newMedicine);
    res.send({ message: "Medicine added successfully", insertedId: result.insertedId });
  } catch (err) {
    res.status(500).send({ message: "Failed to add medicine", error: err });
  }
});

// ⚡ Stripe PaymentIntent
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

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
