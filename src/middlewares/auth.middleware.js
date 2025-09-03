import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {

  // next ka kaam hota h age tk le jne k lie { jse apn ne kia h: router.route("/logout").post(verifyJWT, logoutUser)} isme verifyJWT k bd next() chl jaega or logoutUser chlu ho jaega
  // kyi br esi situation hoti h ki req ka bhi next ka bhi use ho rha h but res ka nhi ho rha to apn res ki jgh _ bhi likh skte h 
  
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");

    if (!token) {
      throw new ApiError(401, "Token is not given, Unauthorized request...");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      " -password -refreshToken "
    );

    if (!user) {
      throw new ApiError(401, "Invalid accessToken");
    }

    req.user = user;
    next();

  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid accesToken"); // phle option m bola gya h ki agr error h to message ko decode krdo
  }
});
