# Blue Turtle Web App

Vibecoded Website for the Turtle Boys. This is a full-stack web application built with Next.js, using Prisma for database management and NextAuth.js for authentication.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

**Node.js**: This project requires Node.js. You can check if it's installed by running:

```bash
node -v
```

If you don't have it, you can download it from [nodejs.org](https://nodejs.org/).

**npm (Node Package Manager)**: npm is distributed with Node.js, so it should be installed as
well. You can check the version with:

```bash
npm -v
```

**PostgrSQL**: This project uses a PostgreSQL database. You need to have a PostgreSQL server installed and runnng locally

## How to Run This Web App Locally

### 1. Clone the Repository

```bash
git clone https://github.com/Mogelmose/blue-turtle.dk.git
cd blue-turtle.dk/blue-turtle-webapp
```

### 2. Set Up The local PostgreSQL Database

Before running the application, you need to created a dedicated database and user for it.

#### 2.1 Open the PostgreSQL command-line tool (psql) and run the following commands to create a user and a database. Make sure the password matches what you set in your .env file in the database URL

```bash
-- Create a new user (role) for your application.
CREATE ROLE 'your_db_user' WITH LOGIN PASSWORD 'your_db_password';

-- Create the database.
CREATE DATABASE 'database_name';

-- Grant all privileges on the new database to the user.
GRANT ALL PRIVILEGES ON DATABASE 'database_name TO 'your_db_user';

-- Grant privilege to create databases for migrations.
ALTER USER 'your_db_user' CREATEDB;

-- Grant all rights on the public schema to db_user.
GRANT ALL ON SCHEMA public TO your_db_user;

-- Change owner of the public schema to db_user.
ALTER SCHEMA public OWNER TO your_db_user;
```

### 3. Set Up Environment Variables

Copy the example environment file:  

```bash
cp .env.example .env
cp prisma/template_seed.js prisma/seed.js
```

Open `.env` and fill in any required values (like database URL, nextauth_secret, and user passwords).
you can generate a nextauth secret in multiple ways but here are two:

```bash
npx auth secret
openssl rand -base64 32
```

In `seed.js`, you can specify your seed data for the database.

### 4. Install Dependencies

```bash
npm install
```

### 5. Generate the Database

Run Prisma migrations to create the database tables:  

```bash
npx prisma migrate dev --name init
```

### 6. Seed the Database

```bash
npx prisma db seed
```

### 7. Start the Development Server

```bash
npm run dev
```

The app should now be running at <http://localhost:3000>
