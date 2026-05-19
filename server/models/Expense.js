import mongoose from 'mongoose';

const CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Education',
  'Bills',
  'Other',
];

const expenseSchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    shopName: { type: String, default: 'Unknown' },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: () => new Date() },
    category: {
      type: String,
      enum: CATEGORIES,
      default: 'Other',
    },
    summary: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Expense = mongoose.model('Expense', expenseSchema);
export { CATEGORIES };
