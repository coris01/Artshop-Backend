const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const User = require("../models/userModel");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

// Register a user
exports.registerUser = catchAsyncErrors(async(req, res, next) => {

    const {name, email, password} = req.body;
    
    const user = await User.create({
        name, email, password, 
        avatar: {
            public_id:"this is a sample id",
            url:"profilepicurl"
        }
    });

    sendToken(user, 201, res);
});

// Login User
exports.loginUser = catchAsyncErrors(async (req, res, next) => {

    const {email, password} = req.body;
    
    //checking if user has given password and email both
    if (!email && !password) {
        return next(new ErrorHandler("Please Enter Email and Password", 400))
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
        return next(new ErrorHandler("Invalid email or password", 401));
    }

    const isPasswordMatched = user.comparePassword(password);

    if (!isPasswordMatched) {
        return next(new ErrorHandler("Invalid email or password", 401));
    }

    sendToken(user, 200, res);
});

// Logout User

exports.logoutUser = catchAsyncErrors(async(req, res, next) => {

    res.cookie("token", null, {
        expires:new Date(Date.now()),
        httpOnly:true
    })

    res.status(200).json({
        success:true,
        message:"Logged Out successfully"
    })
});

// Forgot password
exports.forgotPassword = catchAsyncErrors(async(req, res, next) => {
    const user = await User.findOne({email:req.body.email});

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    //Get ResetPassword token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const resetPasswordUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetToken}`

    const message = `Your password reset token is :- \n\n ${resetPasswordUrl} \n\n If you have not requested this email then, please ignore it`;
    
    try {

        await sendEmail({
            email:user.email,
            subject:`Ecommerce Password Recovery`,
            message
        });
        
        res.status(200).json({
            success:true,
            message:`Email sent to ${user.email} successfully`
        });

    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new ErrorHandler(error.message, 500))
    }
});

//Reset Password
exports.resetPassword = catchAsyncErrors(async(req, res, next) => {
    
    //creating token hash
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire:{$gt:Date.now()}
    });
    
    if (!user) {
        return next(new ErrorHandler("Reset Password Token is invalid or has been expired", 400));
    }

    if (req.body.password !== req.body.confirmPassword){
        return next(new ErrorHandler("Password doesn't match", 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendToken(user, 200, res);
});

// Get User details
exports.getUserDetails = catchAsyncErrors( async(req, res, next) => {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
        success: true,
        user
    });
});

// Update User Password
exports.updatePassword = catchAsyncErrors( async(req, res, next) => {
    const user = await User.findById(req.user.id).select("+password");
    
    const isPasswordMatched = user.comparePassword(req.body.oldPassword);

    if (!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect", 400));
    }

    if (req.body.newPassword !== req.body.confirmPassword){
        return next(new ErrorHandler("Password does not match", 400));
    }

    user.password = req.body.newPassword;

    await user.save();
    sendToken(user, 200, res);

});


//Update user profile
exports.updateProfile = catchAsyncErrors( async(req, res, next) => {
    
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
    }
    // Avatar to be added

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });
    
    res.status(200).json({
        success: true,
    });
});

// Get all users (admin)
exports.getAllUsers = catchAsyncErrors( async(req, res, next) => {
    
    const users = await User.find();
    res.status(200).json({
        success: true,
        users
    });
});

//Get single user detail (admin)
exports.getSingleUser = catchAsyncErrors ( async(req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }
    res.status(200).json({
        success: true,
        user
    });
});

//Update user Role -- Admin
exports.updateRole = catchAsyncErrors( async(req, res, next) => {
    
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role
    }

    const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });
    if (!user) {
        return next(new ErrorHandler("user not found", 404));
    }
    res.status(200).json({
        success: true,
    });
});

//Delete user -- Admin
exports.deleteUser = catchAsyncErrors( async(req, res, next) => {
    
    const user = await User.findById(req.params.id);
    if (!user) {
        return next(new ErrorHandler("user not found", 404));
    }
    // Avatar to be removed

    await user.remove();
    
    res.status(200).json({
        success: true,
    });
});