const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zyfftle.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db('scholarHubDB').collection('users')
    const reviewCollection = client.db('scholarHubDB').collection('reviews')
    const noteCollection = client.db('scholarHubDB').collection('notes')

    // middleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorize access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorize access' })
        }
        req.decoded = decoded;
        next()
      })
    }


    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRETE, { expiresIn: '1h' })
      res.send({ token })
    })

    // user related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'Admin';
      }
      res.send({ admin });
    })

    app.get('/user/student/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let student = false;
      if (user) {
        student = user?.role === 'Student';
      }
      res.send({ student });
    })

    // tutors related api
    app.get('/tutors', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    // review related api
    app.get('/reviews', verifyToken, async (req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })

    app.post('/review', verifyToken, async (req, res) => {
      const review = req.body
      const result = await reviewCollection.insertOne(review)
      res.send(result)
    })

    // notes related api
    app.get('/notes/:email', verifyToken, async(req, res) => {
      const email = req.params.email
      const result = await noteCollection.find({email: email}).toArray()
      res.send(result)
    })

    app.get('/note/:id', verifyToken, async(req, res) => {
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await noteCollection.findOne(query)
      res.send(result)
    })

    app.post('/note', verifyToken, async(req, res) => {
      const note = req.body
      const result = await noteCollection.insertOne(note)
      res.send(result)
    })

    app.put('/note/:id', verifyToken, async(req, res) => {
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const options = { upsert: true };
      const Updatenote = req.body
      const updatedDoc = {
        $set: {
          title: Updatenote.title,
          description: Updatenote.description
        }
      }
      const result = await noteCollection.updateOne(filter,updatedDoc, options)
      res.send(result)
    })

    app.delete('/note/:id', verifyToken, async(req, res) => {
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await noteCollection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello from ScholarHub Server..')
})

app.listen(port, () => {
  console.log(`Scholar is running on port ${port}`)
})