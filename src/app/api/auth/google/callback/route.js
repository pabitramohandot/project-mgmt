import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains userId passed from route.js

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/settings/profile?error=missing_code_or_state`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/auth/google/callback`;

    // Exchange auth code for access token & refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Error exchanging authorization code:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/settings/profile?error=token_exchange_failed`);
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Fetch user's Google email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const userInfo = await userInfoResponse.json();
    const googleEmail = userInfo.email || '';

    // Update User document in Database
    const expiryDate = new Date(Date.now() + expires_in * 1000);
    const updateData = {
      googleAccessToken: access_token,
      googleTokenExpiry: expiryDate,
      googleCalendarEmail: googleEmail
    };

    // refresh_token is only sent on first consent prompt, make sure to save it if present
    if (refresh_token) {
      updateData.googleRefreshToken = refresh_token;
    }

    await User.findByIdAndUpdate(state, updateData);

    // Redirect to profile settings page with success flag
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/settings/profile?google_connected=true`);
  } catch (error) {
    console.error('Google OAuth Callback Error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/settings/profile?error=callback_internal_error`);
  }
}
