import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: 'admin' | 'officer' | 'viewer';
    createdAt: Date;
    updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'officer', 'viewer'], required: true },
}, { timestamps: true });

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
