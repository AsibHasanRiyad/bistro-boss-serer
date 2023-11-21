const express = require("express");
const cors = require("cors");
require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5001;
// console.log(process.env.STRIPE_SECRET_KEY);

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2x6r8lz.mongodb.net/?retryWrites=true&w=majority`;

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

    const userCollection = client.db("bistroDb").collection("users");
    const menuCollection = client.db("bistroDb").collection("menu");
    const reviewsCollection = client.db("bistroDb").collection("reviews");
    const cartsCollection = client.db("bistroDb").collection("carts");
    const paymentsCollection = client.db("bistroDb").collection("payments");

    //jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.DB_SECRET, { expiresIn: "1h" });
      res.send({ token });
    });

    //verify token by middleware
    const verifyToken = (req, res, next) => {
      console.log("inside the verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.DB_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "Unauthorized Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    //verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    //users collection
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User Already Exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //delete admin
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    //make user admin(update)
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params?.email;
      // if (email !== req?.decoded?.email) {
      //   return res.status(403).send({message:'Unauthorized Access'})
      // }
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        // console.log('heelloo userrrrrrr',user);
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    //menu related api
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.post("/menu",verifyToken, verifyAdmin, async(req, res) =>{
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result)
    })
    app.delete('/menu/:id',verifyToken, verifyAdmin, async (req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menuCollection.deleteOne(query);
      res.send(result)
    })

    //menu item update related api
    //get single data route
    app.get('/menu/:id', async (req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menuCollection.findOne(query);
      res.send(result)
    })
    //update
    app.patch('/menu/:id', async(req, res) =>{
      const item = req.body;
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set:{
          name:item.name,
          price:item.price,
          category:item.category,
          recipe:item.recipe,
          image:item.image
        }
      }
      const result = await menuCollection.updateOne(filter, updateDoc)
      res.send(result)
    })




    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    //carts collection
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });


    //payment intent
    app.post('/create-payment-intent', async(req, res) =>{
      const {price} = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
        payment_method_types:['card']
      })
      res.send({
        clientSecret:paymentIntent.client_secret
      })
    })

    app.get('/payments/:email', verifyToken, async(req, res) =>{
      const email = req.params.email;
      const query = {email: email}
      const result = await paymentsCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/payments', async(req, res) =>{
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      console.log('payment info', payment);
      const query ={_id:{
        $in:payment.cartId.map(id => new ObjectId(id))
      }}
      const deleteResult = await cartsCollection.deleteMany(query)
      res.send({result, deleteResult})
    })

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

//
app.get("/", (req, res) => {
  res.send("Bistro Boss server is running");
});

app.listen(port, () => {
  console.log(`Bistro Boss server is running on port:${port}`);
});
