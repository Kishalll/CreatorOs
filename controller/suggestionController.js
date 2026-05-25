const Suggestion = require('../model/suggestion');
const Service = require('../model/service');
const User = require('../model/user');

function buildAccountViewModel(userDoc, fallbackUser) {
  const name = userDoc?.name || 'Creator';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'CR';

  return {
    id: fallbackUser.id,
    name,
    email: userDoc?.email || '',
    createdAt: userDoc?.createdAt,
    initials,
  };
}

exports.getPage = async (req, res, next) => {
  try {
    const [categories, services, userDoc] = await Promise.all([
      Suggestion.getCategories(),
      Service.findAll(),
      User.findById(req.user.id),
    ]);
    res.render('suggestions', {
      categories,
      result: null,
      selected: null,
      services,
      user: buildAccountViewModel(userDoc, req.user),
    });
  } catch (error) {
    next(error);
  }
};

exports.getSuggestions = async (req, res, next) => {
  try {
    const { category } = req.body;
    const [categories, services, result, userDoc] = await Promise.all([
      Suggestion.getCategories(),
      Service.findAll(),
      Suggestion.getSuggestionsByCategory(category),
      User.findById(req.user.id),
    ]);
    res.render('suggestions', {
      categories,
      result,
      selected: category,
      services,
      user: buildAccountViewModel(userDoc, req.user),
    });
  } catch (error) {
    next(error);
  }
};
