// app/e-commerce/about/page.tsx
import { CLIENT_NAME } from '@/lib/constants';
import Navigation from '@/components/ecommerce/Navigation';
import Footer from '@/components/ecommerce/Footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navigation />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <p className="text-xs font-semibold tracking-[0.25em] text-red-600 uppercase mb-3">
              About {CLIENT_NAME}
            </p>
            <div className="grid gap-10 lg:grid-cols-[1.7fr,1.3fr] items-start">
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 mb-4">
                  “এটা কোনো বিজনেস পেজ না,
                  <span className="block">বরং একটা ফ্যামিলি”</span>
                </h1>
                <p className="text-gray-600 text-sm sm:text-base max-w-xl">
                  {CLIENT_NAME} (দেশীয়) একটি জনপ্রিয় Facebook-ভিত্তিক অনলাইন প্ল্যাটফর্ম—যেখানে
                  <span className="font-medium"> বেস্ট প্রাইসে বেস্ট কোয়ালিটি</span> দিয়ে কুর্তি, থ্রি-পিস,
                  ব্লক ড্রেস, জামদানি/মণিপুরী/বাটিক শাড়ি এবং হোম ডেকোর—সবই এক জায়গায় পাওয়া যায়।
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  At a glance
                </h2>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500 text-xs uppercase tracking-wide">Founded</dt>
                    <dd className="text-gray-900 font-medium mt-1">9 Aug 2020</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs uppercase tracking-wide">Tagline</dt>
                    <dd className="text-gray-900 font-medium mt-1">Best price, best quality</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs uppercase tracking-wide">Community</dt>
                    <dd className="text-gray-900 font-medium mt-1">Family-first shoppers</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs uppercase tracking-wide">Service</dt>
                    <dd className="text-gray-900 font-medium mt-1">Nationwide delivery & support</dd>
                  </div>
                </dl>
                <p className="text-xs text-gray-500 leading-relaxed">
                  We focus on trusted sourcing, consistent quality, and friendly support—so the experience
                  feels like shopping with family.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Story + Philosophy */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="grid gap-12 lg:grid-cols-[1.7fr,1.3fr]">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">
                Our story
              </h2>
              <p className="text-gray-700 text-sm sm:text-base mb-4">
                {CLIENT_NAME} শুরু হয় ২০২০ সালের ৯ আগস্ট—দেশীয় প্রোডাক্টের রিকগ্নাইজড ব্র্যান্ডের অভাব থেকে।
                জাহীর + ইসরাত (একজন প্রফেশনাল সিভিল ইঞ্জিনিয়ার ও অন্যজন লয়ার) প্রোফেশন চেঞ্জ করে
                নিজেদের স্বপ্নের বিজনেস শুরু করেন।
              </p>
              <p className="text-gray-700 text-sm sm:text-base mb-4">
                আজ দেশীয় শুধুই একটি শপ নয়—এটা একটা কমিউনিটি। কাস্টমারদের ভরসা আর ভালোবাসায় একের পর এক
                যোগ হয়েছে Deshio Doi Ghor, Deshio Factory এবং Bideshio।
              </p>
              <p className="text-gray-700 text-sm sm:text-base">
                পুরো স্টোরি জানতে আমাদের <span className="font-medium">Our Story</span> পেজটি দেখুন।
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 sm:p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  What we stand for
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Comfort that suits everyday life in Bangladesh</li>
                  <li>• Transparent communication on stock, delivery, and returns</li>
                  <li>• Consistent sizing across collections</li>
                  <li>• Details that feel premium, without the unnecessary markups</li>
                </ul>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Designed for real wardrobes
                </h3>
                <p className="text-xs sm:text-sm text-gray-700">
                  We design for students, professionals, and everyone in between—people who
                  need outfits that can move from campus to café, office to outing, and
                  weekdays to weekends with minimal effort.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-gray-50 border-y">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                  A few things we don&apos;t compromise on
                </h2>
                <p className="text-sm text-gray-600 max-w-xl">
                  Every decision—from fabric weight to packaging—is made to keep the experience
                  simple, reliable, and quietly premium.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-500 mb-2">
                  01
                </p>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Thoughtful materials
                </h3>
                <p className="text-xs sm:text-sm text-gray-700">
                  Fabrics chosen for breathability, softness, and structure—suited to local
                  weather and daily use.
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-500 mb-2">
                  02
                </p>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Honest quality
                </h3>
                <p className="text-xs sm:text-sm text-gray-700">
                  What you see online is what we aim to deliver—no over-edited photos,
                  no unrealistic expectations.
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-500 mb-2">
                  03
                </p>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Service that listens
                </h3>
                <p className="text-xs sm:text-sm text-gray-700">
                  From size questions to order issues, our support team focuses on quick,
                  clear, and fair resolutions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
