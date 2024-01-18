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
            res.send('register successfully')
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
            res.send('register successfully')
        }
    })
});

//ADD FACULTY //DONE
app.post('/Admin/CreateFaculty', verifyTokenAndRole('Admin'), async (req, res) => {
    const { facultyName, ProgramsName, SubjectName, student_id, email, phone } = req.body;

    try {
        // Check if the faculty already exists in the "Faculties" collection
        const facultyExists = await client.db("UtemSystem").collection("Faculties").findOne({
            "facultyName": { $eq: req.body.facultyName }
        });

        if (facultyExists) {
            res.status(400).send('Faculty already exists');
            return;
        }

        // Check if the ProgramsName exists in the "Faculties" collection
        const Prog = await client.db("UtemSystem").collection("Faculties").findOne({
            "ProgramsName": { $in: req.body.ProgramsName }
        });

        if (!Prog) {
            res.status(400).send('Program not enlisted by this faculty');
            return;
        }

        // Check if the SubjectName exists in the "Faculties" collection
        const Sub = await client.db("UtemSystem").collection("Faculties").findOne({
            "SubjectName": { $in: req.body.SubjectName }
        });

        if (!Sub) {
            res.status(400).send('This Subject is not enlisted by this faculty');
            return;
        }

        // Check if the student_id already exists in the "Faculties" collection
        const Student = await client.db("UtemSystem").collection("Faculties").findOne({
            "student_id": { $in: req.body.student_id }
        });

        if (Student) {
            res.status(400).send('Student already enroll to another faculty');
            return;
        }

        // Insert faculty into the "Faculties" collection
        await client.db("UtemSystem").collection("Faculties").insertOne({
            "facultyName": facultyName,
            ProgramsName: ProgramsName,
            SubjectName: SubjectName,
            student_id: student_id,
            "email": email,
            "phone": phone,
        });

        res.send('Registration successful');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
//ADMIN ADD PROGRAMS DONE
app.post('/Admin/AddPrograms', verifyTokenAndRole('Admin'), async (req, res) => {
    const { ProgramsName, SubjectName } = req.body;
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
            "SubjectName": { $in: req.body.SubjectName }
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
        const SubF = await client.db("UtemSystem").collection("Faculties").findOne({
            "SubjectName": { $in: req.body.SubjectName }
        });

        if (!SubF) {
            res.status(400).send('Subject not enlisted by this faculty');
            return;
        }

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

//ADMIN UPDATE STUDENT IN FACULTY //DONE
app.patch('/Admin/UpdateStudentInFaculty', verifyTokenAndRole('Admin'), async (req, res) => {
    const { facultyName, student_id } = req.body;

    try {
        // Check if the student ID exists in the "User" collection
        const User = await client.db("UtemSystem").collection("User").findOne({
            "student_id": student_id
        });

        if (!User) {
            return res.status(400).send('Student is not Exist');
        }

        // Check if the Faculty exists in the "Faculties" collection
        const faculty = await client.db("UtemSystem").collection("Faculties").findOne({
            "facultyName": { $eq: facultyName }
        });
        if (!faculty) {
            return res.status(400).send('Faculty not Exist');
        }

        // Check if the ID exists in the "Faculties" collection
        const ID = await client.db("UtemSystem").collection("Faculties").findOne({
            "facultyName": faculty.facultyName,
            "student_id": User.student_id
        });
        if (ID) {
            return res.status(400).send('ID Already Exist in this faculty');
        }

        const updateFaculty = await client.db("UtemSystem").collection("Faculties").updateOne(
            { "facultyName": facultyName },
            { $push: { "student_id": student_id } }
        );

        res.send("Student Added to Faculty");
        console.log("Successfully added student to faculty");

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// ADMIN DELETE USER IF USER LEAVE FACULTY
app.delete('/Admin/DeleteStudent/:student_id', verifyTokenAndRole('Admin'), async (req, res) => {
    const student_id = req.params.student_id;

    try {
        // Check if the student ID exists in the "User" collection
        const user = await client.db("UtemSystem").collection("User").findOne({
            "student_id": student_id
        });

        if (!user) {
            return res.status(400).send('Student Not Found');
        }

        // Check if the student ID exists in the "Faculties" collection
        const student = await client.db("UtemSystem").collection("Faculties").findOne({
            "student_id": student_id
        });

        if (!student) {
            return res.status(400).send('Student Not Found');
        }

        // Delete the student from the "Faculties" collection
        const deleteStudentFromFaculties = await client.db("UtemSystem").collection("Faculties").updateOne(
            { facultyName: student.facultyName },
            { $pull: { "student_id": student_id } }
        );

        // Remove the student from the "Subjects" collection
        const removeFromSubjects = await client.db("UtemSystem").collection("Subjects").updateMany(
            { "student_id": student_id },
            { $pull: { "student_id": student_id } }
        );

        // Delete the user from the "User" collection
        const deleteUser = await client.db("UtemSystem").collection("User").deleteOne({
            "student_id": student_id
        });

        res.send("Student and related information deleted successfully");
        console.log("Successfully deleted student and related information");
        console.log(deleteStudentFromFaculties);
        console.log(removeFromSubjects);
        console.log(deleteUser);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// VIEW STUDENT LIST : kena buat aggregate dan sort by faculty (hazim) // NOT DONE
app.get('/Admin/ViewStudent', verifyTokenAndRole('Admin'), (req, res) => {
    client.db("UtemSystem").collection("User").find({

        role: { $eq: "Student" }

    }).toArray().then((result) => {
        res.send(result)
    })
});

// RECORD ATTENDANCE DONE
app.post('/Homepage/RecordAttendance', verifyTokenAndRole('Student'), async (req, res) => {
    const { student_id, SubjectName, attendance } = req.body;

    // Valid attendance values
    const validAttendanceValues = ['present', 'absent'];

    try {

        // Check if the SubjectName exist in Subjects collections
        const Subject = await client.db("UtemSystem").collection("Subjects").findOne({
            "SubjectName": { $eq: req.body.SubjectName }
        });

        if (!Subject) {
            res.status(400).send('Subject is Not Enlisted');
            return;
        }

        // Check if the Student Enlisted in class in the "Subjects" collection
        const Enlisted = await client.db("UtemSystem").collection("Subjects").findOne({
            "student_id": { $eq: req.body.student_id }
        });

        if (!Enlisted) {
            res.status(400).send('You Are Not Enlisted to this Subject');
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

// VIEW RECORD ATTENDANCE STUDENT //DONE
app.post('/Homepage/ViewRecordAttendance', verifyTokenAndRole('Student'), async (req, res) => {

    try {
        // Check if the ID exists in the "Attendance" collection
        const Student = await client.db("UtemSystem").collection("Attendance").findOne({
            "student_id": req.user.student_id
        });

        if (!Student) {
            res.status(400).send('No Attendance Record Found');
            console.log(Student)
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

// LECTURER VIEW STUDENT DETAIL //DONE
app.get('/Homepage/ViewDetail', verifyTokenAndRole('Student'), async (req, res) => {
    const student_id = req.user.student_id;

    try {
        // Check if the student is exist or not in "User" collection
        const User = await client.db("UtemSystem").collection("User").findOne({
            "student_id": student_id,
        });

        // Now, retrieve the student name from the "User" collection
        const user = await client.db("UtemSystem").collection("User").find({
            "student_id": { $eq: User.student_id }
        }).project({
            "name": 1,
            "student_id": 1,
            "email": 1,
            "phone": 1,
            "PA": 1,
            "_id": 0 // Exclude the _id field
        }).toArray();

        if (!user || user.length === 0) {
            res.status(400).send('Student not found in the User collection');
            return;
        }
        res.send(user);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// LECTURER ADD SUBJECT //DONE
app.post('/Lecturer/AddSubject', verifyTokenAndRole('Lecturer'), async (req, res) => {
    const { student_id, SubjectName, ProgramsName } = req.body;
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

// LECTURER UPDATE STUDENT IN SUBJECT DONE
app.patch('/Lecturer/UpdateStudentInSubject', verifyTokenAndRole('Lecturer'), async (req, res) => {
    const { student_id } = req.body;
    const lecturer_id = req.user.lecturer_id;

    try {
        // Check if the lecturer is assigned to the teaching subject in the "User" collection
        const lecturer = await client.db("UtemSystem").collection("User").findOne({
            "lecturer_id": lecturer_id,
        });

        // Check if the student ID exists in the "Faculties" collection
        const student = await client.db("UtemSystem").collection("Faculties").findOne({
            "student_id": student_id
        });

        if (!student) {
            return res.status(400).send('Student Not Found in Faculty');
        }

        // Check if the Subject exists in the "Subjects" collection
        const subject = await client.db("UtemSystem").collection("Subjects").findOne({
            "SubjectName": lecturer.TeachingSubject,
        });

        if (!subject) {
            return res.status(400).send('Subject Not Found');
        }

        // Check if the student ID already exists in the Subject
        if (subject.student_id.includes(student_id)) {
            return res.status(400).send('Student Already Exists in this Subject');
        }

        // Update the Subject to add the new student
        const updateSubject = await client.db("UtemSystem").collection("Subjects").updateOne(
            { "SubjectName": subject.SubjectName },
            { $push: { "student_id": student_id } }
        );

        res.send("Student Added to Subject");
        console.log("Successfully added student to Subject");
        console.log(updateSubject);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// LECTURER VIEW RECORD ATTENDANCE //DONE
app.get('/Lecturer/ViewRecordAttendance', verifyTokenAndRole('Lecturer'), async (req, res) => {
    const lecturer_id = req.user.lecturer_id;

    try {
        // Check if the lecturer is assigned to the teaching subject in the "User" collection
        const TSubject = await client.db("UtemSystem").collection("User").findOne({
            "lecturer_id": lecturer_id,
        });

        // Check if the Subject exists in the "Attendance" collection
        const AttendList = await client.db("UtemSystem").collection("Attendance").find({
            "SubjectName": TSubject.TeachingSubject,
        }).toArray();
        res.send(AttendList);
        
        if (!AttendList) {
            res.status(400).send('No Attendance Record Found');
            return;
        }
    } 
    catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }

});

// LECTURER VIEW STUDENT DETAIL //DONE
app.get('/Lecturer/ViewStudentDetail', verifyTokenAndRole('Lecturer'), async (req, res) => {
    const lecturer_id = req.user.lecturer_id;

    try {
        // Check if the lecturer is assigned to the teaching subject in the "User" collection
        const TSubject = await client.db("UtemSystem").collection("User").findOne({
            "lecturer_id": lecturer_id,
        });

        // Check if the subject exists in the "Subjects" collection
        const subject = await client.db("UtemSystem").collection("Subjects").findOne({
            "SubjectName": TSubject.TeachingSubject,
        });

        // Now, retrieve the student name from the "User" collection
        const user = await client.db("UtemSystem").collection("User").find({
            "student_id": { $in: subject.student_id }
        }).project({
            "name": 1,
            "student_id": 1,
            "email": 1,
            "phone": 1,
            "PA": 1,
            "_id": 0 // Exclude the _id field
        }).toArray();

        if (!user || user.length === 0) {
            res.status(400).send('Student not found in the User collection');
            return;
        }
        res.send(user);

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