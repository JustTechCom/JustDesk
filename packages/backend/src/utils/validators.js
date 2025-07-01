const Joi = require('joi');

// Room validation schemas
const roomSchemas = {
  createRoom: Joi.object({
    // No input required for room creation
  }),
  
  joinRoom: Joi.object({
    roomId: Joi.string()
      .length(9)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        'string.length': 'Room ID must be exactly 9 digits',
        'string.pattern.base': 'Room ID must contain only numbers'
      }),
    password: Joi.string()
      .length(6)
      .pattern(/^[A-Z0-9]+$/)
      .required()
      .messages({
        'string.length': 'Password must be exactly 6 characters',
        'string.pattern.base': 'Password must contain only uppercase letters and numbers'
      })
  })
};

// WebRTC validation schemas
const webrtcSchemas = {
  offer: Joi.object({
    offer: Joi.object().required(),
    to: Joi.string().required()
  }),
  
  answer: Joi.object({
    answer: Joi.object().required(),
    to: Joi.string().required()
  }),
  
  iceCandidate: Joi.object({
    candidate: Joi.object().required(),
    to: Joi.string().required()
  })
};

// Validation middleware factory
const validate = (schema) => {
  return (data) => {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return {
        isValid: false,
        errors,
        value: null
      };
    }
    
    return {
      isValid: true,
      errors: null,
      value
    };
  };
};

// Export validators
module.exports = {
  validateCreateRoom: validate(roomSchemas.createRoom),
  validateJoinRoom: validate(roomSchemas.joinRoom),
  validateOffer: validate(webrtcSchemas.offer),
  validateAnswer: validate(webrtcSchemas.answer),
  validateIceCandidate: validate(webrtcSchemas.iceCandidate),
  
  // Utility validators
  isValidRoomId: (roomId) => {
    return /^[0-9]{9}$/.test(roomId);
  },
  
  isValidPassword: (password) => {
    return /^[A-Z0-9]{6}$/.test(password);
  },
  
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    
    // Remove any HTML tags and trim whitespace
    return input
      .replace(/<[^>]*>/g, '')
      .trim();
  }
};