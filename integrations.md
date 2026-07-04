
//Google Meet Integration
Go to the Google Cloud Console.
Enable the Google Calendar API for your project.
Configure the OAuth Consent Screen (User type: External or Testing, and add your email to the Test Users list).
Go to Credentials -> Create Credentials -> OAuth client ID (Application type: Web application).
Add the Authorized redirect URI: http://localhost:3000/api/auth/google/callback
Copy the generated Client ID and Client Secret, paste them into your 

.env.local
 file, and save.