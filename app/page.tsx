import { Experience } from "@/components/atlas/Experience";
import "./atlas.css";

export default function Page() {
  return (
    <>
      {/* The same typefaces as the simple view. Satoshi and Cabinet Grotesk come from Fontshare,
          one request per family; React hoists these into <head>. */}
      <link rel="stylesheet" precedence="default" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" />
      <link rel="stylesheet" precedence="default" href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700&display=swap" />
      <Experience />
    </>
  );
}
