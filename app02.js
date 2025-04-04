const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const { PublicClientApplication } = require('@azure/msal-node');

const upload = multer();
const app = express();

// MSAL configuration
const msalConfig = {
    auth: {
        clientId: '3bcc88e2-9967-4de9-b428-b6ab48db19ae', // Replace with your Azure AD App's Client ID
        authority: 'https://login.microsoftonline.com/5558459a-5e38-45de-8742-ec475127560c', // Replace with your Tenant ID
        clientSecret: '2a051337-3580-4f04-be0b-5b58d9d0dc73' // Replace with your Azure AD App's Client Secret
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: 'Info',
        },
    },
};

const pca = new PublicClientApplication(msalConfig);

// Session middleware
app.use(session({
    secret: 'your_secret_key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: false,
}));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Login route
app.get('/login', (req, res) => {
    const authCodeUrlParameters = {
        scopes: ['user.read'],
        redirectUri: 'http://nodejs01appservice-acgxbsa4f9byaxat.uksouth-01.azurewebsites.net/auth/callback',
    };

    pca.getAuthCodeUrl(authCodeUrlParameters)
        .then((response) => {
            res.redirect(response);
        })
        .catch((error) => {
            console.error(error);
            res.send('Authentication error');
        });
});

// Callback route
app.get('/auth/callback', async (req, res) => {
    const tokenRequest = {
        code: req.query.code,
        scopes: ['user.read'],
        redirectUri: 'http://localhost:3000/auth/callback',
    };

    try {
        const response = await pca.acquireTokenByCode(tokenRequest);
        req.session.user = response.account;
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.send('Authentication error');
    }
});

// Main route
app.get('/', async (req, res) => {
    let userName = 'Guest';
    let loginLink = '<a href="/login">Login</a>';

    if (req.session.user) {
        userName = req.session.user.username;
        loginLink = ''; // Remove the login link if logged in
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>File Upload to Azure Blob Storage</title>
            <style>
                /* Add your CSS styles here */
            </style>
        </head>
        <body>
            <div class="top-nav">
                <h1>Azure File Upload</h1>
                <ul>
                    <li><a href="#">Home</a></li>
                    <li><a href="#">About</a></li>
                    <li><a href="#">Contact</a></li>
                </ul>
            </div>
            <div class="sidebar">
                <ul>
                    <li><a href="#">Dashboard</a></li>
                    <li><a href="#">Upload Files</a></li>
                    <li><a href="#">Settings</a></li>
                    <li><a href="#">Help</a></li>
                </ul>
            </div>
            <div class="main-content">
                <div class="form-container">
                    <h1>Welcome, ${userName}!</h1>
                    ${loginLink}
                    <h2>Upload Files to Azure Blob Storage</h2>
                    <form id="uploadForm" enctype="multipart/form-data">
                        <div>
                            <label for="section1">Section 1:</label>
                            <input type="file" id="section1" name="section1">
                        </div>
                        <div>
                            <label for="section2">Section 2:</label>
                            <input type="file" id="section2" name="section2">
                        </div>
                        <div>
                            <label for="section3">Section 3:</label>
                            <input type="file" id="section3" name="section3">
                        </div>
                        <div>
                            <label for="section4">Section 4:</label>
                            <input type="file" id="section4" name="section4">
                        </div>
                        <div>
                            <label for="section5">Section 5:</label>
                            <input type="file" id="section5" name="section5">
                        </div>
                        <button type="button" onclick="uploadFiles()">Upload Files</button>
                    </form>
                    <p>Choose one file for each section and click "Upload Files".</p>
                </div>
            </div>
            <script>
                async function uploadFiles() {
                    const formData = new FormData(document.getElementById('uploadForm'));
                    // ... (rest of your uploadFiles function)
                }
            </script>
        </body>
        </html>
    `);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});