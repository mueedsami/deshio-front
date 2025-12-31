'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Users, Calendar, Star, ExternalLink } from 'lucide-react';

import Navigation from '@/components/ecommerce/Navigation';
import Footer from '@/components/ecommerce/Footer';
import { CLIENT_FACEBOOK } from '@/lib/constants';

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Deshio—দেশীয়</h1>
              <p className="text-gray-600 mt-2">
                “এটা কোনো বিজনেস পেজ না, বরং একটা ফ্যামিলি”
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <Heart className="text-red-700" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <div className="border rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <Calendar className="text-red-700" size={18} />
                শুরু
              </div>
              <p className="text-gray-600 mt-2">২০২০ সালের ৯ আগস্ট থেকে যাত্রা শুরু।</p>
            </div>
            <div className="border rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <Users className="text-red-700" size={18} />
                প্রতিষ্ঠাতা
              </div>
              <p className="text-gray-600 mt-2">“জাহীর + ইসরাত” — একজন সিভিল ইঞ্জিনিয়ার ও একজন ল’য়ার।</p>
            </div>
            <div className="border rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <Star className="text-red-700" size={18} />
                রিভিউ
              </div>
              <p className="text-gray-600 mt-2">পাবলিক রিভিউ: ৭১৭ (৯৮% রিকমেন্ডেড)</p>
            </div>
          </div>

          <div className="mt-8 space-y-4 text-gray-800 leading-relaxed">
            <p>
              দেশীয় ফেসবুক ভিত্তিক খুবই জনপ্রিয় একটা অনলাইন প্ল্যাটফর্ম। “বেস্ট প্রাইসে বেস্ট কোয়ালিটি”
              ট্যাগলাইনে দেশীয় প্রোডাক্টের রিকগ্নাইজড ব্র্যান্ডের যে অভাব ছিল—সেখান থেকেই মূলত দেশীয়র যাত্রা।
            </p>
            <p>
              দেশীয় তে রয়েছে মেয়েদের কুর্তি, থ্রি পিছ, ব্লক ড্রেস, জামদানি শাড়ি, মণিপুরী শাড়ি,
              বাটিক শাড়ি ইত্যাদি। এছাড়াও হোম, বেডরুম ও ডাইনিং রুম ডেকোর সামগ্রী পাওয়া যায়।
            </p>
            <p>
              কাস্টমারদের ভরসা আর ভালোবাসায় একের পর এক যোগ হয়েছে <strong>Deshio Doi Ghor</strong>,
              <strong> Deshio Factory</strong> এবং <strong>Bideshio</strong>।
            </p>
            <p>
              শুন্য থেকে শুরু করা এই ইন্সপায়ারিং কাপল এর স্টোরি জানতে আমাদের ফেসবুক পেজ ভিজিট করতে পারেন।
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href={CLIENT_FACEBOOK}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white font-semibold px-5 py-3 rounded-lg"
            >
              Facebook পেজ ভিজিট করুন <ExternalLink size={18} />
            </Link>
            <Link
              href="/e-commerce"
              className="inline-flex items-center justify-center gap-2 border border-red-200 text-red-700 font-semibold px-5 py-3 rounded-lg hover:bg-red-50"
            >
              শপিং শুরু করুন
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
