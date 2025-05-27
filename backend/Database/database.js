import mongoose from 'mongoose';

export default class Database {
  async connect() {
    try {
      await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
      console.log('Database connection successful');
    } catch (err) {
      console.error('Database connection error', err);
    }
  }
}
