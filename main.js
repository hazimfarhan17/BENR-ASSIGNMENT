const express = require('express')
const app = express()
const port = process.env.PORT || 3000;
app.use(express.json())
const bcryptjs = require('bcryptjs')
var jwt = require('jsonwebtoken');

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

//Function to Generate Token
function generateToken(role) {
    const token = jwt.sign({
        role: role,
      }, 'TestKey', { expiresIn: '1h' });
      return token;
}

//Function to Verify Token
function verifyTokenAndRole(requiredRole) {
    return function (req, res, next) {
        const token = req.headers.authorization (' ')[1];
        console.log('Extracted Token:', token);
        if (!token) {
            return res.status(401).json({ error: 'Invalid Token' });
        }

        jwt.verify(token, 'TestKey', (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Wrong Token' });
            }

            // Check if the user has the required role
            if (decoded.role === requiredRole) {
                req.user = decoded;
                next();
            } else {
                res.status(403).json({ error: 'Insufficient privileges' });
            }
        });
    };
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html')
});

app.post('/login', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const user = await client.db("UtemSystem").collection("User").findOne({
        "username": username,
    });

    if (user) {
        const passwordMatch = await bcryptjs.compare(password, user.password);

        if (passwordMatch) {
            const role = user.role;
            const token = generateToken(role);

            if (role === "Student") {
                res.json({redirect: '/Homepage',token});
                console.log(token) // test
                console.log(role) //get role
                console.log(req.headers) //get token from header
            } else if (role === "Admin") {
                res.json({redirect: '/Admin',token});
            } else if (role === "Faculties") {
                res.json({redirect: '/Faculties',token});
            }
        } else {
            res.json({ error: 'Invalid username or password' });
        }
    } else {
        res.json({ error: 'Invalid username or password' });
    }
});

app.get('/Homepage', verifyTokenAndRole('Student'), (req, res) => {
    res.sendFile(__dirname + '/homepage.html')
});

app.get('/Faculties', verifyTokenAndRole('Faculties'), (req, res) => {
    res.sendFile(__dirname + '/Faculties.html')
});

app.get('/Admin', verifyTokenAndRole('Admin'),(req, res) => {
    res.sendFile(__dirname + '/admin.html')
});


app.get('/Admin/RegisterStudent', (req, res) => {
    res.sendFile(__dirname + '/register.html')
});

app.post('/Admin/RegisterStudent', (req, res) => {
    client.db("UtemSystem").collection("User").find({
        "student_id": { $eq: req.body.student_id }
    }).toArray().then((result) => {
        console.log(result)
        if (result.length > 0) {
            res.status(400).send('ID already exist')
            //res.json({ error: 'ID already exist' });
            return
        }
        else {
            const { username, password } = req.body;
            const { student_id, name, email, role, phone, PA } = req.body;
            console.log(username, password);

            const hash = bcryptjs.hashSync(password, 10);
            console.log(hash);
            client.db("UtemSystem").collection("User").insertOne({
                "username": username,
                "password": hash,
                "student_id": student_id,
                "name": name,
                "email": email,
                "role": role,
                "phone": phone,
                "PA": PA
            })
            res.send('register seccessfully')
        }
    })
});




app.get('/logout', (req, res) => {
    res.redirect('/')
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})