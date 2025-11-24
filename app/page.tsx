"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const loggedIn = localStorage.getItem("loggedIn");
    /*if (loggedIn === "true") {
        router.push("/dashboard);
    } else {*/
      router.push("/login");
    //}
  }, [router]);

  return null; // Nothing to render, just redirect
}