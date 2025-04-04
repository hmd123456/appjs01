const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const { PublicClientApplication } = require('@azure/msal-node');
const { v4: uuidv4 } = require('uuid');

const upload = multer();
const app = express();

// Trust the X-Forwarded-Proto header for correct protocol detection
app.set('trust proxy', 1);

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
    secret: 'YOUR_STRONG_SECRET_KEY',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // Now we can confidently set secure to true in production
        httpOnly: true,
        maxAge: 3600000
    }
}));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Login Route
app.get('/login', (req, res) => {
    const protocol = req.protocol; // This should now correctly reflect HTTPS
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/auth/callback`;

    const authCodeUrlParameters = {
        scopes: ['user.read'],
        redirectUri,
        state: uuidv4()
    };

    pca.getAuthCodeUrl(authCodeUrlParameters)
        .then((response) => {
            req.session.authCodeRequest = { state: authCodeUrlParameters.state };
            res.redirect(response);
        })
        .catch((error) => {
            console.error('Error generating auth code URL:', error);
            res.status(500).send('Authentication error: Could not initiate login.');
        });
});

// Callback Route
app.get('/auth/callback', async (req, res) => {
    const protocol = req.protocol; // This should now correctly reflect HTTPS
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/auth/callback`;

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
        code,
        scopes: ['user.read'],
        redirectUri,
        state
    };

    try {
        const response = await pca.acquireTokenByCode(tokenRequest);
        req.session.user = response.account;
        delete req.session.authCodeRequest;
        res.redirect('/');
    } catch (error) {
        console.error('Error acquiring token:', error);
        res.status(500).send('Authentication error: Could not retrieve user information.');
    }
});

// ... (rest of your code remains the same)

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});