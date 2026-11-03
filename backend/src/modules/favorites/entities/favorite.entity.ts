//
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FavoriteDocument = Favorite & Document;

@Schema({ timestamps: true })
export class Favorite {
  @Prop({ required: true })
  userId: string;

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
