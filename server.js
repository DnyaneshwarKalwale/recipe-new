const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Recipe Schema
const recipeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cuisine: { type: String, required: true },
  instructions: { type: String, required: true },
  ingredients: { type: [String], required: true },
  image: { type: String, required: true },
  prepTimeMinutes: { type: Number, required: true },
  cookTimeMinutes: { type: Number, required: true },
  servings: { type: Number, required: true },
  tags: { type: [String], default: [] },
  position: { type: Number, default: Date.now }
});

const Recipe = mongoose.model('Recipe', recipeSchema);

// API Endpoints

// GET all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await Recipe.find().sort({ position: 1 });
    res.status(200).json(recipes);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch recipes',
      error: err.message 
    });
  }
});

// POST new recipe
app.post('/api/recipes', 
  [
    body('name').trim().notEmpty().withMessage('Recipe name is required'),
    body('cuisine').trim().notEmpty().withMessage('Cuisine is required'),
    body('instructions').trim().notEmpty().withMessage('Instructions are required'),
    body('ingredients').isArray({ min: 1 }).withMessage('At least one ingredient is required'),
    body('image').trim().isURL().withMessage('Valid image URL is required'),
    body('prepTimeMinutes').isInt({ min: 1 }).withMessage('Valid prep time is required'),
    body('cookTimeMinutes').isInt({ min: 1 }).withMessage('Valid cook time is required'),
    body('servings').isInt({ min: 1 }).withMessage('Valid servings number is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newRecipe = await Recipe.create(req.body);
      res.status(201).json(newRecipe);
    } catch (err) {
      console.error('Creation error:', err);
      res.status(500).json({ 
        message: 'Failed to create recipe',
        error: err.message 
      });
    }
  }
);

// PUT update recipe
app.put('/api/recipes/:id', 
  [
    // Same validations as POST
  ],
  async (req, res) => {
    // Similar error handling as POST
  }
);

// POST reorder recipes
app.post('/api/recipes/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body;
    
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'Invalid request format' });
    }

    const bulkUpdates = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: { position: index + 1 } }
      }
    }));
    
    await Recipe.bulkWrite(bulkUpdates);
    res.json({ message: 'Recipes reordered successfully' });
  } catch (err) {
    console.error('Reorder error:', err);
    res.status(500).json({ 
      message: 'Failed to reorder recipes',
      error: err.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});