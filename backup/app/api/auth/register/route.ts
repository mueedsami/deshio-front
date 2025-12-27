import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const CUSTOMERS_FILE = path.join(process.cwd(), 'data', 'customers.json');

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read customers from file
function readCustomers() {
  ensureDataDirectory();
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

// Write customers to file
function writeCustomers(customers) {
  ensureDataDirectory();
  try {
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing customers file:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    const { email, username, password } = await request.json();

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Read existing customers
    const customers = readCustomers();

    // Check if email already exists
    if (customers.find(customer => customer.email === email)) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 409 }
      );
    }

    // Check if username already exists
    if (customers.find(customer => customer.username === username)) {
      return NextResponse.json(
        { message: 'Username already taken' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new customer
    const newCustomer = {
      id: Date.now().toString(),
      email,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to customers array
    customers.push(newCustomer);

    // Save to file
    if (!writeCustomers(customers)) {
      return NextResponse.json(
        { message: 'Failed to save customer data' },
        { status: 500 }
      );
    }

    // Return success (without password)
    const { password: _, ...customerWithoutPassword } = newCustomer;
    return NextResponse.json(
      { 
        message: 'Registration successful',
        customer: customerWithoutPassword 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}