import fetch from "node-fetch";
import mongoose from "mongoose";
import Car from "./models/car.js";

const API_URL = "http://109.110.36.201:1125/data";
const TOKEN =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YjljNTE4MjcwNzI1YjJkZTZkZTY3OCIsInVzZXJuYW1lIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiaWF0IjoxNzY1MzY5MjAwLCJleHAiOjE3NjU0NTU2MDB9.7VpeIOsj670nZWHzpUaQsV9hNr19EWWEj8RvWD5Tdl0";

async function fetchPage(page, limit = 5000) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      accept: "*/*",
      authorization: TOKEN,
      "content-type": "application/json",
      referer: "http://109.110.36.201:1115/",
    },
    body: JSON.stringify({
      page,
      limit,
      sort: { createdAt: -1 },
      filter: {},
      projection: {},
    }),
  });

  const json = await res.json();
  return json?.items || [];
}

async function main() {
  console.log("🚗 Connecting to MongoDB...");
  await mongoose.connect("mongodb://localhost:27017/cars");

  console.log("🧹 Clear old data...");
  await Car.deleteMany({});

  let page = 1;
  let total = 0;

  while (true) {
    console.log(`📦 Fetch page ${page}`);

    const items = await fetchPage(page);
    console.log(items);
    if (!items.length) break;

    console.log(`📥 Save ${items.length} cars...`);

    try {
      await Car.insertMany(items);
    } catch {}

    total += items.length;
    page++;
  }

  console.log("🎉 Done!");
  console.log(`🚘 Saved total: ${total}`);
  await mongoose.disconnect();
}

main().catch(console.error);
