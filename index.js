const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const jsend = require("jsend");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const compression = require("compression");

url =
  "mongodb+srv://ezatelbery187:ez1234@cluster0.d3kzwak.mongodb.net/E-commerce?retryWrites=true&w=majority&appName=Cluster0";
// "mongodb+srv://ezatelbery187:ez1234@cluster0.d3kzwak.mongodb.net/E-commerce?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(url).then(() => {
  console.log("Data is Ready");
});

require("dotenv").config();
// app.use('/' , )
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "50mb" }));

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: [true, "the email is already token"],
  },
  password: {
    type: String,
    required: true,
  },
  cardData: {
    type: Array,
  },
  image: {
    type: String,
  },
});

const User = mongoose.model("User", userSchema);

app.use(express.static("Upload"));

const storage = multer.diskStorage({
  destination: "./Upload",
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, "-")}`;
    return cb(null, fileName);
  },
});

const upload = multer({ storage: storage });

app.post("/upload", upload.single("image"), (req, res) => {
  const { file } = req;
  console.log(file);
  res.json({ image: file.path });
});

app.post("/signup", upload.single("image"), async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  const { file } = req;

  const checkEmail = await User.findOne({ email });

  if (checkEmail) {
    return res.status(401).json(jsend.fail("the email is already token"));
  }

  const newUser = new User({
    firstName,
    lastName,
    email,
    password,
    cardData: [],
    image: file ? `http://localhost:4000/${file.filename}` : "",
  });

  await newUser.save();

  const token = jwt.sign(
    { id: newUser._id, email: newUser.email },
    process.env.JWT_SECRT_KEY
  );

  res.json(jsend.success({ token, user: newUser }));
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const findUser = await User.findOne({ email });

  if (findUser) {
    if (password == findUser.password) {
      const token = jwt.sign(
        { id: findUser._id, email: findUser.email },
        process.env.JWT_SECRT_KEY
      );

      res.status(201).json(jsend.success({ token, user: findUser }));
    } else {
      res.status(400).json(jsend.fail("the password is not correct"));
    }
  } else {
    res.status(401).json(jsend.fail("the email is not correct"));
  }
});

app.post("/update", async (req, res) => {
  const { email, firstName, lastName, password, image } = req.body;
  const user = await User.findOne({ email });

  if (user) {
    await User.findOneAndUpdate(
      { email },
      { firstName, lastName, password, image }
    );

    const userUpdate = await User.findOne({ email });

    res.status(201).json(jsend.success({ user: userUpdate }));
  }
});

const productSchema = new mongoose.Schema({
  id: {
    type: Number,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    // required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
});

const Products = mongoose.model("Products", productSchema);

app.post("/add-product", upload.single("image"), async (req, res) => {
  const { name, category, price, description } = req.body;
  const { file } = req;
  console.log(file);
  let theId = 1;

  const findProduts = await Products.find({});

  if (findProduts.length > 0) {
    const endProduct = findProduts.slice(-1)[0];

    theId = endProduct.id + 1;
  }

  const newProduct = new Products({
    id: theId,
    name,
    category,
    image: file ? `http://localhost:4000/${file.filename}` : "",
    price,
    description,
  });

  await newProduct.save();

  res.status(201).json("Success");
});

app.get("/get-product", async (req, res) => {
  const query = req.query;
  const limit = query.limit;
  const skip = query.skip;

  const allProduct = await Products.find({}).limit(limit);

  res.json(jsend.success(allProduct));
});

app.post("/add-products", async (req, res) => {
  const { product, token } = req.body;

  const currentToken = jwt.verify(token, process.env.JWT_SECRT_KEY);
  const email = currentToken.email;

  const findUser = await User.findOne({ email });

  if (!findUser) {
    return res.json(jsend.error("The Token is not Correct"));
  } else {
    let found = false;
    for (let i = 0; i < findUser.cardData.length; i++) {
      if (findUser.cardData[i].id == req.body.product.id) {
        findUser.cardData[i].Quantity += 1;
        found = true;
        break;
      }
    }
    if (!found) {
      req.body.product = { ...req.body.product, Quantity: 1 };
      findUser.cardData.push(req.body.product);
    }

    // findUser.cardData.push(product);

    await User.findOneAndUpdate({ email }, { cardData: findUser.cardData });
    const user = await User.findOne({ email });
    return res.json(jsend.success(user.cardData));
  }
});

app.post("/delete-product", async (req, res) => {
  const { product, token } = req.body;

  const currentToken = jwt.verify(token, process.env.JWT_SECRT_KEY);
  const email = currentToken.email;

  const user = await User.findOne({ email });
  console.log(user.cardData);

  for (let i = 0; i < user.cardData.length; i++) {
    if (user.cardData[i].id === product.id) {
      if (user.cardData[i].Quantity > 1) {
        user.cardData[i].Quantity -= 1;
        break;
      } else {
        user.cardData.splice(i, 1);
        break;
      }
    }
  }
  console.log(user.cardData);

  await User.findOneAndUpdate({ email }, { cardData: user.cardData });
  const userUpdate = await User.findOne({ email });
  return res.json(jsend.success(userUpdate.cardData));
});

app.listen(4000, () => {
  console.log("the server listen is Ready");
});
