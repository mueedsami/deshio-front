// app/e-commerce/contact/page.tsx
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import Navigation from '@/components/ecommerce/Navigation';
import Footer from '@/components/ecommerce/Footer';

const stores = [
  {
    name: 'Dhaka Flagship Store',
    tag: 'Most popular',
    addressLine1: 'Level 3, Shop 12',
    addressLine2: 'Example Mall, Dhanmondi',
    city: 'Dhaka 1209, Bangladesh',
    phone: '+8801XXXXXXXXX',
    hours: 'Sat – Thu, 11:00 AM – 9:00 PM',
    notes: 'Full collection, trial rooms, instant pickup.',
  },
  {
    name: 'Uttara Studio Store',
    tag: 'Curated',
    addressLine1: 'House 00, Road 00',
    addressLine2: 'Sector 7, Uttara',
    city: 'Dhaka 1230, Bangladesh',
    phone: '+8801XXXXXXXXX',
    hours: 'Sat – Thu, 12:00 PM – 8:00 PM',
    notes: 'Limited drops, photoshoot-friendly space.',
  },
  {
    name: 'Chattogram Collection Point',
    tag: 'Pickup',
    addressLine1: 'Shop 04, Ground Floor',
    addressLine2: 'Example Plaza, GEC Circle',
    city: 'Chattogram, Bangladesh',
    phone: '+8801XXXXXXXXX',
    hours: 'Sat – Thu, 12:00 PM – 8:00 PM',
    notes: 'Online order pickups & size exchanges.',
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
            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mb-4">
                Talk to us—online or in store.
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Whether you&apos;re tracking an order, checking a size, or planning a visit,
                we&apos;re here to help. Reach us through our support channels or drop by
                one of our stores.
              </p>
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 grid gap-10 lg:grid-cols-[1.6fr,1.3fr]">
          {/* Left: Form + Online support */}
          <div className="space-y-6">
            {/* Online Support Card */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Online support
              </h2>
              <p className="text-xs sm:text-sm text-gray-700 mb-4">
                The quickest way to reach us is through email or social channels. Share your
                order number, size query, or issue, and we&apos;ll get back during support hours.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 mt-0.5 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-gray-700 text-xs sm:text-sm">support@deshio.com</p>
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
            </div>

            {/* Contact Form */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">
                Send us a message
              </h2>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  // TODO: connect to backend endpoint (e.g. /contact-messages)
                  alert('Thank you for reaching out. We will get back to you soon.');
                }}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Phone (optional)
                    </label>
                    <input
                      type="tel"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Order Number (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="#DESHIO1234"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 resize-none"
                    placeholder="Share your question, feedback, or issue in a few lines."
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                >
                  Send message
                </button>

                <p className="text-[11px] text-gray-500 mt-2">
                  By submitting this form, you agree that we may contact you regarding your
                  query. We never share your details with third parties for marketing.
                </p>
              </form>
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
                        <p className="inline-flex items-center mt-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                          {store.tag}
                        </p>
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
                        <p className="font-medium text-gray-900">Hours</p>
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
              Store timings may change on public holidays and special campaign days.
              For urgent queries, please contact support before visiting.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
