import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // res.status(300).json({
  //   message: "JAY JAY SHREE RADHEE...",
  // });

  // Get user details from frontend
  // Validation - not empty
  // Check if user already exist: check via username, email
  // Check for images, Check for avatar
  // Upload them to cloudinary
  // Create user object - create entry in db
  // Remove password and refreshtoken field from response
  // Check for user creation
  // Return res

  const { fullName, email, username, password } = req.body;
  console.log("Entered email is: ", email);
  console.log("Your full name is: ", fullName);
  console.log("You are using username as: ", username);
  console.log("Your password(Encrypted) is: ", null);

  // if (fullName === ""){
  //   throw new ApiError(400, "fullName is required")
  // }

  if (
    [fullName, email, username, password].some((field) => field?.trim() == "") // agr field agr h to use trim krdo agr trim krne k bd bhi empty h to automatic true return ho jaega
  ) {
    throw new ApiError(400, "All fields are required...");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }], // $or operator k through hume jitni cheeze check krna ho utni kr skte h object k andr likh k
  });

  if (existedUser) {
    throw new ApiError(
      409,
      "Account with this email and username is already existed"
    ); // 409 status code : When trying to create a resource that already exists
  }

  // console.log(req.files);
  
  const avatarLocalPath = req.files?.avatar[0]?.path; // in paths ki destination apn ne multer.middleware m rkhi hui h
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;


  // Classic Way 
  
  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  // sbse phle to check kr rhe req.files ai h ya nhi fir array aya h ya nhi die hue arguement ka fir agr wo array h to us array ki length 0 s jda h ya nhi agr 0 s jda h to coverImageLocalPath set kr dnge ki req.files.coverImage m se 0th element m s path nikal lo

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required.");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // console.log(avatarLocalPath)

  const createdUser = await User.findById(user._id).select(
    // .select method use kia jta h cheezo ko select krne k lie wo cheeze jo jo nahi chie hume, jo ki string k fom m likhe jte h ek sth dash d dke
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something is wrong, user is not created");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered succesfully"));
});

export { registerUser };
