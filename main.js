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
function generateToken(role, student_id, lecturer_id) {
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
        //console.log('Extracted Token:', token);

        jwt.verify(token, 'TestKey', (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Wrong Token' });
            }

            // Check if the user has the required role
            if (decoded.role === requiredRole) {
                // Pass decoded student_id to the route handler
                req.user = decoded;
                //console.log(decoded);
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
            const token = generateToken(role, student_id, lecturer_id);

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
app.post('/Admin/AddLecturer', verifyTokenAndRole('Admin'), (req, res) => {
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
            const { username, password, lecturer_id, name, email, role, phone, TeachingSubject } = req.body;
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
    const { facultyName, ProgramsName, SubjectName, studentList_id, email, phone} = req.body;

    try {
        // Check if the faculty already exists in the "Faculties" collection
        const facultyExists = await client.db("UtemSystem").collection("Faculties").findOne({
            "facultyName": { $eq: req.body.facultyName }
        });

        if (facultyExists) {
            res.status(400).send('Faculty already exists');
            return;
        }

        ///// checks student id list first

        // Insert faculty into the "Faculties" collection
        await client.db("UtemSystem").collection("Faculties").insertOne({
            "facultyName": facultyName,
            ProgramsName: ProgramsName,
            SubjectName: SubjectName,
            studentList_id: studentList_id,
            "email": email,
            "phone": phone,
        });

        res.send('Registration successful');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
//ADMIN ADD PROGRAMS NOT DONE
app.post('/Admin/AddPrograms', verifyTokenAndRole('Admin'), async (req, res) => {
    const {ProgramsName,SubjectName } = req.body;
    try {

        // Check if the Programs exists in the "Programs" collection
        const Prog = await client.db("UtemSystem").collection("Programs").findOne({
            "ProgramsName": ProgramsName
        });

        if (Prog) {
            res.status(400).send('Programs Already Exist');
            console.log(ProgramsName);
            return;
        }

        // Check if the Subjects exists in the "Programs" collection
        const Sub = await client.db("UtemSystem").collection("Programs").findOne({
            "SubjectName": SubjectName
        });

        if (Sub) {
            res.status(400).send('Subject Already Enlisted in another programs');
            console.log(ProgramsName);
            return;
        }

        // Check if the Programs exists in the "Faculties" collection
        const ProgInfo = await client.db("UtemSystem").collection("Faculties").findOne({
            "ProgramsName": ProgramsName,
        });

        if (!ProgInfo) {
            res.status(400).send('Programs Not Enlisted By This Faculty');
            console.log(ProgramsName);
            return;
        }

        // Check if the Subject exists in the "Faculties" collection

        // Insert data into the "Programs" collection
        await client.db("UtemSystem").collection("Programs").insertOne({
            "facultyName": ProgInfo.facultyName,
            "ProgramsName": ProgramsName,
            "SubjectName": SubjectName
        });

        res.status(200).send('Programs added successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
/////////////////////////////////////////////////////////////////////////////////////////////////
// VIEW STUDENT LIST : kena buat aggregate dan sort by faculty (hazim)
app.get('/Admin/ViewStudent', verifyTokenAndRole('Admin'), (req, res) => {
    client.db("UtemSystem").collection("User").find({

        role: { $eq: "Student" }

    }).toArray().then((result) => {
        res.send(result)
    })
});

// record attendance by student // DONE /////////////////////////////////////////////////////////////////
app.post('/Homepage/RecordAttendance', verifyTokenAndRole('Student'), async (req, res) => {
    const { student_id, SubjectName, attendance } = req.body;

    // Valid attendance values
    const validAttendanceValues = ['present', 'absent'];

    try {

        // Check if the Student Enlisted in class in the "Subjects" collection
        const Enlisted = await client.db("UtemSystem").collection("Subjects").findOne({
            "student_id": { $eq: req.body.student_id }
        });

        if (!Enlisted) {
            res.status(400).send('You Are Not Enlisted to this Subject');
            return;
        }


        // Check if the SubjectName exist in faculties collections
        const Subject = await client.db("UtemSystem").collection("Subjects").findOne({
            "SubjectName": { $eq: req.body.SubjectName }
        });

        if (!Subject) {
            res.status(400).send('Subject is Not Enlisted');
            return;
        }

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
            "SubjectName": { $eq: req.body.SubjectName }
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
            "SubjectName": SubjectName,
            "attendance": attendance,
            "timestamp": timestamp
        });

        res.send('Attendance recorded');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Lecturer ADD SUBJECT DONE/////////////////////////////////////////////////////////////////////////////
app.post('/Lecturer/AddSubject', verifyTokenAndRole('Lecturer'), async (req, res) => {
    const { student_id, SubjectName,ProgramsName} = req.body;
    const lecturer_id = req.user.lecturer_id;
    try {

        // Check if the Subject exists in the "Subjects" collection
        const Subjects = await client.db("UtemSystem").collection("Subjects").findOne({
            "SubjectName": SubjectName
        });

        if (Subjects) {
            res.status(400).send('Subject Already Exist');
            console.log(SubjectName);
            return;
        }

        // Check if the Subject exists in the "Faculties" collection
        const SubjectInfo = await client.db("UtemSystem").collection("Faculties").findOne({
            "SubjectName": SubjectName,
        });

        if (!SubjectInfo) {
            res.status(400).send('Subject Not Enlisted By This Faculty');
            console.log(SubjectName);
            return;
        }

        // Check if the Subject exists in the "Programs" collection
        const SubInfo = await client.db("UtemSystem").collection("Programs").findOne({
            "ProgramsName": ProgramsName,
            "SubjectName": SubjectName,
        });

        if (!SubInfo) {
            res.status(400).send('This Subject Not Enlisted By This Programs');
            console.log(SubjectName);
            return;
        }

        // Check if the lecturer is assigned to the teaching subject in the "User" collection
        const TSubject = await client.db("UtemSystem").collection("User").findOne({
            "TeachingSubject": SubjectName,
            "lecturer_id": lecturer_id,
        });

        if (!TSubject) {
            return res.status(403).json({ error: 'Invalid Lecturer ID or Lecturer not assigned to the teaching subject' });
        }

        // Insert data into the "Subjects" collection
        await client.db("UtemSystem").collection("Subjects").insertOne({
            "facultyName": SubjectInfo.facultyName,
            "ProgramsName": SubInfo.ProgramsName,
            "LecturerName": TSubject.name,
            "SubjectName": SubjectName,
            student_id: student_id,
        });

        res.status(200).send('Subject added successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Lecturer view Attendance DONE //////////////////////////////////////////////////////////////////
app.post('/Lecturer/ViewRecordAttendance', verifyTokenAndRole('Lecturer'), async (req, res) => {
    const { subject } = req.body;

    try {
        // Check if the Subject exists in the "Attendance" collection
        const SubjectName = await client.db("UtemSystem").collection("Attendance").findOne({
            "SubjectName": { $eq: req.body.SubjectName }
        });

        if (!SubjectName) {
            res.status(400).send('Subject not found');
            console.log(SubjectName)
            return;
        }

        const AttendList = await client.db("UtemSystem").collection("Attendance").find({
            "SubjectName": { $in: req.body.SubjectName }
        }).toArray();
        res.send(AttendList);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
//NOT DONE
app.post('/Lecturer/ViewStudentlist', verifyTokenAndRole('Lecturer'), async (req, res) => {
    const { student_id, SubjectName} = req.body;

    try {
        // Check if the subject exists in the "Subjects" collection
        const subject = await client.db("UtemSystem").collection("Subjects").findOne({
            "SubjectName": SubjectName
        });

        if (!subject) {
            res.status(400).send('Subject not found');
            return;
        }

        // Get the student list for the specific subject
        const studentList = await client.db("UtemSystem").collection("Subjects").findOne({
            "SubjectName": SubjectName,
            "student_id": student_id
        });

        if (!studentList) {
            res.status(400).send('Student not found for the given subject');
            return;
        }

        // Now, retrieve the student name from the "User" collection
        const user = await client.db("UtemSystem").collection("User").find({
            "student_id": student_id
        }).toArray();
        console.log(user)

        if (!user) {
            res.status(400).send('Student not found in the User collection');
            return;
        }

        const studentName = user.name; 
        res.status(200).json({ student_id, studentName });

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


//DONE NOT TESTED
app.patch('/Lecturer/UpdateStudent', verifyTokenAndRole('Lecturer'), async (req, res) => {
    const { facultyName, studentList_id } = req.body;

    try {
        // Check if the Faculty exists in the "Faculties" collection
        const faculty = await client.db("UtemSystem").collection("Faculties").findOne({
            "FacultyName": { $eq: facultyName }
        });

        if (!faculty) {
            return res.status(400).send('Faculty not Exist');
        }

        if (req.user.lecturer_id !== req.body.lecturer_id) {
            return res.status(403).json({ error: 'Invalid Lecturer ID in the request' });
        }

        const updatedResult = await client.db("UtemSystem").collection("Attendance").updateMany(
            { "facultyName": facultyName },
            { $set: { "studentList_id": [studentList_id] } }
        );

        res.send(updatedResult);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

//VIEW RECORD ATTENDANCE STUDENT //DONE////////////////////////////////////////////////////////////////////////////////
app.post('/Homepage/ViewRecordAttendance', verifyTokenAndRole('Student'), async (req, res) => {
    const { student_id } = req.body;

    try {
        // Check if the ID exists in the "Attendance" collection
        const Student = await client.db("UtemSystem").collection("Attendance").findOne({
            "student_id": { $eq: req.body.student_id }
        });

        if (!student_id) {
            res.status(400).send('ID not found');
            console.log(Student)
            return;
        }
        if (req.user.student_id !== student_id) {
            return res.status(403).json({ error: 'Invalid student ID in the request' });
            return;
        }

        const AttendList = await client.db("UtemSystem").collection("Attendance").find({
            "student_id": req.user.student_id,
            "SubjectName": { $eq: req.body.SubjectName }
        }).toArray();
        res.send(AttendList);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }

});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/logout', (req, res) => {
    res.redirect('/')
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})