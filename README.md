# Simple Booking Application

A minimal, clean booking application that allows users to schedule calls by selecting a date and time. Perfect for email-based booking links. Follows FastAPI conventions for API integration. New change

## Features

- **Date Selection**: Interactive calendar picker with month navigation
- **Time Selection**: 15-minute time slots available 24/7
- **User Information**: Simple form to collect name and email
- **UTC Conversion**: Automatically converts local time to ISO 8601 with timezone
- **API Integration**: Ready for FastAPI backend integration
- **Error Handling**: Comprehensive error handling and user feedback
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file in the root directory:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in the terminal).

### Build

```bash
npm run build
```

## Usage

### URL Parameters

The booking page accepts the following URL parameters:

- `candidate_id` (required): The candidate ID for the booking
- `client_id` (required): The client ID for the booking
- `duration_minutes` (optional): Duration of the call in minutes (default: 30)

Example URL:
```
http://localhost:5173/?candidate_id=123&client_id=5&duration_minutes=45
```

### User Flow

1. Users arrive at the booking page (via email link with URL parameters)
2. Select a date from the calendar (past dates are disabled)
3. Choose a time slot from the available options (15-minute increments, 24/7)
4. Enter name and email
5. Confirm the booking
6. View confirmation screen with booking details

## API Integration

### Authentication

The application uses Bearer token authentication. Set the token in localStorage:

```javascript
localStorage.setItem('auth_token', 'your-token-here');
```

Tokens can be obtained from `/auth/login` endpoint.

### API Endpoints

The application integrates with the following FastAPI endpoints:

- `POST /core/candidate-bookings` - Create a new booking
- `GET /core/candidate-bookings/{id}` - Get a single booking
- `GET /core/candidate-bookings` - List bookings (with filters)
- `PUT /core/candidate-bookings/{id}` - Update a booking
- `DELETE /core/candidate-bookings/{id}` - Delete a booking

### Request Format

When creating a booking, the app sends:

```json
{
  "candidate_id": 123,
  "client_id": 5,
  "scheduled_at": "2024-01-15T14:30:00-05:00",
  "duration_minutes": 30,
  "timezone": "America/New_York"
}
```

### Response Format

The API returns booking objects in this format:

```json
{
  "id": 1,
  "candidate_id": 123,
  "client_id": 5,
  "scheduled_at": "2024-01-15T14:30:00+00:00",
  "duration_minutes": 30,
  "status": "scheduled",
  "meeting_link": "https://zoom.us/j/...",
  "timezone": "America/New_York",
  "created_at": "2024-01-10T10:00:00+00:00",
  "updated_at": "2024-01-10T10:00:00+00:00"
}
```

### Status Values

Supported status values (lowercase, underscore-separated):
- `scheduled` (default)
- `confirmed`
- `completed`
- `cancelled`
- `rescheduled`
- `no_show`

## Project Structure

```
src/
  components/
    BookingPage.jsx      # Main booking page component
    DatePicker.jsx       # Calendar date picker
    TimeSlotSelector.jsx # Time slot selection
    *.css                # Component styles
  utils/
    api.js               # API utility functions
    dateUtils.js         # Date/time conversion utilities
  App.jsx                # Root component
  main.jsx               # Entry point
```

## Timezone Handling

- **Display**: All times are displayed in the user's local timezone
- **API Communication**: Times are sent as ISO 8601 strings with timezone offset (e.g., `"2024-01-15T14:30:00-05:00"`)
- **Backend**: The API stores times in UTC with timezone information
- **Conversion**: The UI automatically converts between local time and UTC

## Error Handling

The application handles API errors gracefully:
- Displays error messages to users
- Handles authentication errors
- Validates required URL parameters
- Shows loading states during API calls

## Customization

- **Time Slots**: Modify the `generateTimeSlots` function in `TimeSlotSelector.jsx` to change available times
- **Styling**: Update CSS files to match your brand colors
- **API Base URL**: Set `VITE_API_BASE_URL` in `.env` file
- **Duration**: Pass `duration_minutes` in URL parameters

## Development Notes

### Date/Time Format

- Uses ISO 8601 format: `"2024-01-15T14:30:00-05:00"` or `"2024-01-15T14:30:00Z"`
- Automatically includes timezone offset when sending to API
- Parses ISO 8601 strings from API responses

### API Utilities

The `src/utils/api.js` file provides:
- `createBooking()` - Create a new booking
- `getBooking()` - Get a single booking
- `listBookings()` - List bookings with filters
- `updateBooking()` - Update a booking
- `cancelBooking()` - Cancel a booking
- `deleteBooking()` - Delete a booking
- `getAuthToken()` / `setAuthToken()` - Token management

### Date Utilities

The `src/utils/dateUtils.js` file provides:
- `convertToISO8601()` - Convert local date/time to ISO 8601 with timezone
- `parseISO8601()` - Parse ISO 8601 string to Date object
- `formatISO8601ForDisplay()` - Format API datetime for display
- `getUserTimezone()` - Get user's IANA timezone
- `toISODateString()` - Convert date to ISO date string (no time)

## Next Steps

To make this production-ready, consider:
- Adding booking availability checks
- Implementing calendar sync (Google Calendar, Outlook)
- Adding email notifications
- Implementing booking cancellation/rescheduling
- Adding user authentication flow
- Database integration (handled by backend)
