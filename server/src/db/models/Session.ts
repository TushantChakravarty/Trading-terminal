import { Schema, model, Document } from "mongoose";

export interface ISession extends Document {
  accessToken: string;
  date: string;        // YYYY-MM-DD IST — Kite tokens expire at midnight
  profile: {
    user_id: string;
    user_name: string;
    email: string;
    broker: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    accessToken: { type: String, required: true },
    date:        { type: String, required: true },
    profile:     { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const Session = model<ISession>("Session", SessionSchema);
