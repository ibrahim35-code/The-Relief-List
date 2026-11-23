const { body } = require('express-validator');

const normalizeSource = (val) => {
  if (!val) return val;
  const s = val.toString().toLowerCase().trim();
  if (s === 'union' || s.includes('union')) return 'Union Council';
  if (s === 'survey' || s.includes('survey')) return 'Volunteer Survey';
  if (s === 'partner' || s.includes('partner')) return 'Partner Organization';
  return val;
};

const reliefValidation = [
  body('sourceType')
    .trim()
    .notEmpty()
    .withMessage('Source channel/method is required')
    .customSanitizer(normalizeSource)
    .isIn(['Union Council', 'Volunteer Survey', 'Partner Organization'])
    .withMessage('Invalid channel selected (must be Union Council, Volunteer Survey, or Partner Organization)'),

  body('name')
    .optional()
    .trim(),

  body('beneficiaryName')
    .optional()
    .trim(),

  body().custom((value, { req }) => {
    const nameVal = req.body.name || req.body.beneficiaryName;
    if (!nameVal || !nameVal.trim()) {
      throw new Error('Beneficiary Name is required');
    }
    if (nameVal.trim().length < 2 || nameVal.trim().length > 150) {
      throw new Error('Name must be between 2 and 150 characters');
    }
    return true;
  }),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 3, max: 500 })
    .withMessage('Address must be between 3 and 500 characters'),

  // Age: required for Union Council (Union) and Volunteer Survey (Survey)
  body('age')
    .if((value, { req }) => {
      const src = normalizeSource(req.body.sourceType);
      return src === 'Union Council' || src === 'Volunteer Survey';
    })
    .notEmpty()
    .withMessage('Age is required for Union Council and Volunteer Survey methods')
    .isInt({ min: 1, max: 130 })
    .withMessage('Please provide a valid age between 1 and 130'),

  // Total Family Members: required for Volunteer Survey (Survey)
  body('familyMembers')
    .if((value, { req }) => {
      const src = normalizeSource(req.body.sourceType);
      return src === 'Volunteer Survey';
    })
    .notEmpty()
    .withMessage('Total family members count is required for Volunteer Survey method')
    .isInt({ min: 1, max: 100 })
    .withMessage('Total family members must be at least 1'),

  // Wife Name: required for Partner Organization (Partner)
  body('wifeName')
    .if((value, { req }) => {
      const src = normalizeSource(req.body.sourceType);
      return src === 'Partner Organization';
    })
    .notEmpty()
    .withMessage("Wife's name is required for Partner Organization method records")
    .isLength({ min: 2, max: 150 })
    .withMessage("Wife's name must be between 2 and 150 characters"),
];

const statusValidation = [
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['Pending', 'Approved', 'In Progress', 'Dispatched', 'Completed', 'Rejected'])
    .withMessage('Invalid status value'),

  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Admin notes cannot exceed 1000 characters'),
];

module.exports = {
  reliefValidation,
  statusValidation,
  normalizeSource,
};
