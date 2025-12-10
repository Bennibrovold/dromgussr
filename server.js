import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import Car from "./models/car.js"; // твоя mongoose модель

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

console.log("🚗 Connecting to MongoDB...");
(async () => await mongoose.connect("mongodb://localhost:27017/cars"))();

app.get("/api/random-car", async (req, res) => {
  const count = await Car.countDocuments();
  const rand = Math.floor(Math.random() * count);
  const car = await Car.findOne().skip(rand);
  res.json(car);
});

app.post("/api/guess", (req, res) => {
  const { guessPrice, guessModel } = req.body;
  const correct = req.body.correct;

  let totalScore = 0;

  // ======= PRICE SCORING =======
  const parsedGuessPrice =
    typeof guessPrice === "number" ? guessPrice : Number(guessPrice);
  const normalizedGuessPrice =
    Number.isFinite(parsedGuessPrice) && parsedGuessPrice >= 0
      ? parsedGuessPrice
      : null;

  const priceTarget =
    typeof correct?.price === "number" && Number.isFinite(correct.price)
      ? correct.price
      : typeof correct?.initialPriceRub === "number" &&
        Number.isFinite(correct.initialPriceRub)
      ? correct.initialPriceRub
      : null;

  let priceScore = 0;
  let error = null;

  if (priceTarget && normalizedGuessPrice !== null && priceTarget > 0) {
    error = Math.abs(normalizedGuessPrice - priceTarget) / priceTarget;
    priceScore = Math.max(0, Math.round(4000 * (1 - error)));
  }

  totalScore += priceScore;

  // ======= MODEL SCORING =======
  const guess = guessModel?.toLowerCase() || "";
  const actual = correct?.title?.toLowerCase() || "";

  let modelScore = 0;

  if (guess === actual) modelScore = 1000;
  else if (guess.length >= 3 && actual.includes(guess)) modelScore = 500;

  totalScore += modelScore;

  res.json({
    totalScore,
    priceScore,
    modelScore,
    correct,
    error,
  });
});

app.get("/api/search-models", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.json([]);
    }

    // Regex: case-insensitive, starts anywhere
    const regex = new RegExp(q, "i");

    const cars = await Car.find({ title: regex }, { title: 1 }).limit(20);

    // Unique titles
    const unique = [...new Set(cars.map((c) => c.title))];

    res.json(unique);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(1121, () => console.log("server ready"));
