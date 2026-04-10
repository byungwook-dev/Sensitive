import mongoose, { Schema } from 'mongoose';

const PresetSchema = new Schema({
  presetId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  mode: { type: String, enum: ['team', 'class'], default: 'team' },
  teams: { type: Schema.Types.Mixed },
  balanceScore: { type: Number },
  studentCount: { type: Number },
}, { timestamps: true });

export default mongoose.models.Preset || mongoose.model('Preset', PresetSchema);
