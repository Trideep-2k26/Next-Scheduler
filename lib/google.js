import { google } from 'googleapis'

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  )
}

export function getClientWithRefresh(refreshToken) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  })
  return oauth2Client
}

export async function fetchFreeBusy(refreshToken, timeMin, timeMax) {
  try {
    const oauth2Client = getClientWithRefresh(refreshToken)
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: 'primary' }]
      }
    })
    
    return response.data.calendars?.primary?.busy || []
  } catch (error) {
    console.error('Error fetching free/busy:', error)
    throw error
  }
}

export async function createEventOnCalendar(oauth2Client, calendarId, eventResource) {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const response = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: eventResource
    })
    
    return response.data
  } catch (error) {
    console.error('Error creating event:', error)
    throw error
  }
}

export async function getEvents(oauth2Client, calendarId, timeMin, timeMax) {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    })
    
    return response.data.items || []
  } catch (error) {
    console.error('Error fetching events:', error)
    throw error
  }
}

export async function deleteEventFromCalendar(oauth2Client, calendarId, eventId) {
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const response = await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'all' 
    })
    
    return response.data
  } catch (error) {
    console.error('Error deleting event:', error)
    throw error
  }
}
