import mongoose, { Schema } from 'mongoose';

const StudentSchema = new Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  gender: { type: String, enum: ['남', '여'] },
  age: { type: Number },
  personality: { type: String },
  trait: { type: String },
  score: { type: Number },
  note: { type: String, default: '' },
  groupId: { type: String, default: 'default' },
}, { timestamps: true });

export default mongoose.models.Student || mongoose.model('Student', StudentSchema);
