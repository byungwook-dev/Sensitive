import mongoose, { Schema } from 'mongoose';

const TeamSchema = new Schema({
  teamId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  maxMembers: { type: Number, default: 10 },
  minMembers: { type: Number, default: 1 },
  memberIds: [{ type: String }],
  groupId: { type: String, default: 'default' },
}, { timestamps: true });

export default mongoose.models.Team || mongoose.model('Team', TeamSchema);
