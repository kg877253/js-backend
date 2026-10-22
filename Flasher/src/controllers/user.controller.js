import {asyncHandler} from '../utils/asyncHandler.js';

const registerUser= asyncHandler(async (req, res)=>{
      
	// 1. Get details from frontend wtever we are taking ..
	// 2. Now validate these like not empty or not.
	// 3. Check if User already exists in the database or not from : username ,email..
	// 4. Check for images, check for avatar
	// 5. Upload these to cloudinary , avatar
	// 6. Create user object --create entry in db
	// 7. From response --remove password and refresh token 
	// 8. Check for user creation---return response

    const {fullname, username, email, password} = req.body;
    console.log(email,fullname);
    

});

export {registerUser}