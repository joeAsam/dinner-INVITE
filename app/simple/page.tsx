import { content } from "./content";
import { Agent } from "./_components/Agent";
import { Datacenters } from "./_components/Datacenters";
import { Faq } from "./_components/Faq";
import { Features } from "./_components/Features";
import { Footer } from "./_components/Footer";
import { Hero } from "./_components/Hero";
import { Nav } from "./_components/Nav";
import { Stats } from "./_components/Stats";

/** Simple View: the Pxxl homepage rebuild, served at /simple in place of the old day list. */
export default function SimplePage() {
  return (
    <>
      <a href="#main" className="skip">
        {content.brand.skipLink}
      </a>
      <div className="grain" aria-hidden="true" />
      <Nav />
      <main id="main">
        <Hero />
        <Stats />
        <Features />
        <Agent />
        <Datacenters />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
