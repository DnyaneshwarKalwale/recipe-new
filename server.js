const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Custom logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Recipe Model
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

// GET all recipes (sorted by position)
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await Recipe.find().sort({ position: 1 });
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST new recipe (with validation)
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
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PUT update recipe
app.put('/api/recipes/:id', 
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
      const updatedRecipe = await Recipe.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!updatedRecipe) return res.status(404).json({ message: 'Recipe not found' });
      res.json(updatedRecipe);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST reorder recipes (for drag-and-drop)
app.post('/api/recipes/reorder', async (req, res) => {
  const { orderedIds } = req.body;
  
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ message: 'Invalid request format' });
  }

  try {
    const bulkUpdates = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { position: index + 1 } }
      }
    }));
    
    await Recipe.bulkWrite(bulkUpdates);
    res.json({ message: 'Recipes reordered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});