import { Schema, model, Document } from "mongoose";

export interface IAppSession extends Document {
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppSessionSchema = new Schema<IAppSession>(
  { token: { type: String, required: true } },
  { timestamps: true }
);

export const AppSession = model<IAppSession>("AppSession", AppSessionSchema);
