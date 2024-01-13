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
function generateToken(role,student_id,lecturer_id) {
    const token = jwt.sign({
        role: role,
        student_id: student_id,
        lecturer_id: lecturer_id,
    }, 'TestKey', { expiresIn: '1h' });
    return token;
}

//Function to Verify Token
function verifyTokenAndRole(requiredRole) {
    return function (req, res, next) {
        const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
        console.log('Extracted Token:', token);

        jwt.verify(token, 'TestKey', (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Wrong Token' });
            }

            // Check if the user has the required role
            if (decoded.role === requiredRole) {
                // Pass decoded student_id to the route handler
                req.user = decoded;
                console.log(decoded);
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
            const student_id = user.student_id;
            const lecturer_id = user.lecturer_id;
            const token = generateToken(role, student_id,lecturer_id);

            if (role === "Student") {
                res.json({ redirect: '/Homepage', token });
                console.log(token)
            } else if (role === "Admin") {
                res.json({ redirect: '/Admin', token });
                console.log(token)
            } else if (role === "Lecturer") {
                res.json({ redirect: '/Lecturer', token });
                console.log(token)
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

app.get('/Lecturer', verifyTokenAndRole('Faculties'), (req, res) => {
    res.sendFile(__dirname + '/Faculties.html')
});

app.get('/Admin', verifyTokenAndRole('Admin'), (req, res) => {
    res.sendFile(__dirname + '/admin.html')
});

app.get('/Admin/RegisterStudent', (req, res) => {
    res.sendFile(__dirname + '/register.html')
});

//ADD STUDENT
app.post('/Admin/RegisterStudent', verifyTokenAndRole('Admin'), (req, res) => {
    client.db("UtemSystem").collection("User").find({
        "student_id": { $eq: req.body.student_id },
    }).toArray().then((result) => {
        console.log(result)
        if (result.length > 0) {
            res.status(400).send('ID already exist')
            res.send(result)
            return
        }
        else {
            const { username, password, student_id, name, email, role, phone, PA } = req.body;
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

// ADD LECTURER
app.post('/Admin/Lecturer', verifyTokenAndRole('Admin'), (req, res) => {
    client.db("UtemSystem").collection("User").find({
        "lecturer_id": { $eq: req.body.lecturer_id },
    }).toArray().then((result) => {
        console.log(result)
        if (result.length > 0) {
            res.status(400).send('ID already exist')
            res.send(result)
            return
        }
        else {
            const { username, password, lecturer_id, name, email, role, phone, TeachingSubject} = req.body;
            console.log(username, password);

            const hash = bcryptjs.hashSync(password, 10);
            console.log(hash);
            client.db("UtemSystem").collection("User").insertOne({
                "username": username,
                "password": hash,
                "lecturer_id": lecturer_id,
                "name": name,
                "email": email,
                "role": role,
                "phone": phone,
                "TeachingSubject": TeachingSubject
            })
            res.send('register seccessfully')
        }
    })
});

//ADD FACULTY
app.post('/Admin/CreateFaculty', verifyTokenAndRole('Admin'), async (req, res) => {
    const { facultyName, programs, subject, student_id, email, phone, session } = req.body;

    try {
        // Check if the student ID exists in the "User" collection
        const student = await client.db("UtemSystem").collection("User").findOne({
            "student_id": { $eq: req.body.student_id}
        });

        if (!student) {
            res.status(400).send('Student ID not found');
            console.log(student)
            return;
        }

        // Check if the faculty already exists in the "Faculties" collection
        const facultyExists = await client.db("UtemSystem").collection("Faculties").findOne({
            "facultyName":{$eq: req.body.facultyName },
            "student_id": {$eq: req.body.student_id }
        });

        if (facultyExists) {
            res.status(400).send('Faculty already exists');
            return;
        }
        if (student_id) {
            res.status(400).send('Student ID already exists');
            return;
        }
        
        // Insert faculty into the "Faculties" collection
        await client.db("UtemSystem").collection("Faculties").insertOne({
            "facultyName": facultyName,
            programs: {
                "programsName": programs
            },
            subject: {
                "subjectName": subject
            },
            "studentList_id": [
                 studentList_id
            ],
            "email": email,
            "phone": phone,
            session: {
                "sessionDate": session
            }
        });

        res.send('Registration successful');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// VIEW STUDENT LIST : kena buat aggregate dan sort by faculty (hazim)
app.get('/Admin/ViewStudent', verifyTokenAndRole('Admin'), (req, res) => {
    client.db("UtemSystem").collection("User").find({  

     role: { $eq: "Student" }

    }).toArray().then((result) => {
        res.send(result)
    })
});

// record attendance by student 
app.post('/Homepage/RecordAttendance', verifyTokenAndRole('Student'), async (req, res) => {
    const { student_id, subject, attendance } = req.body;

    // Valid attendance values
    const validAttendanceValues = ['present', 'absent'];

    try {
        // Check if the student ID exists in the "User" collection
        const student = await client.db("UtemSystem").collection("User").findOne({
            "student_id": { $eq: req.body.student_id }
        });

        if (req.user.student_id !== student_id) {
            return res.status(403).json({ error: 'Invalid student ID in the request' });
            return;
        }

        if (!student) {
            res.status(400).send('Student ID not found');
            return;
        }

        // Check if the student already submits attendance in the "Attendance" collection
        const existingAttendance = await client.db("UtemSystem").collection("Attendance").findOne({
            "student_id": { $eq: req.body.student_id },
            "subject": { $eq: req.body.subject }
        });

        if (existingAttendance) {
            res.status(400).send('Attendance already recorded');
            return;
        }

        // Validate attendance value
        if (!validAttendanceValues.includes(attendance)) {
            res.status(400).send('Invalid attendance value. Accepted values are "present" or "absent".');
            return;
        }

        // Get the current timestamp
        const timestamp = new Date().toLocaleString();;

        // Insert Attendance by present or absent into the "Attendance" collection with timestamp
        await client.db("UtemSystem").collection("Attendance").insertOne({
            "student_id": student_id,
            "subject": subject,
            "attendance": attendance,
            "timestamp": timestamp
        });

        res.send('Attendance recorded');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/Lecturer/ViewRecordAttendance', verifyTokenAndRole('Lecturer'), async (req, res) => {
    const {subject} = req.body;

    try {
        // Check if the Subject exists in the "Attendance" collection
        const SubjectName = await client.db("UtemSystem").collection("Attendance").findOne({
            "subject": { $eq: req.body.subject}
        });

        if (!SubjectName) {
            res.status(400).send('Subject not found');
            console.log(SubjectName)
            return;
        }
        if (req.user.lecturer_id !== lecturer_id) {
            return res.status(403).json({ error: 'Invalid lecturer ID in the request' });
            return;
        }

        const AttendList = await client.db("UtemSystem").collection("Attendance").find({
        "subject": { $eq: req.body.subject }
        }).toArray();
        res.send(AttendList);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }

});

app.post('/Lecturer/ViewStudentlist', verifyTokenAndRole('Lecturer'), async (req, res) => {
    const {subject} = req.body;

    try {
        // 
        const Subject = await client.db("UtemSystem").collection("Faculties").findOne({
            "subject": { $eq: req.body.subject}
        }).toArray();

        if (!Subject) {
            res.status(400).send('Student not found');
            console.log(SubjectName)
            return;
        }
        if (req.user.lecturer_id !== lecturer_id) {
            return res.status(403).json({ error: 'Invalid lecturer ID in the request' });
            return;
        }

        const List = await client.db("UtemSystem").collection("Faculties").find({
        "studentList_id": studentList_id 
        }).toArray();
        res.send(List);

        const name = await client.db("UtemSystem").collection("User").find({
        "name": name 
        }).toArray();
        res.send(name);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }

});

app.get('/logout', (req, res) => {
    res.redirect('/')
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})