//This is for handling async errors in express routes. It is a higher order function that takes a request handler as an argument and returns a new function that wraps the request handler in a promise. If the promise is rejected, it will call the next middleware with the error,otherwise it will call the request handler with the request, response and next middleware.

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}

export { asyncHandler }



//LEARNINF OF HIGHER ORDER FUNCTIONS
// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}

//SAME AS ABOVE
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }