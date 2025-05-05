// server.js
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_123';
const ARTIST_EMAIL = process.env.ARTIST_EMAIL || 'artist@demo.com';
const ARTIST_PASSWORD = bcrypt.hashSync(
    process.env.ARTIST_PASSWORD || 'artist123!', 
    10
);

// Temporary database
let users = [];
let posts = [];

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    // Artist login
    if (email === ARTIST_EMAIL && bcrypt.compareSync(password, ARTIST_PASSWORD)) {
        const token = jwt.sign({ isArtist: true }, JWT_SECRET);
        return res.json({ token, isArtist: true });
    }

    // Regular user login
    const user = users.find(u => u.email === email);
    if (user && bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        return res.json({ token });
    }

    res.status(401).send('Invalid credentials');
});

app.get('/api/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json(decoded);
    } catch {
        res.status(401).send('Invalid token');
    }
});

app.get('/api/posts', (req, res) => {
    res.json(posts);
});

app.post('/api/posts', upload.single('track'), (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.isArtist) throw new Error();
        
        const newPost = {
            id: Date.now(),
            title: req.body.title,
            content: req.body.content,
            track: req.file ? `/uploads/${req.file.filename}` : null,
            date: new Date()
        };
        
        posts.unshift(newPost);
        res.json(newPost);
    } catch {
        res.status(403).send('Artist access required');
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
