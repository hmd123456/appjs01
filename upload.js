require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');
const helmet = require('helmet');
const morgan = require('morgan');
const { logFileUpload } = require('./logFileUpload'); // Import the logFileUpload function

const app = express();

// Middleware for security and logging
app.use(helmet()); // Adds security headers
app.use(morgan('combined')); // Logs HTTP requests

// Multer configuration for file uploads
const upload = multer({ dest: 'uploads/' }); // Temporary folder for uploaded files

// Environment variables for sensitive data
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.CONTAINER_NAME;

if (!AZURE_STORAGE_CONNECTION_STRING || !CONTAINER_NAME) {
    throw new Error('Azure Storage connection string or container name is not defined in environment variables.');
}

// Function to upload a file to Azure Blob Storage
async function uploadFileToBlobStorage(filePath, sectionName) {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

        // Ensure the container exists
        await containerClient.createIfNotExists();

        const fileName = path.basename(filePath);
        const blobName = `${sectionName}/${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        console.log(`Uploading file "${fileName}" to section "${sectionName}"...`);

        // Upload the file
        const fileStream = fs.createReadStream(filePath);
        await blockBlobClient.uploadStream(fileStream, fileStream.bytesRead, 5);

        console.log(`File "${fileName}" uploaded successfully to section "${sectionName}".`);

        // Log the upload activity to the database
        await logFileUpload(sectionName, fileName);

        // Clean up the temporary file
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error(`Error uploading file "${filePath}" to section "${sectionName}":`, error.message);
        throw error; // Re-throw the error to handle it in the calling function
    }
}

// Route to handle file uploads
app.post(
    '/upload',
    upload.fields([
        { name: 'section1' },
        { name: 'section2' },
        { name: 'section3' },
        { name: 'section4' },
        { name: 'section5' },
    ]),
    async (req, res) => {
        try {
            const files = req.files;

            if (!files || Object.keys(files).length === 0) {
                return res.status(400).json({ message: 'No files were uploaded.' });
            }

            for (const section in files) {
                const file = files[section][0]; // Get the first file for the section
                await uploadFileToBlobStorage(file.path, section);
            }

            res.json({ message: 'Files uploaded successfully!' });
        } catch (error) {
            console.error('Error uploading files:', error);
            res.status(500).json({ message: 'Error uploading files' });
        }
    }
);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'An unexpected error occurred.' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});