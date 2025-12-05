# 🥗 Community Food Sharing Platform (Server)

The backend API service for the Community Food Sharing Platform. It handles data persistence, authentication tokens, and business logic for food management.

## 🔗 Live Links
- **API URL:** https://food-sharing-app-puce.vercel.app/
- **Client Repo:** https://github.com/MahinAnowar/food-sharing-app-client

## 🚀 Key Features
- **JWT Authentication:** Generates HttpOnly cookies for secure session management.
- **Token Verification:** Middleware (`verifyToken`) to protect private routes.
- **Secure Cookies:** Configured for cross-site access (SameSite: None, Secure: True) to work with Vercel.
- **CRUD Operations:**
  - Create, Read, Update, Delete functionality for Food items.
  - Specialized endpoints for searching and sorting.
- **Request System:** Logic to handle food requests and status updates.

## 🛠️ Technology Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Native Driver)
- **Security:** JSON Web Token (JWT), CORS, Cookie Parser, Dotenv.

## 📂 API Endpoints

### Auth
- `POST /jwt`: Create a JWT token and set it in browser cookies.
- `POST /logout`: Clear the authentication cookie.

### Foods
- `GET /all-foods`: Fetch all available foods (Supports `?search=` and `?sort=asc`).
- `GET /featured-foods`: Get top 6 foods sorted by quantity.
- `GET /food/:id`: Get details of a single food item.
- `POST /add-food`: Add a new food item (Private).
- `GET /manage-foods/:email`: Get foods posted by a specific user (Private).
- `PUT /food/:id`: Update food details (Private).
- `DELETE /food/:id`: Remove a food item (Private).

### Requests
- `POST /request-food`: Create a food request (Private).
- `GET /my-requests/:email`: Get requests made by a logged-in user (Private).

## ⚙️ Environment Variables
To run this project locally, create a `.env` file in the root:
```env
DB_USER=your_mongo_username
DB_PASS=your_mongo_password
ACCESS_TOKEN_SECRET=your_jwt_secret_string
NODE_ENV=development
