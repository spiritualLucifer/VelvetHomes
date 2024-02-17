const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const jwtSecret = "#$ThisIsAWebDevelopmentProjectCreatedUsingMernStack$#"


const Object = require('./models/Object');
const Company = require('./models/Company');
const Customer = require('./models/Customer');
const Cart = require('./models/Cart');
const Bought = require('./models/Bought');
const Admin = require('./models/Admin');
const HomeObject = require('./models/HomeObjects');
const SubCategory = require('./models/SubCategory');
const Category = require('./models/Category');
const DiscountCode = require('./models/DiscountCode');
const HomeObjects = require('./models/HomeObjects');
require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
})

app.use(express.urlencoded({ extended: true }));
app.use(express.json())

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header(
        "Access-control-Allow-Headers",
        "origin, x-Requested-with, Content-Type, Accept"
    );
    next();
})

app.get('/', (req, res) => {
    res.send("velvet Homes backend sent this file");
})

// Route used for Customer Login
app.post('/velvethomes/customer/login',
    body('username').isEmail(),
    body('password', "Password Too Short").isLength({ min: 7 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { username, password } = req.body;
        const cust = await Customer.findOne({ username: username });
        if (!cust) {
            return res.json({ success: false, message: "User Not Found" });
        }
        const pwdCompare = await bcrypt.compare(req.body.password, cust.password);
        if (!pwdCompare) {
            return res.json({ success: false, message: "Password Not Matched" })
        }
        const data = {
            user: {
                id: cust._id
            }
        }
        const authToken = jwt.sign(data, jwtSecret);
        return res.json({ success: true, authToken: authToken });
    })

// Route Used for Customer SignUp 
app.post('/velvethomes/customer/signup',
    body('username').isEmail(),
    body('password', "Password Too Short").isLength({ min: 7 }),
    body('fullname').isLength({ min: 1 }),
    async (req, res) => {
        const errors = validationResult(req);
        const v = await Customer.findOne({ 'username': req.body.email });
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        if (v) {
            return res.json({ errors: "Email already used" });
        }
        const salt = await bcrypt.genSalt(10);
        let secPassword = await bcrypt.hash(req.body.password, salt);
        try {
            const cust = new Customer(req.body);
            cust.password = secPassword;
            await cust.save();
            res.json({ success: true })
        } catch (err) {
            console.log(err);
            console.log(req.body);
            res.json({ success: false });
        }
    }
)

// Route for fetching all the products to displayed on the home page
app.post('/velvethomes/customer/home',
    async (req, res) => {
        const home = await HomeObjects.find().populate('products');
        return res.json({ success: true, objects: home })
    })

// Route For Fetching The Details To Be Shown On Category Page 
app.post('/velvethomes/customer/showallcat',
    async (req, res) => {
        const id = req.body.id;
        const cat = await Category.findById(id);
        const subcats = await SubCategory.find({ "category": cat.title })
        return res.json({ success: true, category: cat, subcategory: subcats })
    })

// Route For Fetching All Products Of A Particular Type 
app.post('/velvethomes/customer/showallsubcat',
    async (req, res) => {
        const id = req.body.id;
        const subcat = await SubCategory.findById(id);
        const allprod = await Object.find({ "category": subcat.title })
        return res.json({ success: true, subcategory: subcat, allitems: allprod });
    })

// Used To Display the products Details And Also For Generating Bills
app.post('/velvethomes/customer/productdetails',
    async (req, res) => {
        const obj = await Object.findById(req.body.oid);
        return res.json({ success: true, object: obj });
    })

// Used For Placing Order 
app.post('/velvethomes/customer/placeorder',
    async (req, res) => {
        const obj = await Object.findById(req.body.id);
        const discount = parseInt(req.body.discount)
        const cust = await Customer.findOne({ username: req.body.username })
        if (obj.quantity < req.body.quantity) {
            return res.json({ status: false, message: "Quantity Available is less than the requested amount!!" })
        }
        const comp = await Company.findOne({ username: obj.companyusername })
        const admin = await Admin.findOne()
        const qty = parseInt(req.body.quantity)
        const placeorder = new Bought();
        placeorder.username = req.body.username
        placeorder.product = obj
        placeorder.quantity = qty
        placeorder.orderDate = new Date()
        placeorder.status = "Pending"
        placeorder.deliveryDate = new Date(placeorder.orderDate.getTime() + (7 * 24 * 60 * 60 * 1000));
        placeorder.companyName = comp.username
        placeorder.discount = discount
        obj.quantity -= req.body.quantity
        placeorder.couponcode = req.body.couponcode
        comp.totalbusiness += Math.floor(qty * obj.price * (100 - obj.margin) / 100);
        admin.totalBusiness += Math.floor(qty * obj.price * (100 - discount) / 100);
        admin.totalProfit += (Math.floor(qty * obj.price * (100 - discount) / 100) - Math.floor(qty * obj.price * (100 - obj.margin) / 100));
        if (obj.quantity < 15) {
            comp.productsquantityEnding.push(obj);
        }
        cust.totalBusiness += Math.floor(qty * obj.price * (100 - discount) / 100)
        // console.log(comp)
        await cust.save();
        await admin.save();
        await comp.save();
        await obj.save();
        await placeorder.save()
        return res.json({ status: true, orderId: placeorder._id })
    })

// Used For Adding Element To Cart 
app.post('/velvethomes/customer/addtocart',
    async (req, res) => {
        const v = await Cart.findOne({ username: req.body.username });
        const obj = await Object.findById(req.body.id);
        if (!v) {
            const c = new Cart();
            c.username = req.body.username;
            c.product = new Array();
            c.product.push(obj);
            await c.save();
            return res.json({ success: true, cartId: c._id });
        } else {
            if (v.product.includes(obj._id)) {
                return res.json({ success: false, message: "Already Product in Cart" })
            } else {
                v.product.push(obj);
                await v.save();
                return res.json({ success: true, cartId: v._id })
            }
        }
    })

// Used For Fetching Data To be shown on the My Cart Page 
app.post('/velvethomes/customer/cartdetails',
    async (req, res) => {
        const ca = await Cart.findOne({ username: req.body.username }).populate('product');
        if (!ca) {
            return res.json({ success: false, message: "The Cart Is Empty" })
        } else {
            return res.json({ success: true, ca: ca })
        }
    })

// Used for Deleting a specific product from a particular item from cart 
app.post('/velvethomes/customer/deleteElementFromCart',
    async (req, res) => {
        const ca = await Cart.findOne({ username: req.body.username });
        const arr = ca.product;
        const ind = arr.indexOf(req.body.idToRemove);
        if (ind !== -1) {
            arr.splice(ind, 1);
        }
        ca.product = arr;
        await ca.save();
        return res.json({ success: true })
    })

// Used for Fetching valid code or not 
app.post('/velvethomes/customer/validcode',
    async (req, res) => {
        const dc = await DiscountCode.findOne({ code: req.body.code });
        if (!dc) {
            return res.json({ success: false, message: "The Code Entered Is Invalid" })
        }
        if (dc.to.length > 0 && dc.to[0] === 'ALL') {
            return res.json({ success: true, discountpercent: dc.discountpercent, message: `Congratulations You Claimed a discount of ${dc.discountpercent}%` })
        }
        if (dc.to.length > 0) {
            if (dc.to.includes(req.body.username)) {
                return res.json({ success: true, discountpercent: dc.discountpercent, message: `Congratulations You Claimed a discount of ${dc.discountpercent}%` })
            } else {
                return res.json({ success: false, message: "The Code Entered Is Not Available For You" })
            }
        }
        return res.json({ success: false, message: "Invalid Expired, Try Other Code" })
    })

// Used For Fetching Personal Information Of The Users 
app.post('/velvethomes/customer/pinfo',
    async (req, res) => {
        const cust = await Customer.findOne({ username: req.body.username })
        const b = await Bought.find({ username: req.body.username }).populate('product')
        return res.json({ success: true, customer: cust, bought: b })
    })

// Used for creating A new Company 
app.post('/velvethomes/seller/createcomp',
    body('email').isEmail(),
    body('password', "Password Too Short").isLength({ min: 7 }),
    body('companyname').isLength({ min: 1 }),
    async (req, res) => {
        const errors = validationResult(req);
        const v = await Company.findOne({ 'email': req.body.email });
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        if (v) {
            return res.json({ errors: "Email already used" });
        }
        const salt = await bcrypt.genSalt(10);
        let secPassword = await bcrypt.hash(req.body.password, salt);
        try {
            const comp = new Company();
            comp.email = req.body.email
            comp.username = req.body.email
            comp.companyname = req.body.companyname
            comp.password = secPassword
            comp.totalbusiness = 0
            await comp.save();
            res.json({ success: true })
        } catch (err) {
            console.log(err);
            console.log(req.body);
            res.json({ success: false });
        }
    })

// Company Login Route 
app.post('/velvethomes/seller/login',
    body('email').isEmail(),
    body('password', "Password Too Short").isLength({ min: 7 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const comp = await Company.findOne({ 'email': req.body.email })
        if (!comp) {
            return res.json({ success: false })
        }
        const pwdCompare = await bcrypt.compare(req.body.password, comp.password);
        if (!pwdCompare) {
            return res.json({ success: false })
        }
        const data = {
            user: {
                id: comp._id
            }
        }
        const authToken = jwt.sign(data, jwtSecret);
        return res.json({ success: true, authToken: authToken });
    })


// Company Home Page Details Display 
app.post('/velvethomes/seller/home',
    body('email').isEmail(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: "Logout And Login Again To Continue" });
        }
        const comp = await Company.findOne({ 'email': req.body.email }).populate('productsquantityEnding');
        const sold = await Bought.find({ companyName: req.body.email }).populate('product');
        return res.json({ success: true, company: comp, sold: sold });
    })


// Route For Adding A New Product 
app.post('/velvethomes/seller/addnewprod',
    async (req, res) => {
        try {
            const obj = new Object();
            obj.title = req.body.title,
                obj.description = req.body.description,
                obj.price = req.body.price,
                obj.quantity = req.body.quantity,
                obj.category = req.body.subcategory,
                obj.companyusername = req.body.companyusername,
                obj.margin = 20
            obj.registered = new Date();
            obj.features = new Map();
            obj.quantitySold = 0;
            const n = req.body.images.length;
            for (let i = 0; i < n; i++) {
                obj.images.push(req.body.images[i]);
            }
            const p = req.body.key_points.length;
            for (let i = 0; i < p; i++) {
                obj.key_points.push(req.body.key_points[i]);
            }
            const k = req.body.features_keys.length;
            var keys = req.body.features_keys;
            var values = req.body.features_values;
            const subcat = await SubCategory.findOne({ title: req.body.subcategory });
            // console.log(req.body.subcategory)
            if (subcat.filters.has("No Filter")) {
                subcat.filters.set("No Filter", undefined);
            }
            for (let i = 0; i < k; i++) {
                if (subcat.filters.has(keys[i])) {
                    const arr = subcat.filters.get(keys[i]);
                    if (!arr.includes(values[i])) {
                        arr.push(values[i]);
                        subcat.filters.set(keys[i], arr);
                    }
                } else {
                    subcat.filters.set(keys[i], [values[i]]);
                }
                obj.features.set(keys[i], values[i])
            }
            await subcat.save();
            await obj.save();
            return res.json({ success: true, _id: obj._id });
        } catch (err) {
            console.log(err)
            return res.json({ success: false, error: err });
        }
    })

// Used for displaying all products registered by any company 
app.post('/velvethomes/selller/showallprods',
    async (req, res) => {
        const obj = await Object.find({ companyusername: req.body.email });
        return res.json({ success: true, objects: obj })
    })

// Used for Logining In of Admin
app.post('/velvethomes/admin/login',
    body('email').isEmail(),
    body('password', "Password Too Short").isLength({ min: 7 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const comp = await Admin.findOne({ 'username': req.body.email })
        if (!comp) {
            return res.json({ success: false })
        }
        const pwdCompare = await bcrypt.compare(req.body.password, comp.password);
        if (!pwdCompare) {
            return res.json({ success: false })
        }
        const data = {
            user: {
                id: comp._id
            }
        }
        const authToken = jwt.sign(data, jwtSecret);
        return res.json({ success: true, authToken: authToken });
    })

// Used for fetching Data To Be Displayed On Admin Home Page 
app.post('/velvethomes/admin/home',
    async (req, res) => {
        const comp = await Company.find();
        const ad = await Admin.findOne();
        const cust = await Customer.find();
        const s = await Bought.find().populate('product');
        const dc = await DiscountCode.find();
        const obj = await Object.find();
        const b = comp;
        const sortByTotalBusinessDesc = (a, b) => b.totalbusiness - a.totalbusiness;
        const sortByTotalBusinessMin = (a, b) => a.totalbusiness - b.totalbusiness;
        const sortByQuantitySoldDesc = (a, b) => {
            if (b.quantitySold - a.quantitySold) return b.quantitySold - a.quantitySold
            const r1 = new Date(a.registered);
            const r2 = new Date(b.registered);
            return r2 > r1
        }
        b.sort(sortByTotalBusinessDesc)
        const arr = [b[0]];
        let i = 1;
        while (b[i].totalbusiness === b[i - 1].totalbusiness) {
            arr.push(b[i]);
            i++;
        }
        const c = comp;
        c.sort(sortByTotalBusinessMin);
        const brr = [c[0]];
        i = 1;
        while (b[i].totalbusiness === c[i - 1].totalbusiness) {
            brr.push(c[i]);
            i++;
        }
        const d = obj;
        d.sort(sortByQuantitySoldDesc);
        return res.json({ success: true, company: comp, admin: ad, customer: cust, sales: s, discountcode: dc, mostSeller: arr, leastSeller: brr, bestSeller: d[0], worstSeller: d[d.length - 1] });
    })

// Used For Fetching Data Of All Customers From Admin Page
app.post('/velvethomes/admin/allcustomers',
    async (req, res) => {
        const cust = await Customer.find();
        return res.json({ success: true, customers: cust })
    })

// Used For Fetching All The Data Of All Companies On The Admin Dashboard 
app.post('/velvethomes/admin/allcompanies',
    async (req, res) => {
        const comp = await Company.find();
        return res.json({ success: true, company: comp });
    })

// Used for Displaying All The Data Of Deliveries On The Admin 
app.post('/velvethomes/admin/deliveries',
    async (req, res) => {
        const del = await Bought.find().populate('product');
        return res.json({ success: true, delivery: del })
    })

// Used for adding a new discount code
app.post('/velvethomes/admin/discountcode', async (req, res) => {
    if (req.body.code === "" || req.body.discountpercent <= 2) return res.json({ success: false, message: "Create a valid code" })
    const code = new DiscountCode();
    code.code = req.body.code
    code.discountpercent = req.body.discountpercent
    code.to = req.body.to;
    await code.save();
    return res.json({ success: true, code: code })
})

// Used for deleting a discount code
app.post('/velvethomes/admin/deletediscountcode', async (req, res) => {
    await DiscountCode.findOneAndDelete(req.body.id)
    const dc = await DiscountCode.find();
    return res.json({ success: true, dc: dc });
})

// Used for marking the product to be delivered 
app.post('/velvethomes/admin/delivered', async (req, res) => {
    const b = await Bought.findOne({ _id: req.body.id });
    b.status = "Delivered"
    b.deliveryDate = new Date();
    await b.save();
    // console.log(b)
    return res.json({ success: true })
})

app.listen(5000, () => {
    console.log("listening on port 5000");
})