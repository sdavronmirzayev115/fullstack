# Mini Instagram - Full Stack Application

Real Instagram ga o'xshash to'liq funksiyali loyiha. MongoDB, Node.js + Express.js backend va React frontend.

## O'rnatish

### Talablar
- Node.js (v14+)
- MongoDB Atlas

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### .env Fayl

Backend papkasida `.env` fayl yarating:

```
MONGO_URL=mongodb+srv://colepalmer20050101_db_user:asadbek_2011@cluster0.xxhypxl.mongodb.net/mydb?appName=Cluster0
PORT=3001
JWT_SECRET=your_secret_key_here
```

## Funksiyalar

### Asosiy
- ✅ Landing page (Instagram logo, Login/Sign Up)
- ✅ Sign Up (email/telefon +998 ** *** ** ** formatida)
- ✅ Login
- ✅ Profile setup (rasm yuklash, bio 500 ta harf)
- ✅ Profile sahifasi (posts, followers, following)
- ✅ Follow/Unfollow
- ✅ Search users

### Post/Story/Highlights
- ✅ Post yaratish (rasm/video, title, hashtags)
- ✅ Story yaratish (24 soat davomida ko'rinadi)
- ✅ Highlights yaratish
- ✅ Post delete
- ✅ Like post
- ✅ Comment qo'shish

### Messages
- ✅ Real-time messages
- ✅ Conversations list
- ✅ Unread messages count

### Notifications
- ✅ Like notifications
- ✅ Comment notifications
- ✅ Follow notifications
- ✅ Message notifications
- ✅ Real-time updates

### Home Feed
- ✅ Following users postlari
- ✅ Stories (following users)
- ✅ Like/Comment funksiyalari

### Admin Panel
- ✅ Username: `admin.com`
- ✅ Password: `20112011`
- ✅ Barcha foydalanuvchilarni ko'rish
- ✅ Foydalanuvchilarni delete qilish

## MongoDB Models

- User (email, name, username, password, profileImage, bio, posts, followers, following, stories, highlights)
- Post (userId, username, media, title, hashtags, likes, comments)
- Message (senderId, receiverId, text, isRead)
- Notification (userId, type, fromUserId, postId, isRead)

## API Endpoints

### Auth
- POST `/api/auth/signup` - Sign up
- POST `/api/auth/login` - Login
- POST `/api/auth/admin/login` - Admin login

### Profile
- GET `/api/profile/:username` - Get profile
- POST `/api/profile/setup` - Setup profile
- PUT `/api/profile/update` - Update profile
- POST `/api/profile/follow/:username` - Follow/Unfollow
- GET `/api/profile/search/users?q=query` - Search users

### Posts
- POST `/api/posts/create` - Create post
- POST `/api/posts/story` - Create story
- POST `/api/posts/highlight` - Create highlight
- GET `/api/posts/user/:username` - Get user posts
- GET `/api/posts/feed` - Get feed
- GET `/api/posts/stories` - Get stories
- POST `/api/posts/:postId/like` - Like post
- POST `/api/posts/:postId/comment` - Add comment
- DELETE `/api/posts/:postId` - Delete post

### Messages
- GET `/api/messages/conversations` - Get conversations
- GET `/api/messages/:userId` - Get messages
- POST `/api/messages/send` - Send message

### Notifications
- GET `/api/notifications` - Get notifications
- PUT `/api/notifications/read` - Mark as read

### Admin
- GET `/api/admin/users` - Get all users
- DELETE `/api/admin/users/:userId` - Delete user

## UI Features

- Instagram ga o'xshash dizayn
- Responsive
- Real-time updates
- Smooth animations
