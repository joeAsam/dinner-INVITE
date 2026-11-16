import { content } from "./content";
import { Faq } from "./_components/Faq";
import { Features } from "./_components/Features";
import { Footer } from "./_components/Footer";
import { Gallery } from "./_components/Gallery";
import { Hero } from "./_components/Hero";
import { Nav } from "./_components/Nav";
import { Stats } from "./_components/Stats";

/** Simple View: the whole invite on one scrolling page (no WebGL), served at /simple. */
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
        <Gallery />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
