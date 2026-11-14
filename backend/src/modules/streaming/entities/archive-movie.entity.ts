import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ArchiveMovieDocument = ArchiveMovie & Document;

// Rights record and metadata cache for every Internet Archive film opened in the app.
// It keeps the license as it was when we checked it, and lets details keep working
// while archive.org is down.
@Schema({ timestamps: true, collection: 'archive_movies' })
export class ArchiveMovie {
  @Prop({ required: true, unique: true })
  identifier: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: String, default: null })
  year: string | null;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, default: null })
  creator: string | null;

  @Prop({ required: true })
  thumbnail: string;

  @Prop({ required: true })
  videoUrl: string;

  @Prop({ required: true })
  videoFormat: string;

  @Prop({ type: Number, default: null })
  durationSeconds: number | null;

  @Prop({ required: true })
  sourceUrl: string;

  // License as declared on archive.org
  @Prop({ type: String, default: null })
  licenseUrl: string | null;

  @Prop({ type: String, default: null })
  licenseType: string | null;

  @Prop({ required: true })
  licenseLabel: string;

  // Free-text "rights" statement from the item, kept for manual review
  @Prop({ type: String, default: null })
  rights: string | null;

  @Prop({ required: true })
  attribution: string;

  // Result of the automatic license check; only verified films are streamed
  @Prop({ required: true, default: false })
  rightsVerified: boolean;

  @Prop({ required: true })
  rightsCheckedAt: Date;
}

export const ArchiveMovieSchema = SchemaFactory.createForClass(ArchiveMovie);
