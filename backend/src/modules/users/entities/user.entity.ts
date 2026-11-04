import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  // Short, URL-friendly handle (e.g. "ana-lima"); the relations use _id
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  username: string;

  @Prop({ required: true, trim: true })
  name: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
