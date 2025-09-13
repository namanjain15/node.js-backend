import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshTokens = async(userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }


  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating Refresh and Access Token")
  }
}

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

const loginUser = asyncHandler( async (req, res) => {

  // get data from req body 
  // username or email
  // find the user
  // password check
  // access and refresh token generate
  // send cookies
  // response

  const {email, username, password} = req.body

  if (!username && !email) {
    throw new ApiError(400, "username or email is missing...")
  }

  const user = await User.findOne({             // or kya krega, find krega kisi ek value ko ya to wo username ya to email k base pr mil jaegi
    $or: [{ username }, { email }]
  })

  if (!user) {
    throw new ApiError(404, "User does not exist...")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Password incorrect or Invalid user credentials")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);         // generateAccessAndRefreshTokens ke andr bol duga ki yh jo user object aya h usme se ._id me pass kr dta hu 

  const loggedInUser = await User.findById(user._id).select(" -password -refreshToken")

  // Cookies

  const options = {
    httpOnly: true,
    secure: true,
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser, accessToken, refreshToken
      },
      "User logged in Successfully..."
    )
  )

})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    // {
    //   $unset: {
    //     refreshToken: 1              // this removes the field from the document 
    //   }
    // },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true,
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "refreshToken is not coming..")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
  
    const user = await User.findById(decodedToken?._id)
  
    if (!user) {
      throw new ApiError(401, "Invalid refreshToken")
    }
  
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used..")
    }
  
    const options = {
      httpOnly: true,
      secure: true
    }
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken: newRefreshToken
        },
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})

const changeCurrentpassword = asyncHandler(async (req, res) => {
  const {oldPassword, newPassword} = req.body

  console.log(req.body);

  const user = await User.findById(req.user?._id)       // agr user h to use id s find kro
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(
    new ApiResponse(
      200,
      {},
      "password changed successfully..."
    )
  )

})

const getCurrentUser = asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json(200, req.user, "Current user fetched successfully...")
})

// console.log(getCurrentUser)

const updateAccountDetails = asyncHandler(async(req, res) => {
  const {fullName, email} = req.body

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email
      }
    },
    {
      new: ture
    }          // iski help s, update hone k bd jo information rhti h wo return ho jti h 
  ).select(" -password ")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing !!")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if (!avatar.url) {
        throw new ApiError(400, "Error occur while uploading avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{                 // $set operator kisi specific field ko set krne k kaam m ata h 
        avatar: avatar.url
      }
    },
    {new: true}
  ).select(" -password ")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Avatar updated successfully")
  )

})

const updateUserCoverImage = asyncHandler(async(req, res) => {
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing !!")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!coverImage.url) {
        throw new ApiError(400, "Error occur while uploading cover image")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{                 // $set operator kisi specific field ko set krne k kaam m ata h 
        coverImage: coverImage.url
      }
    },
    {new: true}
  ).select(" -password ")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Cover Image updated successfully")
  )

})

const getUserChannelprofile = asyncHandler(async(req, res) => {
  const { username } = req.params      // params = parameters

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing here")
  }

  // User.find({username})           // instead of this we r using aggregation pipelines 

  const channel = await User.aggregate([

    // sbse phle humne user ko match kia 
    // fir uske subscribers kitne h wo dkha (channel k through)
    // fir humne count kia humne kitno ko subscribe kia hua h (subscriber k through)
    // fir humne kch or fields add kri 

    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {                   // $lookup is used to join two collections (like SQL joins).
        from: "subscriptions",     // model m sari cheeze lower case m convert ho jti h or plural ho jti h 
        localField: "_id",
        foreignField: "channel",
        as : "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",     // model m sari cheeze lower case m convert ho jti h or plural ho jti h 
        localField: "_id",
        foreignField: "subscriber",
        as : "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"         // sare documents ko count krne k lie $size user krte h 
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"]
            },
            then :true,
            else: false
          }
        }
      }
    },
    {
      $project: {          // yeh selected cheezo ko project krta h 
        fullname: 1,
        username: 1,
        email: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1
      }
    }
  ])

  if (!channel?.length) {
    throw new ApiError(400, "Channel does not exist")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, channel[0], "User channel fetched successfully...")
  )

})

const getWatchHistory = asyncHandler(async(req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields: {            // Sara data owner ki feild m aa chuka h but in the form of array jisme se hume alg s first value nikalni pdti h to hume wo cheez shi krna h 
              owner: {               // field ko add bhi kr skte h but apn use owner hi bol dte h jisse existing field hi override ho jae
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(
    new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully...")
  )

})


export { 
  registerUser, 
  loginUser, 
  logoutUser, 
  generateAccessAndRefreshTokens, 
  refreshAccessToken, 
  changeCurrentpassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelprofile,
  getWatchHistory
};
