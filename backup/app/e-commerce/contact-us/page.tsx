// app/e-commerce/contact/page.tsx
import {CLIENT_NAME} from '@/lib/constants';
import { CLIENT_EMAIL } from '@/lib/constants';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import Navigation from '@/components/ecommerce/Navigation';
import Footer from '@/components/ecommerce/Footer';

const stores = [
  {
    name: 'Dhaka Flagship Store',
    tag: 'Most visited',
    addressLine1: 'Level 3, Shop 12',
    addressLine2: 'Example Mall, Dhanmondi',
    city: 'Dhaka 1209, Bangladesh',
    phone: '+8801XXXXXXXXX',
    hours: 'Sat – Thu, 11:00 AM – 9:00 PM',
    notes: 'Full collection, trial rooms, instant pickups and exchanges.',
  },
  {
    name: 'Uttara Studio Store',
    tag: 'Curated edits',
    addressLine1: 'House 00, Road 00',
    addressLine2: 'Sector 7, Uttara',
    city: 'Dhaka 1230, Bangladesh',
    phone: '+8801XXXXXXXXX',
    hours: 'Sat – Thu, 12:00 PM – 8:00 PM',
    notes: 'Limited drops, styling help, content-friendly space.',
  },
  {
    name: 'Chattogram Collection Point',
    tag: 'Pickup only',
    addressLine1: 'Shop 04, Ground Floor',
    addressLine2: 'Example Plaza, GEC Circle',
    city: 'Chattogram, Bangladesh',
    phone: '+8801XXXXXXXXX',
    hours: 'Sat – Thu, 12:00 PM – 8:00 PM',
    notes: 'Online order pickups and size exchanges only.',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navigation />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <p className="text-xs font-semibold tracking-[0.25em] text-red-600 uppercase mb-3">
              Contact
            </p>
            <div className="max-w-3xl space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
                Talk to us—online or in store.
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                For order updates, size questions, or general support, reach out through our
                official channels or visit one of our locations. Our team is here to make
                your {CLIENT_NAME} experience simple and stress-free.
              </p>
            </div>
          </div>
        </section>

        {/* Main layout */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 grid gap-10 lg:grid-cols-[1.5fr,1.4fr]">
          {/* Left: static support info */}
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Online support
              </h2>
              <p className="text-xs sm:text-sm text-gray-700 mb-4">
                The fastest way to reach us is through email or social channels. Share your
                order number, question, or concern, and our support team will respond within
                working hours.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 mt-0.5 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-gray-700 text-xs sm:text-sm">
                      {CLIENT_EMAIL}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-0.5 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">Customer care</p>
                    <p className="text-gray-700 text-xs sm:text-sm">
                      +8801XXXXXXXXX
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 mt-0.5 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">Support hours</p>
                    <p className="text-gray-700 text-xs sm:text-sm">
                      Sat – Thu, 10:00 AM – 8:00 PM
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 mt-4">
                Messages sent outside support hours will be answered on the next working day.
                During campaign periods, replies may take slightly longer—but we always aim
                to get back as quickly as possible.
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Before you contact us
              </h2>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
                <li>• For order issues, keep your order number ready (e.g. #DESHIO1234).</li>
                <li>• For sizing help, mention your usual size and any previous Deshio purchases.</li>
                <li>• For delivery updates, check your SMS / email tracking link first.</li>
              </ul>
            </div>
          </div>

          {/* Right: Store cards */}
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-gray-900">
              Visit our stores
            </h2>

            <div className="space-y-4">
              {stores.map((store) => (
                <div
                  key={store.name}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {store.name}
                      </h3>
                      {store.tag && (
                        <span className="mt-1 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                          {store.tag}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm text-gray-700">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 mt-0.5 text-red-600" />
                      <div>
                        <p>{store.addressLine1}</p>
                        <p>{store.addressLine2}</p>
                        <p>{store.city}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 mt-0.5 text-red-600" />
                      <div>
                        <p className="font-medium text-gray-900">Phone</p>
                        <p>{store.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 mt-0.5 text-red-600" />
                      <div>
                        <p className="font-medium text-gray-900">Store hours</p>
                        <p>{store.hours}</p>
                      </div>
                    </div>

                    {store.notes && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        {store.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-500">
              Store timings may change on public holidays and special launches. For
              time-sensitive visits, please call the store number before coming.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
