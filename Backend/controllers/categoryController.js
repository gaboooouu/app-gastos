const { Category } = require('../models');

// GET /api/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { user_id: req.user.id }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Error fetching categories' });
  }
};

// POST /api/categories
const createCategory = async (req, res) => {
  try {
    const { name, icon, color, budget_type } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const category = await Category.create({ 
      name, 
      icon, 
      color,
      budget_type: budget_type || 'libre',
      user_id: req.user.id
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Error creating category' });
  }
};

// PUT /api/categories/:id
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, color, budget_type } = req.body;
    
    const category = await Category.findOne({
      where: { id, user_id: req.user.id }
    });
    
    if (!category) return res.status(404).json({ error: 'Category not found or unauthorized' });
    
    await category.update({
      name: name !== undefined ? name : category.name,
      icon: icon !== undefined ? icon : category.icon,
      color: color !== undefined ? color : category.color,
      budget_type: budget_type !== undefined ? budget_type : category.budget_type
    });
    
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Error updating category' });
  }
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findOne({
      where: { id, user_id: req.user.id }
    });
    
    if (!category) return res.status(404).json({ error: 'Category not found or unauthorized' });
    
    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Error deleting category' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
