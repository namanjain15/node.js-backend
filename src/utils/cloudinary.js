import { v2 as cloudinary } from "cloudinary";

import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {

  try {
    if (!localFilePath) return "Path does not found...";
    // upload the file on cloudinary.
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // File has been uploaded successfully.
    console.log("File is uploaded on Cloudinary", response.url);
    return response;

  } catch (error) {
    fs.unlinkSync(localFilePath); // It removes the locally saved temporary files as the upload operation got failed.
    return null;
  }
};

export { uploadOnCloudinary };




// cloudinary.v2.uploader.upload(
//   "https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg",
//   {
//     public_id: "started_image",
//   },
//   function (error, result) {
//     console.log(result);
//   }
// );
