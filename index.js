
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Verify Token Middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o5c73r2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const foodCollection = client.db('food-sharing').collection('foods');
    const foodRequestCollection = client.db('food-sharing').collection('food-requests'); // Assuming 'food-requests'

    // Food API endpoints
    app.post('/add-food', verifyToken, async (req, res) => {
      const newFood = req.body;
      const result = await foodCollection.insertOne(newFood);
      res.send(result);
    });

    app.get('/available-foods', async (req, res) => {
      const { search } = req.query;
      let query = { foodStatus: 'available' };
      if (search) {
        query.foodName = { $regex: search, $options: 'i' };
      }
      const result = await foodCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/manage-foods/:email', verifyToken, async (req, res) => {
      const tokenEmail = req.params.email;
      if (tokenEmail !== req.user.email) {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      const query = { 'donator.email': tokenEmail };
      const result = await foodCollection.find(query).toArray();
      res.send(result);
    });

    app.delete('/food/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(query);
      res.send(result);
    });

    app.put('/food/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const food = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...food,
        },
      };
      const result = await foodCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close(); // Temporarily commenting out for continuous server operation
  }
}
run().catch(console.dir);

app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Set to true in production with HTTPS
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  }).send({ success: true });
});

app.post('/logout', async (req, res) => {
  res.clearCookie('token', {
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  }).send({ success: true });
});

app.get('/', (req, res) => {
  res.send('Food sharing app server is running!');
});

app.listen(port, () => {
  console.log(`Food sharing app server listening on port ${port}`);
});
