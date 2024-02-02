import mongoose from 'mongoose';
import { Schema } from 'mongoose';

const paymentLogSchema = new Schema({
  email: { type: String, required: true },
  spaceClassPaymentId: { type: String, required: true },
  spaceClassPaymentName: { type: String, required: true },
  spaceClassPaymentPrice: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }, // 생성 시간을 자동으로 기록
});

export default mongoose.model('PaymentLog', paymentLogSchema);
