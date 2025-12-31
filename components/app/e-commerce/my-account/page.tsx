'use client';
import Navigation from '@/components/ecommerce/Navigation';
import AccountSidebar from '@/components/ecommerce/my-account/AccountSidebar';

export default function MyAccount(){
    return (
        <div className="bg-white min-h-screen">
            {/* Navigation Bar */}
            <Navigation />
            <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Account Sidebar */}
                <AccountSidebar />
                {/* Main Content Area */}
                <div className="flex-1 ml-8">
                    <h1 className="text-2xl font-bold mb-4">My Account</h1>
                    <p>Welcome to your account dashboard. Here you can manage your orders, addresses, and account details.</p>
                </div>
            </div>
        </div>
    );
}