import express from 'express';
import cors from 'cors';
const app = express();
import dotenv from 'dotenv';
import Database from './Database/database.js';
import processInputRoute from './routes/processInput.js';
import { Interaction } from './models/Interaction.js';
dotenv.config();

const db = new Database();
await db.connect(); // controlled async initialization
app.use(cors());
const port = 3001; // Use a different port than Next.js

app.use(express.json({ limit: '5mb' })); // or higher if needed
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use('/api/process-input', processInputRoute);

// New endpoint to fetch all interactions
app.get('/api/interactions', async (req, res) => {
  try {
    const interactions = await Interaction.find().sort({ timestamp: -1 });
    res.json(interactions);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    res
      .status(500)
      .json({ message: 'Error fetching interactions.', error: error.message });
  }
});

// Endpoint to update the status of a specific interaction
app.patch('/api/interactions/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await Interaction.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Interaction not found.' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating interaction status:', error);
    res
      .status(500)
      .json({ message: 'Error updating status.', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});
