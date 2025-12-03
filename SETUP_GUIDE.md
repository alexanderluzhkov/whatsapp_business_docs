# 🔧 Setup Guide - Nail Booking Calendar

## Step-by-Step Setup Instructions

### 1. Verify Node.js Installation

```bash
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher
```

### 2. Clone and Install

```bash
# If you haven't cloned yet
git clone <your-repo-url>
cd whatsapp_business_docs

# Install dependencies
npm install
```

### 3. Get Your Airtable Credentials

#### Get Personal Access Token:
1. Go to https://airtable.com/create/tokens
2. Click "Create new token"
3. Name it: "Nail Booking Calendar"
4. Add these scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
5. Add access to your base: `app1eyXQCnd2SLVbM`
6. Click "Create token"
7. **Copy the token immediately** (you won't see it again!)

#### Verify Table IDs:
Your table IDs are:
- Clients: `tblQgt4XlHaSeVwcH`
- Procedures: `tblCLhgnNZJHDTmYk`
- Bookings: `tbli6JRtdFLXYsJLw`

### 4. Configure Environment Variables

The `.env.local` file should already exist with your credentials:

```env
AIRTABLE_API_KEY=patPBfdVW7zYzVjYR
AIRTABLE_BASE_ID=app1eyXQCnd2SLVbM
AIRTABLE_CLIENTS_TABLE_ID=tblQgt4XlHaSeVwcH
AIRTABLE_PROCEDURES_TABLE_ID=tblCLhgnNZJHDTmYk
AIRTABLE_BOOKINGS_TABLE_ID=tbli6JRtdFLXYsJLw
```

**⚠️ Important**: Never commit `.env.local` to git! It's already in `.gitignore`.

### 5. Test the Setup

#### Start the development server:
```bash
npm run dev
```

You should see:
```
▲ Next.js 14.2.33
- Local:        http://localhost:3000
✓ Ready in X.Xs
```

#### Test in browser:
1. Open http://localhost:3000
2. You should see "Календарь записей" (Calendar of appointments)

#### Test Airtable connection:
```bash
# In a new terminal window
curl http://localhost:3000/api/test | jq .
```

Expected response:
```json
{
  "success": true,
  "message": "Airtable connection successful",
  "data": {
    "clients": { "count": X, "sample": {...} },
    "procedures": { "count": X, "sample": {...} },
    "bookings": { "count": X, "sample": {...} }
  }
}
```

### 6. Verify Airtable Data

Make sure your Airtable base has:

#### At least one active Procedure:
- Name: e.g., "Маникюр"
- Duration: e.g., 1:00 (1 hour)
- Price: e.g., 150
- **Active: ✓ Checked**

#### At least one Client:
- First Name: e.g., "Анна"
- Last Name: e.g., "Иванова"
- Phone_Number: e.g., "+972-50-123-4567"

## 🐛 Troubleshooting

### Error: "fetch failed"

**Possible causes:**
1. **No internet connection**
   - Check your network connection

2. **Invalid API key**
   ```bash
   # Verify your API key starts with "pat"
   echo $AIRTABLE_API_KEY  # On Mac/Linux
   ```

3. **Wrong base ID or table IDs**
   - Double-check the IDs in your `.env.local`
   - Verify in Airtable: Open your base → Help → API documentation

### Error: "Cannot find module"

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use

```bash
# Kill the process using port 3000
# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Or use a different port:
npm run dev -- -p 3001
```

### TypeScript errors

```bash
# Check for type errors
npm run build

# If errors persist, try:
rm -rf .next
npm run dev
```

## ✅ Verification Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`node_modules` folder exists)
- [ ] `.env.local` file created with all variables
- [ ] Airtable API key is valid (starts with `pat`)
- [ ] Base ID and table IDs are correct
- [ ] Development server starts without errors
- [ ] Can access http://localhost:3000
- [ ] `/api/test` endpoint returns `success: true`
- [ ] Have at least 1 client in Airtable
- [ ] Have at least 1 active procedure in Airtable

## 📱 Testing on iPhone

1. **Connect iPhone to same WiFi as computer**

2. **Find your computer's local IP:**
   ```bash
   # Mac/Linux:
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Windows:
   ipconfig
   ```

3. **Access from iPhone:**
   - Open Safari
   - Go to: `http://[YOUR_IP]:3000`
   - Example: `http://192.168.1.100:3000`

4. **Add to Home Screen:**
   - Tap the Share button
   - Scroll down and tap "Add to Home Screen"
   - Tap "Add"
   - Now you have a PWA icon on your home screen!

## 🚀 Next Steps

Once setup is complete:
1. ✅ Verify the test endpoint works
2. 📅 Implement the calendar view
3. 📝 Create the booking form
4. 🎨 Polish the UI for mobile

## 📞 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review the error messages carefully
3. Verify all environment variables are set correctly
4. Make sure Airtable has the required data

## 🔐 Security Notes

- **Never share your API key**
- **Never commit `.env.local` to git**
- The API key should only have access to this specific base
- Consider using a separate Airtable account for production

---

**Ready to proceed?** Once all checks pass, you're ready to start building the calendar interface! 🎉
