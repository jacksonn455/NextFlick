import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/entities/user.entity';

export type WatchHistoryDocument = WatchHistory & Document;

// One entry per user and film, updated while the film plays
@Schema({ timestamps: true, collection: 'watch_history' })
export class WatchHistory {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  // Film id in the free catalog (bare Internet Archive id or "source:id")
  @Prop({ required: true })
  identifier: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  thumbnail: string;

  // Playback position and total length, in seconds
  @Prop({ required: true, default: 0 })
  position: number;

  @Prop({ required: true, default: 0 })
  duration: number;

  @Prop({ required: true, default: false })
  completed: boolean;

  @Prop({ required: true })
  lastWatchedAt: Date;
}

export const WatchHistorySchema = SchemaFactory.createForClass(WatchHistory);

WatchHistorySchema.index({ userId: 1, identifier: 1 }, { unique: true });
WatchHistorySchema.index({ userId: 1, lastWatchedAt: -1 });
