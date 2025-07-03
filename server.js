// ✅ Step 1: Install Required Packages
// express, mongoose, puppeteer, body-parser
// npm install express mongoose puppeteer body-parser

const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');
const bodyParser = require('body-parser');
const { execSync } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Step 2: Database Connection


mongoose.connect('mongodb+srv://gofficial067:LJWRF4uHuc0bhTQO@cluster0.lqq4unw.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0')


    .then(() => console.log('✅ Database Connected'))
    .catch(err => console.error(err));

// ✅ Step 3: MongoDB Schemas
const userSchema = new mongoose.Schema({
    name: String,
    code: String,
    role: { type: String, default: "user" }  // New field added
});


const receiptSchema = new mongoose.Schema({
    customerId: String,
    customerName: String,
    address: String,
    amount: String,
    date: String,
    transactionId: String,
    enteredBy: {
        name: String,
        code: String
    }
});

const User = mongoose.model('User', userSchema);
const Receipt = mongoose.model('Receipt', receiptSchema);

// ✅ Step 4: Login Route
app.post('/login', async (req, res) => {
    const { name, code } = req.body;
    const user = await User.findOne({ name, code });
    if (!user) return res.send('Invalid Credentials');

    if (user.role === 'admin') {
        res.redirect(`/admin.html?name=${encodeURIComponent(name)}&code=${encodeURIComponent(code)}`);
    } else {
        res.redirect(`/user-dashboard.html?name=${encodeURIComponent(name)}&code=${encodeURIComponent(code)}`);
    }
});


// ✅ Step 5: Receipt Generate Route
app.post('/generate', async (req, res) => {
    const { customerId, amount, enteredName, enteredCode } = req.body;

    const user = await User.findOne({ name: enteredName, code: enteredCode });
    if (!user) return res.send('Unauthorized User');

    const today = new Date();
    const formattedDate = today.toLocaleDateString() + ' ' + today.toLocaleTimeString();

    const cseCommand = `python cse_calculation.py ${customerId}`;
    const transactionId = execSync(cseCommand).toString().trim();

    const receiptHtml = fs.readFileSync('./public/receipt-template.html', 'utf8');

    const filledHtml = receiptHtml
        .replace('{{CUSTOMER_ID}}', customerId)
        .replace('{{NAME}}', 'NAME_PLACEHOLDER')
        .replace('{{ADDRESS}}', 'ADDRESS_PLACEHOLDER')
        .replace('{{AMOUNT}}', amount)
        .replace('{{AMOUNT_WORDS}}', amount + ' मात्र')
        .replace('{{RECEIPT_NO}}', customerId * 100)
        .replace('{{DATE}}', formattedDate)
        .replace('{{TRANSACTION_ID}}', transactionId);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(filledHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const receipt = new Receipt({
        customerId,
        customerName: 'NAME_PLACEHOLDER',
        address: 'ADDRESS_PLACEHOLDER',
        amount,
        date: formattedDate,
        transactionId,
        enteredBy: { name: enteredName, code: enteredCode }
    });

    await receipt.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=Receipt.pdf');
    res.send(pdfBuffer);
});

// ✅ Step 6: Admin Route to View Entries
app.get('/all-entries', async (req, res) => {
    const { name, code } = req.query;
    const user = await User.findOne({ name, code });
    if (!user || user.role !== 'admin') return res.send('Unauthorized');

    const receipts = await Receipt.find();
    res.json(receipts);
});


app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
