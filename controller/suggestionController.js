const suggestions = require('../model/suggestionData');
const services = require('../services.config');
const asyncHandler = require('../utils/asyncHandler');

exports.getPage = asyncHandler(async (req, res) => {
  const categories = Object.keys(suggestions);
  res.render('suggestions', { categories, result: null, selected: null, services });
});

exports.getSuggestions = asyncHandler(async (req, res) => {
  const { category } = req.body;
  const categories = Object.keys(suggestions);
  const result = suggestions[category] || null;
  res.render('suggestions', { categories, result, selected: category, services });
});