"use client";

import Link from "next/link";
import { BookOpen, FileCheck, SlidersHorizontal, ArrowRight, Sparkles } from "lucide-react";
import CountUp from "@/components/CountUp";

const features = [
  {
    icon: BookOpen,
    title: "Real Questions",
    description:
      "Every question sourced from actual GCSE past papers. No AI-generated content — just the real thing.",
  },
  {
    icon: FileCheck,
    title: "Specimen Quality",
    description:
      "Professional formatting that matches official exam papers. Print-ready, clean, and familiar to students.",
  },
  {
    icon: SlidersHorizontal,
    title: "Topic Control",
    description:
      "Pick exactly which topics to include. Target specific marks. Build the paper your students need.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-24 sm:py-32">
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-mint/5 via-transparent to-mint/10 animate-gradient" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-mint/5 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-mint/20 bg-mint/5 px-4 py-1.5 text-sm text-mint">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              <CountUp end={2767} duration={2500} /> real exam questions
            </span>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Mock<span className="text-mint">Mint</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted sm:text-xl">
            Bespoke GCSE exam papers, built from real past questions.
            <br className="hidden sm:block" />
            Choose your topics. Set your marks. Print and go.
          </p>

          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-xl bg-mint px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-mint/20 transition-all hover:bg-mint-dark hover:shadow-mint/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            Create Your Paper
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-card-border px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold sm:text-3xl">
            Why Mock<span className="text-mint">Mint</span>?
          </h2>

          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-card-border bg-card-bg p-6 transition-all hover:border-mint/30 hover:shadow-lg hover:shadow-mint/5"
              >
                <div className="mb-4 inline-flex rounded-xl bg-mint/10 p-3">
                  <f.icon className="h-6 w-6 text-mint" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-card-border px-4 py-20">
        <div className="mx-auto grid max-w-4xl gap-8 text-center sm:grid-cols-3">
          {[
            { value: 2767, label: "Past Paper Questions", suffix: "" },
            { value: 52, label: "Topics Covered", suffix: "" },
            { value: 100, label: "Free to Use", suffix: "%" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-4xl font-bold text-mint">
                <CountUp end={stat.value} suffix={stat.suffix} />
              </div>
              <div className="mt-1 text-sm text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-card-border px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
            Ready to build a paper?
          </h2>
          <p className="mb-8 text-muted">
            It takes less than a minute. Select your topics, set your target marks, and hit generate.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-xl bg-mint px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-mint/20 transition-all hover:bg-mint-dark hover:shadow-mint/30 hover:-translate-y-0.5"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-card-border px-4 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted">
          © {new Date().getFullYear()} MockMint. Built for GCSE maths teachers.
        </div>
      </footer>
    </div>
  );
}
