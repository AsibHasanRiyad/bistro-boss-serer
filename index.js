const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5001;

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

    //users collection
    app.get('/users', async(req, res) =>{
        const result = await userCollection.find().toArray()
        res.send(result)
    })
    app.post('/users', async(req, res) =>{
        const user = req.body;
        const query = {email: user.email}
        const existingUser = await userCollection.findOne(query)
        if (existingUser) {
            return res.send({message:'User Already Exist', insertedId:null})
        }
        const result = await userCollection.insertOne(user);
        res.send(result)
    })
    app.delete('/users/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await userCollection.deleteOne(query)
        res.send(result)
    })

    //make user admin(update)
    app.patch('/users/admin/:id', async(req,res) =>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const updateDoc = {
            $set:{
                role:'admin'
            }
        }
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result)
    })




    //menu related api
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });




    //carts collection
    app.get("/carts", async(req, res) =>{
        const email = req.query.email
        const query = {email: email}
        const result = await cartsCollection.find(query).toArray()
        res.send(result)
    })

    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
    });

    app.delete('/carts/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await cartsCollection.deleteOne(query);
        res.send(result)
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