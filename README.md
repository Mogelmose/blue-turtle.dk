# Blue Turtle Web App

Vibecoded Website for the Turtle Boys. This is a full-stack web application built with Next.js, using Prisma for database management and NextAuth.js for authentication.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Node.js**: This project requires Node.js. You can check if it's installed by running:
    ```bash
    node -v
    ```
    If you don't have it, you can download it from [nodejs.org](https://nodejs.org/).

*   **npm (Node Package Manager)**: npm is distributed with Node.js, so it should be installed as well. You can check the version with:
    ```bash
    npm -v
    ```

## How to Run This Web App Locally

**1. Clone the Repository**  
```bash
git clone https://github.com/Mogelmose/blue-turtle.dk.git
cd blue-turtle.dk/blue-turtle-webapp
```

**2. Set Up Environment Variables**  
Copy the example environment file:  
```bash
cp .env.example .env
cp prisma/template_seed.js prisma/seed.js

Open `.env` and fill in any required values (like database URL, secrets, and user passwords).  
In `seed.js`, you can specify your seed data for the database.

**3. Install Dependencies**  
```bash
npm install
```

**4. Generate the Database**  
Run Prisma migrations to create the database tables:  
```bash
npx prisma migrate dev --name init
```

**5. Seed the Database**  
```bash
npx prisma db seed
```

**6. Start the Development Server**  
```bash
npm run dev
```

The app should now be running at http://localhost:3000
