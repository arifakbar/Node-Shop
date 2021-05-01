module.exports = (req,res,next) =>{
        res.status(500).render("500.ejs",{
                path:"/500",
                pageTitle:"Error",
                isAuthenticated:req.session.isLoggedIn
        })
}