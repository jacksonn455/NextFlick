//
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/entities/user.entity';

export type FavoriteDocument = Favorite & Document;

@Schema({ timestamps: true })
export class Favorite {
  // Schema.Types.ObjectId, not Types.ObjectId: the latter makes the path Mixed,
  // which stores the header string as-is instead of casting it to an ObjectId
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  // Not unique on its own: many users can favorite the same movie (see compound index below)
  @Prop({ required: true })
  imdbID: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  year: string;

  @Prop()
  poster: string;

  @Prop({ type: Object })
  movieData: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);

FavoriteSchema.index({ userId: 1, imdbID: 1 }, { unique: true });
