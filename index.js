const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://food-sharing-app-60489.web.app',
        'https://food-sharing-app-60489.firebaseapp.com'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Database Connection

const uri = `mongodb+srv://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASS)}@cluster0.j4ayfzt.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Verify Token Middleware
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).send({ message: 'unauthorized access' });
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(401).send({ message: 'unauthorized access' });
        req.user = decoded;
        next();
    });
};

async function run() {
    try {
        // Connect the client
        // await client.connect(); // Optional in Vercel usually, but good for local

        const db = client.db('food-sharing-db');
        const foodsCollection = db.collection('foods');
        const requestCollection = db.collection('food-requests');

        // Auth Routes
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' });
            res.cookie('token', token, cookieOptions).send({ success: true });
        });

        app.post('/logout', (req, res) => {
            res.clearCookie('token', { ...cookieOptions, maxAge: 0 }).send({ success: true });
        });

        // --- FOOD ROUTES ---

        // 1. Add Food (POST)
        app.post('/add-food', verifyToken, async (req, res) => {
            const newFood = req.body;
            newFood.status = 'available'; // Default status
            try {
                const result = await foodsCollection.insertOne(newFood);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: error.message });
            }
        });

        // 2. Get All Available Foods (Matches your frontend logs /all-foods)
        // Also supports ?search=name&sort=asc
        app.get('/all-foods', async (req, res) => {
            const { search, sort } = req.query;
            let query = { status: 'available' };
            if (search) {
                query.foodName = { $regex: search, $options: 'i' };
            }
            let options = {};
            if (sort === 'asc') {
                options = { sort: { expiredDate: 1 } };
            }
            const result = await foodsCollection.find(query, options).toArray();
            res.send(result);
        });

        // 3. Featured Foods (Top 6)
        app.get('/featured-foods', async (req, res) => {
            const result = await foodsCollection.find({ status: 'available' })
                .sort({ foodQuantity: -1 })
                .limit(6)
                .toArray();
            res.send(result);
        });

        // 4. Get Single Food Details
        app.get('/food/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodsCollection.findOne(query);
            res.send(result);
        });

        // 5. Manage My Foods
        app.get('/manage-foods/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (req.user.email !== email) return res.status(403).send({ message: 'forbidden access' });
            const query = { 'donator.email': email };
            const result = await foodsCollection.find(query).toArray();
            res.send(result);
        });

        // 6. Delete Food
        app.delete('/food/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodsCollection.deleteOne(query);
            res.send(result);
        });

        // 7. Update Food
        app.put('/food/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedFood = req.body;
            const food = {
                $set: {
                    foodName: updatedFood.foodName,
                    foodImage: updatedFood.foodImage,
                    foodQuantity: updatedFood.foodQuantity,
                    pickupLocation: updatedFood.pickupLocation,
                    expiredDateTime: updatedFood.expiredDateTime,
                    additionalNotes: updatedFood.additionalNotes
                }
            };
            const result = await foodsCollection.updateOne(filter, food);
            res.send(result);
        });

        // --- REQUEST ROUTES ---

        // 8. Request a Food
        app.post('/request-food', verifyToken, async (req, res) => {
            const requestData = req.body;
            const foodId = requestData.foodId;

            // Step 1: Add to requests collection
            const result = await requestCollection.insertOne(requestData);

            // Step 2: Update status in foods collection
            const filter = { _id: new ObjectId(foodId) };
            const updateDoc = {
                $set: { status: 'requested' }
            };
            await foodsCollection.updateOne(filter, updateDoc);

            res.send(result);
        });

        // 9. My Food Requests (Frontend is likely using this)
        app.get('/my-requests/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (req.user.email !== email) return res.status(403).send({ message: 'forbidden access' });

            const query = { userEmail: email };
            const result = await requestCollection.find(query).toArray();
            res.send(result);
        });

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Food sharing app server is running!');
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});

module.exports = app;