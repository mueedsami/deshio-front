// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const CUSTOMERS_FILE = path.join(process.cwd(), 'data', 'customers.json');

// Read customers from file
function readCustomers() {
  try {
    if (fs.existsSync(CUSTOMERS_FILE)) {
      const data = fs.readFileSync(CUSTOMERS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading customers file:', error);
    return [];
  }
}

export async function POST(request) {
  try {
    const { email, password, rememberMe } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Read customers
    const customers = readCustomers();

    // Find customer by email
    const customer = customers.find(c => c.email === email);

    if (!customer) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, customer.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = customer;

    return NextResponse.json(
      {
        message: 'Login successful',
        user: userWithoutPassword,
        rememberMe
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}