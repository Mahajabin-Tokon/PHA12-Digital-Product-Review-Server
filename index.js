require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5001;

// middleware
app.use(cors());
app.use(express.json());
// Verify Token middleware
const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  // console.log("Inside", auth);
  if (!auth) return res.status(401).send({ message: "forbidden access" });
  const token = auth.split(" ")[1];
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.85wcl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Databases
    const db = client.db("productHuntDB");
    const userCollection = db.collection("users");
    const productCollection = db.collection("products");
    const reviewCollection = db.collection("reviews");

    // JWT routes
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    // User collection related routes
    // Make a new user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exits", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Check user role
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send({role: result?.role});
    });

    // Product collection related routes
    // Get all products
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    // Get product by ID
    app.get("/productDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // Add a new product
    app.post("/addProduct", async (req, res) => {
      const cartItem = req.body;
      const result = await productCollection.insertOne(cartItem);
      res.send(result);
    });

    // Update product upvote
    app.patch("/products", async (req, res) => {
      const productData = req.body;
      const email = req.query.email;
      const query = { _id: new ObjectId(productData._id) };
      const productToUpdate = await productCollection.findOne(query);
      if (productToUpdate?.productUpvotes?.includes(email)) {
        return res
          .status(400)
          .json({ message: "User has already upvoted this product." });
      }
      const update = { $push: { productUpvotes: email } };

      const result = await productCollection.updateOne(query, update);
      res.send(result);
      //   const update = {
      //     $inc: { productUpvotes: 1 },
      //   };
    });

    // Update product featured status
    app.patch("/products/feature/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id)
      const filter = { _id: new ObjectId(id) };
      // const options = { upsert: true };
      const product = {
        $set: {
          isFeatured: true
        },
      };
      const result = await productCollection.updateOne(filter, product);
      res.send(result);
    });

    // Review collection related routes
    // Get all reviews by product ID
    app.get("/reviews", async (req, res) => {
      const id = req.query.id;
      const query = { productId: id };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    // Add a new review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ProductHunt server is working");
});

app.listen(port, () => {
  console.log(`ProductHunt is running on port: ${port}`);
});
