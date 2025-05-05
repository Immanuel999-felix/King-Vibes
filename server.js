require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/wav') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Artist Account (Set these in .env)
const ARTIST_ACCOUNT = {
    email: process.env.ARTIST_EMAIL,
    password: bcrypt.hashSync(process.env.ARTIST_PASSWORD, 10),
    isArtist: true,
    token: jwt.sign({ isArtist: true }, process.env.JWT_SECRET)
};

// Temporary Database
let users = [ARTIST_ACCOUNT];
let posts = [];
let subscribers = [];

app.use(express.json());
app.use(express.static('public'));

// Authentication Middleware
const authenticateArtist = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.isArtist) return next();
        res.status(403).send('Artist access required');
    } catch {
        res.status(401).send('Invalid token');
    }
};

// Routes
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (email === ARTIST_ACCOUNT.email) {
        if (bcrypt.compareSync(password, ARTIST_ACCOUNT.password)) {
            return res.json({
                token: ARTIST_ACCOUNT.token,
                isArtist: true
            });
        }
        return res.status(401).send('Invalid credentials');
    }

    res.status(404).send('User not found');
});

app.post('/api/register', (req, res) => {
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    users.push({ ...req.body, password: hashedPassword });
    res.status(201).send('User created');
});

app.post('/api/subscribe', (req, res) => {
    subscribers.push(req.body.email);
    res.send('Subscribed successfully');
});

app.get('/api/posts', (req, res) => {
    res.json(posts);
});

app.post('/api/posts', authenticateArtist, upload.single('track'), (req, res) => {
    const newPost = {
        id: Date.now(),
        title: req.body.title,
        content: req.body.content,
        track: req.file ? `/uploads/${req.file.filename}` : null,
        date: new Date()
    };
    posts.unshift(newPost);
    res.status(201).json(newPost);
});

app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
