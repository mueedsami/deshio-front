"use client"

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-red-50 via-white to-blue-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 rounded-full">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              <span className="text-red-700 font-semibold text-sm tracking-wide">New Collection 2025</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight text-balance">
                Timeless Elegance 
              </h1>
              <p className="text-base text-gray-600 leading-relaxed max-w-lg">
                Handcrafted sarees from Bangladesh's finest artisans. Experience the perfect blend of tradition and
                contemporary design.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button className="group px-6 py-3 bg-red-700 text-white font-semibold rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2">
                Shop Collection
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300 border-2 border-gray-200 hover:border-gray-300">
                View Lookbook
              </button>
            </div>
          </div>

          {/* Right Content - Image */}
          <div className="relative">
            <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-gray-200/50">
              <img
                src="/e-commerce-hero.jpg"
                alt="Featured Collection"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>

            <div className="absolute -bottom-4 -right-4 bg-white p-4 rounded-2xl shadow-2xl ring-1 ring-gray-200/50 backdrop-blur-sm">
              <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">Starting from</p>
              <p className="text-2xl font-bold text-gray-900">৳4,999</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-32 left-0 w-72 h-72 bg-red-200 rounded-full opacity-10 blur-3xl -z-10"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200 rounded-full opacity-10 blur-3xl -z-10"></div>
    </section>
  )
}
