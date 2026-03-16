const multer = require('multer');
const path = require('path');
const ErrorResponse = require('../utils/errorResponse');

// Configure storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    let uploadPath = 'uploads/';
    
    // Determine folder based on file type or purpose
    if (file.fieldname === 'profileImage') {
      uploadPath += 'profiles/';
    } else if (file.fieldname === 'propertyImages') {
      uploadPath += 'properties/';
    } else if (file.fieldname === 'documents') {
      uploadPath += 'documents/';
    } else {
      uploadPath += 'misc/';
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedDocTypes = /pdf|doc|docx|txt/;
  
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  if (file.fieldname.includes('Image')) {
    if (allowedImageTypes.test(extname) && allowedImageTypes.test(mimetype.split('/')[1])) {
      cb(null, true);
    } else {
      cb(new ErrorResponse('Only image files are allowed', 400), false);
    }
  } else if (file.fieldname.includes('doc') || file.fieldname === 'documents') {
    if (allowedDocTypes.test(extname)) {
      cb(null, true);
    } else {
      cb(new ErrorResponse('Only document files are allowed', 400), false);
    }
  } else {
    cb(new ErrorResponse('Invalid file type', 400), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;