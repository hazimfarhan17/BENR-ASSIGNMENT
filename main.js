const express = require('express')
const app = express()
const port = process.env.PORT || 3000;
app.use(express.json())
const bcryptjs = require('bcryptjs')

app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://Hazim:987654321@cluster0.hbjf00x.mongodb.net/?retryWrites=true&w=majority";

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
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {
        // Ensures that the client will close when you finish/error
        ///   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html')
});

app.post('/login', (req, res) => {
    client.db("BENR2423").collection("users").find({
        "username":{$eq:req.body.username},
        "password":{$eq:req.body.password}
    })
    if (req.body.username == 'admin' && req.body.password == 'admin') {
        res.redirect('/admin')
    }
    else{
        res.redirect('/homepage')
    }
});

app.get('/homepage', (req, res) => {
    res.sendFile(__dirname + '/homepage.html')
});


/*
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/register.html')
});

app.post('/register', (req, res) => {
    client.db("BENR2423").collection("users").find({
      "username":{$eq:req.body.username}}).toArray().then((result) =>{
        console.log(result)
      if (result.length > 0){
        res.status(400).send('username already exist')
        return
      }
      else{
        const { username, password } = req.body;
        console.log(username, password);
        const hash = bcryptjs.hashSync(password, 10);
        console.log(hash);
        client.db("BENR2423").collection("users").insertOne({
          "username": username,
          "password": password,
          })
        res.send('register seccessfully')
        return res.redirect(__dirname + '/home.html')
      }
    })
  });
*/

app.get('/logout', (req, res) => {
    res.redirect('/')
});

app.post('/reg', (req, res) => {
    const { username, password } = req.body;
    console.log(username, password);
    const {student_id, name, email, role, phone, PA } = req.body;
    
    const hash = bcryptjs.hashSync(password, 10);
    console.log(hash);
    client.db("UtemSystem").collection("users").insertOne({ "username": username, "password": hash })
  })
  

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})