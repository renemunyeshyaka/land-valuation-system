// This file exports TypeScript interfaces and types used throughout the application.

export interface Property {
    id: string;
    location: string;
    price: number;
    size: number; // in square meters
    type: 'residential' | 'commercial' | 'agricultural';
    status: 'active' | 'inactive';
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'buyer' | 'seller' | 'admin';
}

export interface Valuation {
    propertyId: string;
    estimatedValue: number;
    date: Date;
    method: 'market' | 'cost' | 'income';
}

export type Zone = 'urban' | 'rural' | 'agricultural' | 'marshland';