module.exports = (req,res,next)=>{
        res.render('404.ejs',{pageTitle:"Page not found!",isAuthenticated:req.session.isLoggedIn});
};