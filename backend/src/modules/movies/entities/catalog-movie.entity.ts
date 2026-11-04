import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { CatalogSource } from '../interfaces/catalog-movie.interface';

export type CatalogMovieDocument = CatalogMovie & Document;

// Movies the recommendation model can score, with OMDb data already parsed into
// numbers and lists (the features). Explicit `type`s: `number | null` alone
// would make Mongoose fall back to Mixed.
@Schema({ collection: 'movies', timestamps: true })
export class CatalogMovie {
  @Prop({ required: true, unique: true })
  imdbID: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: Number, default: null })
  year: number | null;

  @Prop({ type: String, default: null })
  type: string | null;

  @Prop({ type: String, default: null })
  poster: string | null;

  @Prop({ type: [String], default: [] })
  genres: string[];

  @Prop({ type: Number, default: null })
  rating: number | null;

  @Prop({ type: Number, default: null })
  runtime: number | null;

  @Prop({ type: String, default: null })
  rated: string | null;

  @Prop({ type: String, default: null })
  director: string | null;

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop({ type: [String], default: [] })
  countries: string[];

  // "seed" came from data/seed-movies.ts, "favorite" was added when a user favorited it
  @Prop({ type: String, required: true, enum: ['seed', 'favorite'] })
  source: CatalogSource;
}

export const CatalogMovieSchema = SchemaFactory.createForClass(CatalogMovie);

CatalogMovieSchema.index({ genres: 1 });
