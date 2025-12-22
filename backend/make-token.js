require('dotenv').config();
const jwt = require('jsonwebtoken');

const userId = process.argv[2] || 22;
const isAdmin = !!process.argv[3];

const secret = process.env.JWT_SECRET || '1j1ozq4e1j1ozq4e1j1ozq4E';
const token = jwt.sign({ userId: Number(userId), isAdmin }, secret, { expiresIn: '24h' });
console.log(token);
