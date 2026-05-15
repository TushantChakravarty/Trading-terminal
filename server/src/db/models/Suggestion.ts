import { Schema, model, Document } from "mongoose";

export interface IRating {
  ideaId: string;   // e.g. "s0", "o1"
  rating: number;   // 1–5
  ratedAt: Date;
}

export interface ISuggestion extends Document {
  generatedAt: Date;
  pulse: Record<string, any>;   // full market-pulse JSON
  ratings: IRating[];
}

const RatingSchema = new Schema<IRating>(
  {
    ideaId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    ratedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const SuggestionSchema = new Schema<ISuggestion>({
  generatedAt: { type: Date, default: () => new Date() },
  pulse:        { type: Schema.Types.Mixed, required: true },
  ratings:      { type: [RatingSchema], default: [] },
});

export const Suggestion = model<ISuggestion>("Suggestion", SuggestionSchema);
