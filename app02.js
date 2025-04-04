const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const { PublicClientApplication } = require('@azure/msal-node');
const { v4: uuidv4 } = require('uuid'); // For generating state

const upload = multer();
const app = express();

// MSAL Configuration (Replace placeholders with your actual values)
const msalConfig = {
    auth: {
        clientId: '3bcc88e2-9967-4de9-b428-b6ab48db19ae', // Replace with your Azure AD App's Client ID
        authority: 'https://login.microsoftonline.com/5558459a-5e38-45de-8742-ec475127560c', // Replace with your Tenant ID
        clientSecret: '2a052a051337-3580-4f04-be0b-5b58d9d0dc73' // Replace with your Azure AD App's Client Secret
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

// Session Middleware Configuration
app.use(session({
    secret: 'YOUR_STRONG_SECRET_KEY', // Replace with a strong, unique secret key
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Ensure secure cookies in production
        httpOnly: true, // Prevent client-side JavaScript from accessing cookies
        maxAge: 3600000 // Example: 1 hour session duration (in milliseconds)
    }
}));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Login Route
app.get('/login', (req, res) => {
    const authCodeUrlParameters = {
        scopes: ['user.read'],
        redirectUri: `https://${req.get('host')}/auth/callback`, // Dynamically build redirect URI
        state: uuidv4() // Add state parameter for security
    };

    pca.getAuthCodeUrl(authCodeUrlParameters)
        .then((response) => {
            req.session.authCodeRequest = { state: authCodeUrlParameters.state }; // Store state for validation
            res.redirect(response);
        })
        .catch((error) => {
            console.error('Error generating auth code URL:', error);
            res.status(500).send('Authentication error: Could not initiate login.');
        });
});

// Callback Route
app.get('/auth/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
        console.error('Authentication callback error:', error, error_description);
        return res.status(401).send(`Authentication error: ${error_description}`);
    }

    if (!code || !state || !req.session.authCodeRequest || req.session.authCodeRequest.state !== state) {
        console.error('Invalid authentication callback - missing code, state, or state mismatch.');
        return res.status(400).send('Authentication error: Invalid callback.');
    }

    const tokenRequest = {
        code: code,
        scopes: ['user.read'],
        redirectUri: `https://${req.get('host')}/auth/callback`, // Dynamically build redirect URI
        state: req.session.authCodeRequest.state // Use stored state for validation
    };

    try {
        const response = await pca.acquireTokenByCode(tokenRequest);
        req.session.user = response.account;
        delete req.session.authCodeRequest; // Clear the stored state
        res.redirect('/');
    } catch (error) {
        console.error('Error acquiring token:', error);
        res.status(500).send('Authentication error: Could not retrieve user information.');
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Error logging out.');
        }
        res.redirect('/'); // Redirect to the homepage or a logout success page
    });
});

// Main Route
app.get('/', async (req, res) => {
    let userName = 'Guest';
    let loginLink = '<a href="/login">Login</a>';
    let logoutLink = '';

    if (req.session.user) {
        userName = req.session.user.username || req.session.user.name; // Try to get username or name
        loginLink = '';
        logoutLink = '<a href="/logout">Logout</a>';
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
                    <li><a href="/">Home</a></li>
                    <li><a href="#">About</a></li>
                    <li><a href="#">Contact</a></li>
                    ${logoutLink}
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
                    try {
                        const response = await fetch('/upload', {
                            method: 'POST',
                            body: formData
                        });
                        const result = await response.json();
                        if (response.ok) {
                            alert('Files uploaded successfully!');
                        } else {
                            alert(\`Error: \${result.message}\`);
                        }
                    } catch (error) {
                        console.error('Error uploading files:', error);
                        alert('An error occurred while uploading files.');
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// Endpoint to handle file uploads (You'll need to implement this)
app.post('/upload', upload.any(), async (req, res) => {
    try {
        console.log('Files received:', req.files);
        // Implement your Azure Blob Storage upload logic here
        res.json({ message: 'Files uploaded successfully!' });
    } catch (error) {
        console.error('Error handling file upload:', error);
        res.status(500).json({ message: 'Failed to upload files.' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});