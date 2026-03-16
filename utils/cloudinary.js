const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.uploadToCloudinary = (filePath, folder) => {
  return cloudinary.uploader.upload(filePath, {
    folder: `myapartment/${folder}`,
    use_filename: true
  });
};

exports.deleteFromCloudinary = (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};