const express = require('express');
const path = require('path');
const multer = require('multer');
const { PublicClientApplication } = require('@azure/msal-node'); // MSAL for Entra authentication

const upload = multer(); // Multer middleware for file upload
const app = express();

// MSAL configuration
const msalConfig = {
    auth: {
        clientId: '3bcc88e2-9967-4de9-b428-b6ab48db19ae', // Replace with your Azure AD App's Client ID
        authority: 'https://login.microsoftonline.com/5558459a-5e38-45de-8742-ec475127560c', // Replace with your Tenant ID
        clientSecret: '2a051337-3580-4f04-be0b-5b58d9d0dc73' // Replace with your Azure AD App's Client Secret
    }
};

const pca = new PublicClientApplication(msalConfig);

// Middleware to serve static files (CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the HTML content
app.get('/', async (req, res) => {
    // Simulate fetching the logged-in user's name
    const userName = req.query.name || 'Guest'; // Replace this with actual user info from MSAL

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
            <!-- Top navigation bar -->
            <div class="top-nav">
                <h1>Azure File Upload</h1>
                <ul>
                    <li><a href="#">Home</a></li>
                    <li><a href="#">About</a></li>
                    <li><a href="#">Contact</a></li>
                </ul>
            </div>

            <!-- Left sidebar menu -->
            <div class="sidebar">
                <ul>
                    <li><a href="#">Dashboard</a></li>
                    <li><a href="#">Upload Files</a></li>
                    <li><a href="#">Settings</a></li>
                    <li><a href="#">Help</a></li>
                </ul>
            </div>

            <!-- Main content area -->
            <div class="main-content">
                <div class="form-container">
                    <h1>Welcome, ${userName}!</h1>
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

// Endpoint to handle file uploads


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});