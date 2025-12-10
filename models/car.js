import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema({
  src: String,
  src2x: String,
  width: Number,
  height: Number,
  alt: String,
});

const MainImageSchema = new mongoose.Schema({
  src: String,
  srcset1x: String,
  srcset2x: String,
  width: Number,
  height: Number,
  alt: String,
  isFirstPhoto: Boolean,
});

const CarSchema = new mongoose.Schema(
  {
    listingId: { type: String, unique: true, index: true },
    description: [String],
    drive: String,
    engineHp: Number,
    engineLiters: Number,
    fuel: String,
    fetchedAt: Date,
    image: MainImageSchema,
    images: [ImageSchema],
    initialPriceRub: Number,
    isPinned: Boolean,
    location: String,
    mileageKm: Number,
    priceLabel: String,
    status: String,
    subtitle: String,
    title: String,
    transmission: String,
    url: String,
    year: Number,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Car", CarSchema);
